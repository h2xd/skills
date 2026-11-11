/**
 * The findings files that each `review-pr` reviewer writes, the check behind
 * `node scripts/review.ts findings --validate`, and the merge behind
 * `node scripts/review.ts merge`, which turns them into one `review.json`.
 */

import { expectedNote } from "./options.ts"

export type Severity = "red" | "yellow" | "green"

export type Finding = {
  id: string
  severity: Severity
  file: string
  lines: number[]
  label: string
  subject: string
  body: string
  suggestion?: string
  options?: string[]
  "found-by": string[]
}

export type FindingsFile = {
  reviewer: string
  findings: Finding[]
  status?: string[]
}

export type MergeContext = {
  headSha: string
  reviewerLogin: string
  author: string
  pickReasons: string[]
  rewordedBullets?: string[]
}

export type ReviewComment = {
  path: string
  line: number
  side: "RIGHT"
  body: string
  start_line?: number
  start_side?: "RIGHT"
}

export type Review = {
  commit_id: string
  event: "REQUEST_CHANGES" | "APPROVE" | "COMMENT"
  body: string
  comments: ReviewComment[]
}

export type MergeStats = {
  merged: number
  dropped: number
  outside: number
  inline: number
}

const SEVERITIES: Severity[] = ["red", "yellow", "green"]
const ICON: Record<Severity, string> = { red: "🔴", yellow: "🟡", green: "🟢" }
const LABELS: Record<Severity, string[]> = {
  red: ["issue", "todo"],
  yellow: ["suggestion", "issue", "question"],
  green: ["nitpick", "thought", "note", "praise"],
}
const UNDECORATED = ["thought", "note", "praise"]
const REQUIRED_FIELDS = [
  "id",
  "severity",
  "file",
  "lines",
  "label",
  "subject",
  "body",
  "found-by",
]
const KNOWN_FIELDS = [...REQUIRED_FIELDS, "suggestion", "options"]
const MIN_OPTIONS = 2
const MAX_OPTIONS = 3
const KEPT_NOTE = /^kept\b/i
const OUTSIDE_HEADING = "### Outside the diff"
const FINDINGS_HEADING = "### Findings"
const REVIEWERS_HEADING = "### Reviewers"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== ""
}

function isLine(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1
}

function findingProblems(raw: unknown, index: number, reviewer: string): string[] {
  if (!isRecord(raw)) return [`findings[${index}]: must be an object`]
  const name = isText(raw.id) ? raw.id : `findings[${index}]`
  const problems: string[] = []
  const bad = (field: string, message: string) =>
    problems.push(`${name}: ${field} ${message}`)

  for (const field of REQUIRED_FIELDS) {
    if (!(field in raw)) bad(field, "is missing")
  }
  for (const field of Object.keys(raw)) {
    if (!KNOWN_FIELDS.includes(field)) bad(field, "is not a known field")
  }

  if ("id" in raw && (!isText(raw.id) || !raw.id.startsWith(`${reviewer}-`))) {
    bad("id", `must read ${reviewer}-<n>`)
  }
  const severity = SEVERITIES.find((value) => value === raw.severity)
  if ("severity" in raw && !severity) {
    bad("severity", `must be one of ${SEVERITIES.join(", ")}`)
  }
  if ("file" in raw && !isText(raw.file)) bad("file", "must be a repo-relative path")
  if ("lines" in raw) {
    const lines = raw.lines
    const valid =
      Array.isArray(lines) &&
      (lines.length === 1 || lines.length === 2) &&
      lines.every(isLine) &&
      lines[0] <= lines[lines.length - 1]
    if (!valid) bad("lines", "must be [line] or [start, end], with start <= end")
  }
  if ("label" in raw) {
    const allowed = severity ? LABELS[severity] : Object.values(LABELS).flat()
    if (typeof raw.label !== "string" || !allowed.includes(raw.label)) {
      bad("label", `must be one of ${allowed.join(", ")}`)
    }
  }
  if ("subject" in raw && (!isText(raw.subject) || raw.subject.includes("\n"))) {
    bad("subject", "must be one non-empty line")
  }
  if ("body" in raw && !isText(raw.body)) bad("body", "must be non-empty text")
  if ("suggestion" in raw && typeof raw.suggestion !== "string") {
    bad("suggestion", "must be text")
  }
  if ("options" in raw) {
    const options = raw.options
    const valid =
      Array.isArray(options) &&
      options.length >= MIN_OPTIONS &&
      options.length <= MAX_OPTIONS &&
      options.every((option) => isText(option) && !option.includes("\n"))
    if (!valid) bad("options", "must hold 2 or 3 one-line fixes")
  }
  if ("found-by" in raw) {
    const foundBy = raw["found-by"]
    if (!Array.isArray(foundBy) || foundBy.length === 0 || !foundBy.every(isText)) {
      bad("found-by", "must list at least one model name")
    }
  }
  return problems
}

export function validateFindings(json: unknown): string[] {
  if (!isRecord(json)) return ["the file must hold one JSON object"]
  const problems: string[] = []
  if (!isText(json.reviewer)) problems.push("reviewer must be a non-empty string")
  if (!Array.isArray(json.findings)) {
    problems.push("findings must be an array")
    return problems
  }
  if (
    "status" in json &&
    !(Array.isArray(json.status) && json.status.every((line) => typeof line === "string"))
  ) {
    problems.push("status must be an array of strings")
  }
  const reviewer = isText(json.reviewer) ? json.reviewer : "?"
  const seen = new Set<string>()
  json.findings.forEach((raw, index) => {
    problems.push(...findingProblems(raw, index, reviewer))
    const id = isRecord(raw) ? raw.id : undefined
    if (typeof id === "string") {
      if (seen.has(id)) problems.push(`${id}: id is used twice`)
      seen.add(id)
    }
  })
  return problems
}

type Range = [number, number]
type Hunks = Map<string, Range[]>

function newSideHunks(diff: string): Hunks {
  const hunks: Hunks = new Map()
  let path: string | undefined
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ ")) {
      const target = line.slice(4).trim().replace(/^"|"$/g, "")
      path = target.startsWith("b/") ? target.slice(2) : undefined
      continue
    }
    const header = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line)
    if (header && path) {
      const start = Number(header[1])
      const count = header[2] === undefined ? 1 : Number(header[2])
      if (count > 0) {
        hunks.set(path, [...(hunks.get(path) ?? []), [start, start + count - 1]])
      }
    }
  }
  return hunks
}

function span(finding: Finding): Range {
  return [finding.lines[0], finding.lines[finding.lines.length - 1]]
}

function overlap(a: Range, b: Range): boolean {
  return a[0] <= b[1] && b[0] <= a[1]
}

function inHunk(hunks: Hunks, file: string, [start, end]: Range): boolean {
  return (hunks.get(file) ?? []).some(
    ([from, to]) => from <= start && end <= to,
  )
}

type Tagged = Finding & { reviewer: string }

type Group = { members: Tagged[] }

function groupFindings(findings: Tagged[]): Group[] {
  const groups: Group[] = []
  for (const finding of findings) {
    const group = groups.find(
      (candidate) =>
        candidate.members.every((member) => member.reviewer !== finding.reviewer) &&
        candidate.members.some(
          (member) =>
            member.file === finding.file && overlap(span(member), span(finding)),
        ),
    )
    if (group) group.members.push(finding)
    else groups.push({ members: [finding] })
  }
  return groups
}

type Joined = {
  severity: Severity
  file: string
  range: Range
  label: string
  subject: string
  body: string
  suggestion?: string
  options?: string[]
  models: string[]
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function join(group: Group): Joined {
  const ranked = [...group.members].sort(
    (a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity),
  )
  const primary = ranked[0]
  const withSuggestion = ranked.find((member) => member.suggestion !== undefined)
  const withOptions = ranked.find((member) => member.options !== undefined)
  const range: Range = withSuggestion
    ? span(withSuggestion)
    : [
        Math.min(...ranked.map((member) => span(member)[0])),
        Math.max(...ranked.map((member) => span(member)[1])),
      ]
  return {
    severity: primary.severity,
    file: primary.file,
    range,
    label: primary.label,
    subject: primary.subject,
    body: ranked.map((member) => member.body.trim()).join("\n\n"),
    suggestion: withSuggestion?.suggestion,
    options: withOptions?.options,
    models: unique(ranked.flatMap((member) => member["found-by"])),
  }
}

function coAuthors(models: string[]): string {
  return models
    .map((model) => `Co-Authored-By: ${model} <noreply@anthropic.com>`)
    .join("\n")
}

function formatOptions(options: string[]): string {
  const letters = ["A", "B", "C"]
  const lines = options.map(
    (fix, index) =>
      `- Suggestion ${letters[index]}${index === 0 ? " (recommended)" : ""}: ${fix}`,
  )
  return `${lines.join("\n")}\n\n${expectedNote(options.length)}`
}

function suggestionBlock(code: string): string {
  return code === "" ? "```suggestion\n```" : `\`\`\`suggestion\n${code}\n\`\`\``
}

function commentBody(joined: Joined): string {
  const decoration = UNDECORATED.includes(joined.label)
    ? ""
    : ` (${joined.severity === "red" ? "blocking" : "non-blocking"})`
  return [
    `${joined.label}${decoration}: ${joined.subject}`,
    joined.body,
    joined.suggestion === undefined
      ? undefined
      : suggestionBlock(joined.suggestion),
    joined.options ? formatOptions(joined.options) : undefined,
    coAuthors(joined.models),
  ]
    .filter((part) => part !== undefined)
    .join("\n\n")
}

function location(joined: Joined): string {
  const [start, end] = joined.range
  return `${joined.file}:${start === end ? start : `${start}-${end}`}`
}

function toComment(joined: Joined): ReviewComment {
  const [start, end] = joined.range
  const comment: ReviewComment = {
    path: joined.file,
    line: end,
    side: "RIGHT",
    body: commentBody(joined),
  }
  return start === end
    ? comment
    : { ...comment, start_line: start, start_side: "RIGHT" }
}

function outsideItem(joined: Joined): string {
  const lines = [
    `- ${ICON[joined.severity]} \`${location(joined)}\`: ${joined.subject}`,
    ...joined.body.split("\n").map((line) => `    ${line}`),
  ]
  if (joined.suggestion !== undefined) {
    lines.push("    Suggested change:", "    ```", ...joined.suggestion.split("\n").map((line) => `    ${line}`), "    ```")
  }
  return lines.join("\n")
}

function byWorst(a: Joined, b: Joined): number {
  return (
    SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) ||
    a.file.localeCompare(b.file) ||
    a.range[0] - b.range[0]
  )
}

function verdictLine(
  event: Review["event"],
  intended: string,
  reds: number,
  context: MergeContext,
): string {
  const reason =
    reds > 0 ? `${reds} blocking finding${reds === 1 ? "" : "s"}` : "no blocking finding"
  if (event === "COMMENT") {
    return `Intended verdict: ${intended.toLowerCase()}, with ${reason}. Posted as a comment because ${context.reviewerLogin} wrote this PR.`
  }
  return `${intended}: ${reason}.`
}

function bulletKey(joined: Joined): string {
  return `- ${ICON[joined.severity]} \`${location(joined)}\`:`
}

function defaultBullet(joined: Joined): string {
  return `${bulletKey(joined)} ${joined.subject}`
}

function bulletsByFinding(listed: Joined[], reworded: string[]): string[] {
  const unused = [...reworded]
  const bullets = listed.map((item) => {
    const key = bulletKey(item)
    const index = unused.findIndex((bullet) => bullet.startsWith(key))
    if (index === -1) throw new Error(`no bullet for ${key}`)
    return unused.splice(index, 1)[0]
  })
  if (unused.length > 0) {
    throw new Error(`a bullet matches no finding: ${unused[0]}`)
  }
  return bullets
}

export function mergeFindings(
  files: FindingsFile[],
  diff: string,
  context: MergeContext,
): { review: Review; stats: MergeStats } {
  const all: Tagged[] = files.flatMap((file) =>
    file.findings.map((finding) => ({ ...finding, reviewer: file.reviewer })),
  )
  const kept = all.filter((finding) => !KEPT_NOTE.test(finding.subject.trim()))
  const groups = groupFindings(kept)
  const joined = groups.map(join).sort(byWorst)
  const hunks = newSideHunks(diff)
  const inline = joined.filter((item) => inHunk(hunks, item.file, item.range))
  const outside = joined.filter((item) => !inline.includes(item))

  const reds = joined.filter((item) => item.severity === "red").length
  const intended = reds > 0 ? "Request changes" : "Approve"
  const event: Review["event"] =
    context.reviewerLogin === context.author
      ? "COMMENT"
      : reds > 0
        ? "REQUEST_CHANGES"
        : "APPROVE"

  const listed = joined.filter((item) => item.severity !== "green")
  const bullets = context.rewordedBullets
    ? bulletsByFinding(listed, context.rewordedBullets)
    : listed.map(defaultBullet)

  const count = (severity: Severity) =>
    joined.filter((item) => item.severity === severity).length
  const status = files.flatMap((file) => file.status ?? [])
  const models = unique(joined.flatMap((item) => item.models))
  const body = [
    verdictLine(event, intended, reds, context),
    `🔴 ${count("red")} · 🟡 ${count("yellow")} · 🟢 ${count("green")}`,
    `${FINDINGS_HEADING}\n\n${bullets.length > 0 ? bullets.join("\n") : "None."}`,
    `${OUTSIDE_HEADING}\n\n${outside.length > 0 ? outside.map(outsideItem).join("\n") : "None."}`,
    `${REVIEWERS_HEADING}\n\n${[
      `- Ran: ${files.map((file) => file.reviewer).join(", ")}`,
      ...context.pickReasons.map((reason) => `- ${reason}`),
      ...status.map((line) => `- ${line}`),
    ].join("\n")}`,
    coAuthors(models),
  ]
    .filter((part) => part !== "")
    .join("\n\n")

  return {
    review: {
      commit_id: context.headSha,
      event,
      body,
      comments: inline.map(toComment),
    },
    stats: {
      merged: kept.length - groups.length,
      dropped: all.length - kept.length,
      outside: outside.length,
      inline: inline.length,
    },
  }
}

export function findingsBullets(body: string): string[] {
  const part = body.split(`${FINDINGS_HEADING}\n`)[1]?.split("\n### ")[0] ?? ""
  return part.split("\n").filter((line) => line.startsWith("- "))
}

export function formatPreview(review: Review): string {
  const comments = review.comments.map((comment) => {
    const start = comment.start_line === undefined ? "" : `${comment.start_line}-`
    return `### ${comment.path}:${start}${comment.line}\n\n${comment.body}`
  })
  return [
    `# Review preview\n\nEvent: ${review.event}`,
    `## Body\n\n${review.body}`,
    ...(comments.length > 0 ? [`## Comments\n\n${comments.join("\n\n")}`] : []),
  ].join("\n\n") + "\n"
}
