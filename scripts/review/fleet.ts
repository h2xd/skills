/**
 * Picks the review-pr reviewers from the diff size and the kind of files it
 * touches, so a small change starts two agents and only a critical or large
 * one starts all five.
 */

export type FileChange = { path: string; lines: number }

export type FleetSettings = {
  small: { files: number; lines: number }
  middle: { files: number; lines: number }
  criticalPaths: string[]
  mutationEnabled: boolean
}

export type Size = "small" | "middle" | "large" | "critical"

export type Fleet = {
  size: Size
  files: number
  lines: number
  reviewers: string[]
  effort: "medium" | "high"
  ask: boolean
  reasons: string[]
}

const IGNORED = [
  /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|[^/]+\.lock)$/,
  /(^|\/)dist\//,
  /\.min\.(js|css)$/,
]
const INSTRUCTIONS = /(^|\/)(SKILL\.md|CLAUDE\.md|AGENTS\.md)$|(^|\/)agents\/[^/]+\.md$/
const TESTS = /(\.test\.|\.spec\.|(^|\/)tests?\/|(^|\/)__tests__\/)/
const CONFIG = /(^|\/)\.(github|githooks|claude)\/|\.(json|ya?ml|toml)$/

/** Reads `git diff --numstat`. A binary file counts as zero lines. */
export function parseNumstat(text: string): FileChange[] {
  return text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const [added, deleted, ...rest] = line.split("\t")
      const count = (value: string) => (value === "-" ? 0 : Number(value))
      return { path: rest.join("\t"), lines: count(added) + count(deleted) }
    })
}

function kindOf(path: string): "docs" | "tests" | "config" | "code" {
  if (INSTRUCTIONS.test(path)) return "code"
  if (path.endsWith(".md")) return "docs"
  if (TESTS.test(path)) return "tests"
  if (CONFIG.test(path)) return "config"
  return "code"
}

export function pickFleet(
  changes: FileChange[],
  settings: FleetSettings,
  oneWayDoor: boolean,
): Fleet {
  const counted = changes.filter(
    (change) => !IGNORED.some((pattern) => pattern.test(change.path)),
  )
  const files = counted.length
  const lines = counted.reduce((sum, change) => sum + change.lines, 0)
  const kinds = new Set(counted.map((change) => kindOf(change.path)))
  const critical = counted
    .map((change) => change.path)
    .filter((path) =>
      settings.criticalPaths.some((prefix) => path.startsWith(prefix)),
    )
  const withMutation = (reviewers: string[]) =>
    settings.mutationEnabled
      ? reviewers
      : reviewers.filter((reviewer) => reviewer !== "D")
  const fleet = (
    size: Size,
    reviewers: string[],
    reasons: string[],
  ): Fleet => ({
    size,
    files,
    lines,
    reviewers: withMutation(reviewers),
    effort: size === "small" ? "medium" : "high",
    ask: size === "large",
    reasons,
  })

  if (oneWayDoor || critical.length > 0) {
    const reasons = oneWayDoor ? ["the PR body names a one-way door"] : []
    for (const path of critical) reasons.push(`${path} is a critical path`)
    return fleet("critical", ["A", "B", "C", "D", "E"], reasons)
  }
  if (files < settings.small.files && lines < settings.small.lines) {
    const docsOnly = kinds.size === 1 && kinds.has("docs")
    return fleet("small", [docsOnly ? "B" : "A", "C"], [
      docsOnly
        ? "small docs change: B checks it against the standards"
        : "small change: A checks correctness",
    ])
  }
  if (files < settings.middle.files && lines < settings.middle.lines) {
    const reviewers = ["A", "C"]
    const reasons = ["middle change: A checks correctness"]
    if (kinds.has("code")) {
      reviewers.push("D")
      reasons.push("code changed: D checks the tests by mutation")
    }
    if (kinds.has("docs")) {
      reviewers.push("B")
      reasons.push("docs changed: B checks them against the code")
    }
    if (kinds.has("config")) {
      reviewers.push("E")
      reasons.push("config changed: E checks what it breaks outside the diff")
    }
    return fleet("middle", reviewers.sort(), reasons)
  }
  return fleet("large", ["A", "B", "C", "D", "E"], [
    `large change: ${files} files and ${lines} lines`,
  ])
}

export function formatFleet(fleet: Fleet): string {
  return [
    `# Reviewer pick`,
    ``,
    `- Size: ${fleet.size}, ${fleet.files} files, ${fleet.lines} lines`,
    `- Reviewers: ${fleet.reviewers.join(", ")}`,
    `- Effort for A: ${fleet.effort}`,
    `- Ask first: ${fleet.ask ? "yes" : "no"}`,
    ``,
    ...fleet.reasons.map((reason) => `- ${reason}`),
    ``,
  ].join("\n")
}
