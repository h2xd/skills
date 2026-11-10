/**
 * Picks the review-pr reviewers from the diff size and the kind of files it
 * touches, so a small change starts two agents and only a critical or large
 * one starts all five.
 */

export type FileChange = { path: string; lines: number; hash: string | null }

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

/** Reads `git diff --numstat -z`. A binary file counts as zero lines. */
export function parseNumstat(text: string): FileChange[] {
  const tokens = text.split("\0")
  const changes: FileChange[] = []
  for (let i = 0; i < tokens.length; i++) {
    const [added, deleted, path, ...more] = tokens[i].split("\t")
    if (deleted === undefined || path === undefined) continue
    const count = (value: string) => (value === "-" ? 0 : Number(value))
    const lines = count(added) + count(deleted)
    const moved = path === ""
    const name = moved ? tokens[(i += 2)] : [path, ...more].join("\t")
    changes.push({ path: name, lines, hash: null })
  }
  return changes
}

export function parseRaw(text: string, changes: FileChange[]): FileChange[] {
  const tokens = text.split("\0")
  const hashes = new Map<string, string>()
  for (let i = 0; i < tokens.length; i++) {
    const fields = tokens[i].split(" ")
    if (!tokens[i].startsWith(":") || fields.length < 5) continue
    const moved = /^[RC]/.test(fields[4])
    i += moved ? 2 : 1
    hashes.set(tokens[i], fields[3])
  }
  return changes.map((change) => ({
    ...change,
    hash: hashes.get(change.path) ?? null,
  }))
}

const DELETED_HASH = /^0+$/
const EMPTY_BLOB_HASHES = [
  "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391",
  "473a0f4c3be8a93681a267e3b1e9a7dcda1185436fe141f7749120a303721813",
]

function isDeletionOrEmpty(hash: string): boolean {
  return DELETED_HASH.test(hash) || EMPTY_BLOB_HASHES.includes(hash)
}

function copyKey(change: FileChange): string | null {
  const { hash } = change
  return hash === null || isDeletionOrEmpty(hash) ? null : hash
}

function leaveOutCopies(changes: FileChange[]): {
  kept: FileChange[]
  groups: string[][]
} {
  const byHash = new Map<string, FileChange[]>()
  for (const change of changes) {
    const key = copyKey(change)
    if (key !== null) byHash.set(key, [...(byHash.get(key) ?? []), change])
  }
  const left = new Set<FileChange>()
  const groups: string[][] = []
  for (const members of byHash.values()) {
    if (members.length < 2) continue
    const original = members.reduce((best, change) =>
      change.lines > best.lines ? change : best,
    )
    for (const change of members) if (change !== original) left.add(change)
    groups.push(members.map((change) => change.path))
  }
  return { kept: changes.filter((change) => !left.has(change)), groups }
}

function describeCopies(groups: string[][]): string {
  const list = (items: string[]) =>
    `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
  const count = groups.reduce((sum, paths) => sum + paths.length - 1, 0)
  const noun = count === 1 ? "copy" : "copies"
  const clauses = groups.map((paths) => `${list(paths)} have the same content`)
  return `${count} ${noun} left out: ${clauses.join("; ")}`
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
  const notIgnored = changes.filter(
    (change) => !IGNORED.some((pattern) => pattern.test(change.path)),
  )
  const { kept: counted, groups } = leaveOutCopies(notIgnored)
  const files = counted.length
  const lines = counted.reduce((sum, change) => sum + change.lines, 0)
  const kinds = new Set(counted.map((change) => kindOf(change.path)))
  const critical = notIgnored
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
    reasons: groups.length > 0 ? [...reasons, describeCopies(groups)] : reasons,
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
