/** Markdown for `node scripts/review.ts context`, from data the command already fetched. */

import { loginOf, type ReviewThread, threadLocation } from "./threads.ts"

export type PullRequest = {
  number: number
  title: string
  body: string
  url: string
  author: { login: string }
  baseRefName: string
  headRefName: string
  headRefOid: string
  closingIssuesReferences: { number: number }[]
}

export type LinkedIssue = { number: number; title: string; body: string }

export type ContextData = {
  pullRequest: PullRequest
  repository: string
  login: string
  worktree: string
  localHead: string
  currentBranch: string
  status: string
  diffStat: string
  changedFiles: string[]
  issues: LinkedIssue[]
  /** Changed file to the `docs:find --links-to` lines it returned. */
  recordsByFile: Map<string, string[]>
  threads: ReviewThread[]
}

/** Inverts file to records, so each record is listed once with its files. */
export function filesByRecord(
  recordsByFile: Map<string, string[]>,
): Map<string, string[]> {
  const byRecord = new Map<string, string[]>()
  for (const [file, records] of recordsByFile) {
    for (const record of records) {
      byRecord.set(record, [...(byRecord.get(record) ?? []), file])
    }
  }
  return byRecord
}

function section(title: string, body: string): string {
  return `## ${title}\n\n${body.trim() === "" ? "None." : body.trim()}\n\n`
}

function formatIssue(issue: LinkedIssue): string {
  return `### #${issue.number} ${issue.title}\n\n${issue.body.trim()}`
}

function formatRecords(recordsByFile: Map<string, string[]>): string {
  return [...filesByRecord(recordsByFile)]
    .map(
      ([record, files]) => `- ${record}\n  - linked from: ${files.join(", ")}`,
    )
    .join("\n")
}

function formatExistingThread(thread: ReviewThread): string {
  const first = thread.comments.nodes[0]
  const state = [
    thread.isResolved ? "resolved" : "unresolved",
    thread.isOutdated ? "outdated" : "current",
  ].join(", ")
  const body = first ? first.body.trim().replaceAll("\n", "\n  > ") : ""
  return `- ${threadLocation(thread)} (${state}, ${loginOf(first?.author ?? null)})\n  > ${body}`
}

export function formatContext(
  data: ContextData,
  warningsSection: string,
): string {
  const pr = data.pullRequest
  const overview = [
    `- PR: #${pr.number} ${pr.title}`,
    `- URL: ${pr.url}`,
    `- Repository: ${data.repository}`,
    `- Author: ${pr.author.login}`,
    `- gh login: ${data.login}`,
    `- Base: ${pr.baseRefName}`,
    `- Head branch: ${pr.headRefName}`,
    `- Head SHA (pushed): ${pr.headRefOid}`,
    `- Worktree: ${data.worktree}`,
    `- Local HEAD: ${data.localHead} (${data.localHead === pr.headRefOid ? "equals" : "differs from"} the pushed head)`,
    `- Local branch: ${data.currentBranch}`,
    `- Working tree: ${data.status.trim() === "" ? "clean" : "dirty"}`,
  ].join("\n")

  return [
    `# Review context for PR #${pr.number}\n\n`,
    warningsSection,
    section("Overview", overview),
    section("PR body", pr.body),
    section("Linked issues", data.issues.map(formatIssue).join("\n\n")),
    section("Diff stat", `\`\`\`\n${data.diffStat.trim()}\n\`\`\``),
    section(
      "Changed files",
      data.changedFiles.map((file) => `- ${file}`).join("\n"),
    ),
    section("Decision records", formatRecords(data.recordsByFile)),
    section(
      "Existing review threads",
      data.threads.map(formatExistingThread).join("\n"),
    ),
  ].join("")
}
