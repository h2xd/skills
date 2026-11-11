/** Parsing and markdown formatting for review threads and review summaries. */

import {
  formatChoiceLine,
  formatOptionsLine,
  parseChoice,
  parseOptions,
} from "./options.ts"

type ReviewComment = {
  author: { login: string } | null
  body: string
  url: string
  createdAt: string
}

export type ReviewThread = {
  id: string
  isResolved: boolean
  isOutdated: boolean
  path: string
  line: number | null
  startLine: number | null
  originalLine: number | null
  comments: { nodes: ReviewComment[] }
}

export type Review = {
  author: { login: string } | null
  state: string
  body: string
  url: string
  submittedAt: string | null
}

export type PullRequestHeader = {
  number: number
  url: string
  headRefName: string
  headRefOid: string
  baseRefName: string
  owner: string
  name: string
}

const DELETED_ACCOUNT_LOGIN = "ghost"
const OUTSIDE_DIFF_HEADING = /^\s{0,3}(?:#{1,6}\s*|\*\*)\s*outside the diff\b/i
const MARKDOWN_HEADING = /^#{1,6}\s/
const BOLD_ONLY_LINE = /^\*\*[^*]+\*\*:?$/
const BULLET = /^\s{0,3}[-*]\s+/
const NO_FINDINGS = /^none\.?$/i
const ITEM_ID_HEAD = /^\S*\s*\[(out-\w+-\d+)\]/
const REPLY_SECTION = /^## (out-\w+-\d+)[ \t]*$/gm

export function loginOf(author: { login: string } | null): string {
  return author?.login ?? DELETED_ACCOUNT_LOGIN
}

function unresolvedThreads(threads: ReviewThread[]): ReviewThread[] {
  return threads.filter((thread) => !thread.isResolved)
}

export function threadLocation(thread: ReviewThread): string {
  // GitHub drops `line` once a thread is outdated; the original line still
  // tells the triager where to look in the commit the comment was made on.
  if (thread.line === null) {
    return thread.originalLine === null
      ? thread.path
      : `${thread.path}:${thread.originalLine} (original)`
  }
  if (thread.startLine !== null && thread.startLine !== thread.line) {
    return `${thread.path}:${thread.startLine}-${thread.line}`
  }
  return `${thread.path}:${thread.line}`
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length
}

function dedentContinuation(lines: string[]): string[] {
  const first = lines.find((line) => line.trim() !== "")
  const width = first === undefined ? 0 : indentOf(first)
  return lines.map((line) =>
    line.trim() === "" ? "" : line.slice(Math.min(width, indentOf(line))),
  )
}

/**
 * The bullets under an "Outside the diff" heading in a review summary, which
 * `review-pr` writes for findings that sit outside a diff hunk.
 */
export function outsideDiffItems(body: string): string[] {
  const lines = body.split(/\r?\n/)
  const start = lines.findIndex((line) => OUTSIDE_DIFF_HEADING.test(line))
  if (start === -1) return []

  const items: { head: string; rest: string[] }[] = []
  for (const line of lines.slice(start + 1)) {
    if (
      MARKDOWN_HEADING.test(line) ||
      BOLD_ONLY_LINE.test(line.trimEnd()) ||
      /^Co-Authored-By:/i.test(line)
    ) {
      break
    }
    if (BULLET.test(line)) items.push({ head: line.replace(BULLET, ""), rest: [] })
    else if (items.length > 0) items[items.length - 1].rest.push(line)
  }
  return items
    .map(({ head, rest }) => [head, ...dedentContinuation(rest)].join("\n").trimEnd())
    .filter((item) => !NO_FINDINGS.test(item.trim()))
}

export type SummaryItem = {
  reviewUrl: string
  author: string
  id: string
  text: string
}

/** The item ids that head a `## <item id>` section in a PR comment: those items have a reply. */
export function repliedItemIds(commentBodies: string[]): Set<string> {
  return new Set(
    commentBodies.flatMap((body) =>
      [...body.matchAll(REPLY_SECTION)].map((match) => match[1]),
    ),
  )
}

/**
 * The outside-the-diff items of the reviews that carry an item id and have no
 * reply in `commentBodies`, the bodies of the PR's issue comments.
 */
export function summaryItems(
  reviews: Review[],
  commentBodies: string[] = [],
): SummaryItem[] {
  const replied = repliedItemIds(commentBodies)
  return reviews
    .filter((review) => review.body.trim() !== "")
    .flatMap((review) =>
      outsideDiffItems(review.body).flatMap((text) => {
        const id = ITEM_ID_HEAD.exec(text)?.[1]
        if (id === undefined || replied.has(id)) return []
        return [
          { reviewUrl: review.url, author: loginOf(review.author), id, text },
        ]
      }),
    )
}

function formatChoiceLines(thread: ReviewThread): string[] {
  const comments = thread.comments.nodes.map((comment) => ({
    login: loginOf(comment.author),
    body: comment.body,
  }))
  const choice = parseChoice(comments)
  if (!choice) return []
  return [
    `- Options: ${formatOptionsLine(parseOptions(comments[0].body))}`,
    `- Choice: ${formatChoiceLine(choice)}`,
  ]
}

function formatThread(thread: ReviewThread, index: number): string {
  const comments = thread.comments.nodes
    .map(
      (comment) =>
        `### ${loginOf(comment.author)} (${comment.url})\n\n${comment.body.trim()}`,
    )
    .join("\n\n")
  return [
    `## T${index + 1}`,
    `- Thread id: ${thread.id}`,
    `- Location: ${threadLocation(thread)}`,
    `- Outdated: ${thread.isOutdated ? "yes" : "no"}`,
    ...formatChoiceLines(thread),
    "",
    comments,
  ].join("\n")
}

function formatSummaryItem(item: SummaryItem, index: number): string {
  return [
    `## S${index + 1}`,
    `- Item id: ${item.id}`,
    `- Review: ${item.reviewUrl} (${item.author})`,
    "",
    item.text,
  ].join("\n")
}

function formatHeader(header: PullRequestHeader): string {
  return [
    `# Review items for PR #${header.number}`,
    "",
    `- Number: ${header.number}`,
    `- URL: ${header.url}`,
    `- headRefName: ${header.headRefName}`,
    `- headRefOid: ${header.headRefOid}`,
    `- baseRefName: ${header.baseRefName}`,
    `- Repository: ${header.owner}/${header.name}`,
    "",
    "",
  ].join("\n")
}

export function formatThreadsDocument(input: {
  header: PullRequestHeader
  warningsSection: string
  threads: ReviewThread[]
  items: SummaryItem[]
}): string {
  const sections = [
    ...unresolvedThreads(input.threads).map(formatThread),
    ...input.items.map(formatSummaryItem),
  ]
  const body =
    sections.length > 0 ? sections.join("\n\n") : "No unresolved items."
  return `${formatHeader(input.header)}${input.warningsSection}${body}\n`
}
