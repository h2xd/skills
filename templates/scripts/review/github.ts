/** The `gh` calls behind the review subcommands. Everything here touches the network. */

import { writeFileSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { LinkedIssue, PullRequest } from "./context.ts"
import type { Review, ReviewThread } from "./threads.ts"
import { run } from "./shell.ts"

const PULL_REQUEST_FIELDS =
  "number,title,body,author,url,baseRefName,headRefName,headRefOid,closingIssuesReferences"

const REVIEW_DATA_QUERY = `
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      reviewThreads(first: 100) {
        nodes {
          id isResolved isOutdated path line startLine originalLine
          comments(first: 50) { nodes { author { login } body url createdAt } }
        }
      }
      reviews(first: 50) { nodes { author { login } state body url submittedAt } }
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

export function fetchReviewData(
  owner: string,
  name: string,
  number: number,
  cwd?: string,
): { threads: ReviewThread[]; reviews: Review[] } {
  const json = run(
    [
      "gh",
      "api",
      "graphql",
      "-f",
      `owner=${owner}`,
      "-f",
      `name=${name}`,
      "-F",
      `number=${number}`,
      "-f",
      `query=${REVIEW_DATA_QUERY}`,
    ],
    cwd,
  )
  const parsed = JSON.parse(json) as {
    data: {
      repository: {
        pullRequest: {
          reviewThreads: { nodes: ReviewThread[] }
          reviews: { nodes: Review[] }
        }
      }
    }
  }
  const { reviewThreads, reviews } = parsed.data.repository.pullRequest
  return { threads: reviewThreads.nodes, reviews: reviews.nodes }
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
