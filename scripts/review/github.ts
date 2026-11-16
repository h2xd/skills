/** The `gh` calls behind the review subcommands. Everything here touches the network. */

import { writeFileSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { LinkedIssue, PullRequest } from "./context.ts"
import type { Review, ReviewThread } from "./threads.ts"
import { run } from "./shell.ts"

const PULL_REQUEST_FIELDS =
  "number,title,body,author,url,baseRefName,headRefName,headRefOid,closingIssuesReferences,mergeable,mergeStateStatus"

const PAGE_INFO = "pageInfo { hasNextPage endCursor }"

const REVIEW_DATA_QUERY = `
query($owner: String!, $name: String!, $number: Int!, $after: String) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      reviewThreads(first: 100, after: $after) {
        ${PAGE_INFO}
        nodes {
          id isResolved isOutdated diffSide path line startLine startDiffSide originalLine
          comments(first: 100) {
            ${PAGE_INFO}
            nodes { author { login } body url createdAt }
          }
        }
      }
      reviews(first: 50) { nodes { author { login } state body url submittedAt } }
      comments(last: 100) { nodes { body } }
    }
  }
}`

const THREAD_COMMENTS_QUERY = `
query($threadId: ID!, $after: String) {
  node(id: $threadId) {
    ... on PullRequestReviewThread {
      comments(first: 100, after: $after) {
        ${PAGE_INFO}
        nodes { author { login } body url createdAt }
      }
    }
  }
}`

const REPLY_MUTATION = `
mutation($threadId: ID!, $body: String!) {
  addPullRequestReviewThreadReply(input: {pullRequestReviewThreadId: $threadId, body: $body}) {
    comment { url }
  }
}`

const RESOLVE_MUTATION = `
mutation($threadId: ID!) {
  resolveReviewThread(input: {threadId: $threadId}) {
    thread { isResolved }
  }
}`

/** With no number, `gh` picks the pull request of the current branch. */
export function viewPullRequest(
  pullRequest: string | undefined,
  cwd?: string,
): PullRequest {
  const number = pullRequest ? [pullRequest] : []
  const json = run(
    ["gh", "pr", "view", ...number, "--json", PULL_REQUEST_FIELDS],
    cwd,
  )
  return JSON.parse(json) as PullRequest
}

const DIFF_MAX_BUFFER = 256 * 1024 * 1024

export function pullRequestDiff(number: number, cwd?: string): string {
  return run(["gh", "pr", "diff", String(number)], cwd, DIFF_MAX_BUFFER)
}

export function repositoryName(cwd?: string): { owner: string; name: string } {
  const json = run(["gh", "repo", "view", "--json", "owner,name"], cwd)
  const parsed = JSON.parse(json) as { owner: { login: string }; name: string }
  return { owner: parsed.owner.login, name: parsed.name }
}

export function authenticatedLogin(cwd?: string): string {
  return run(["gh", "api", "user", "--jq", ".login"], cwd)
}

export function viewIssue(number: number, cwd?: string): LinkedIssue {
  const json = run(
    ["gh", "issue", "view", String(number), "--json", "title,body"],
    cwd,
  )
  return { number, ...(JSON.parse(json) as { title: string; body: string }) }
}

type PageInfo = { hasNextPage: boolean; endCursor: string | null }
type ThreadComments = ReviewThread["comments"]
type ReceivedThread = Omit<ReviewThread, "comments"> & {
  comments: ThreadComments & { pageInfo?: PageInfo }
}

function graphql(query: string, variables: string[], cwd?: string): unknown {
  return JSON.parse(
    run(
      ["gh", "api", "graphql", ...variables, "-f", `query=${query}`],
      cwd,
    ),
  )
}

function afterCursor(cursor: string | null): string[] {
  return cursor === null ? [] : ["-f", `after=${cursor}`]
}

function moreComments(thread: ReceivedThread, cwd?: string): ThreadComments {
  const nodes = [...thread.comments.nodes]
  let page = thread.comments.pageInfo
  while (page?.hasNextPage) {
    const next = (
      graphql(
        THREAD_COMMENTS_QUERY,
        ["-F", `threadId=${thread.id}`, ...afterCursor(page.endCursor)],
        cwd,
      ) as {
        data: { node: { comments: ThreadComments & { pageInfo: PageInfo } } }
      }
    ).data.node.comments
    nodes.push(...next.nodes)
    page = next.pageInfo
  }
  return { nodes }
}

export function fetchReviewData(
  owner: string,
  name: string,
  number: number,
  cwd?: string,
): { threads: ReviewThread[]; reviews: Review[]; comments: string[] } {
  type Data = {
    data: {
      repository: {
        pullRequest: {
          reviewThreads: { pageInfo: PageInfo; nodes: ReceivedThread[] }
          reviews: { nodes: Review[] }
          comments: { nodes: { body: string }[] }
        }
      }
    }
  }
  const fetchPage = (cursor: string | null) =>
    graphql(
      REVIEW_DATA_QUERY,
      [
        "-f",
        `owner=${owner}`,
        "-f",
        `name=${name}`,
        "-F",
        `number=${number}`,
        ...afterCursor(cursor),
      ],
      cwd,
    ) as Data
  const first = fetchPage(null).data.repository.pullRequest
  const received = [...first.reviewThreads.nodes]
  let page = first.reviewThreads.pageInfo
  while (page.hasNextPage) {
    const next = fetchPage(page.endCursor).data.repository.pullRequest
    received.push(...next.reviewThreads.nodes)
    page = next.reviewThreads.pageInfo
  }
  return {
    threads: received.map((thread) => ({
      ...thread,
      comments: moreComments(thread, cwd),
    })),
    reviews: first.reviews.nodes,
    comments: first.comments.nodes.map((comment) => comment.body),
  }
}

/** gh reads `-F body=@file` from disk, which keeps quotes and newlines intact. */
function withBodyFile<T>(body: string, use: (bodyFile: string) => T): T {
  const directory = mkdtempSync(join(tmpdir(), "review-"))
  const bodyFile = join(directory, "body.md")
  writeFileSync(bodyFile, body)
  try {
    return use(bodyFile)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

export function replyToThread(threadId: string, body: string): string {
  return withBodyFile(body, (bodyFile) =>
    run([
      "gh",
      "api",
      "graphql",
      "-F",
      `threadId=${threadId}`,
      "-F",
      `body=@${bodyFile}`,
      "-f",
      `query=${REPLY_MUTATION}`,
      "--jq",
      ".data.addPullRequestReviewThreadReply.comment.url",
    ]),
  )
}

export function commentOnPullRequest(
  pullRequest: string,
  body: string,
): string {
  return withBodyFile(body, (bodyFile) =>
    run(["gh", "pr", "comment", pullRequest, "--body-file", bodyFile]),
  )
}

export function resolveThread(threadId: string): void {
  run([
    "gh",
    "api",
    "graphql",
    "-F",
    `threadId=${threadId}`,
    "-f",
    `query=${RESOLVE_MUTATION}`,
  ])
}
