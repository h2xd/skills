/**
 * The mechanical docs conflicts a merge of origin/main keeps producing, and
 * how to fix them, as pure functions over text. scripts/resolve-docs.ts runs
 * git and calls these.
 *
 * Three hunk shapes resolve on their own: two `generated:` frontmatter lines
 * (the later one wins), and any hunk in the bundle's index.md or log.md (both
 * sides are kept). Everything else stays for a human. Two decision records
 * that got the same number resolve by renumbering the one the base branch
 * does not have.
 */

import { posix } from "node:path"
import { BUNDLE_DIRECTORY, DECISIONS_DIRECTORY } from "./bundle.ts"

type Hunk = {
  ours: string[]
  /** The common ancestor's lines, present only with merge.conflictStyle diff3. */
  base?: string[]
  theirs: string[]
  /** The marker lines, kept to write an unresolved hunk back unchanged. */
  markers: { start: string; base?: string; separator: string; end: string }
}

type Segment = { kind: "text"; lines: string[] } | { kind: "hunk"; hunk: Hunk }

type Rule = "generated line" | "union"

export type FileResolution = {
  text: string
  resolved: Record<Rule, number>
  /** 1-based line numbers of the conflict start markers left in `text`. */
  remainingLines: number[]
}

export type Renumbering = { from: string; to: string }

export type DecisionCollision = { number: string; paths: string[] }

const START_MARKER = /^<{7}( |$)/
const BASE_MARKER = /^\|{7}( |$)/
const SEPARATOR_MARKER = /^={7}$/
const END_MARKER = /^>{7}( |$)/
const GENERATED_LINE = /^generated: \{ by: [^,]+, at: ([^ }]+) \}$/
const DECISION_ENTRY = new RegExp(
  `^\\* \\[\\d{4}[^\\]]*\\]\\(\\/${DECISIONS_DIRECTORY}\\/(\\d{4})-[^)]*\\)`,
)
const DECISION_FILENAME = /^(\d{4})-.+\.md$/
const MARKDOWN_LINK = /\[([^\]]*)\]\(([^)\s]+)\)/g
const DECISION_NUMBER_LENGTH = 4
const INDEX_FILE = `${BUNDLE_DIRECTORY}/index.md`
const UNION_FILES = [INDEX_FILE, `${BUNDLE_DIRECTORY}/log.md`]

type ParseState = "text" | "ours" | "base" | "theirs"

/**
 * Splits a file into plain text and conflict hunks. A hunk without its end
 * marker stays plain text, so a broken file is written back as it was.
 */
export function parseConflicts(text: string): Segment[] {
  const segments: Segment[] = []
  let plain: string[] = []
  let pending: string[] = []
  let hunk: Hunk | undefined
  let state: ParseState = "text"

  for (const line of text.split("\n")) {
    if (state === "text") {
      if (START_MARKER.test(line)) {
        hunk = {
          ours: [],
          theirs: [],
          markers: { start: line, separator: "", end: "" },
        }
        pending = [line]
        state = "ours"
      } else {
        plain.push(line)
      }
      continue
    }
    if (!hunk) throw new Error("unreachable: hunk state without a hunk")
    pending.push(line)
    if (state === "ours" && BASE_MARKER.test(line)) {
      hunk.base = []
      hunk.markers.base = line
      state = "base"
    } else if (state !== "theirs" && SEPARATOR_MARKER.test(line)) {
      hunk.markers.separator = line
      state = "theirs"
    } else if (state === "theirs" && END_MARKER.test(line)) {
      hunk.markers.end = line
      if (plain.length > 0) segments.push({ kind: "text", lines: plain })
      segments.push({ kind: "hunk", hunk })
      plain = []
      pending = []
      hunk = undefined
      state = "text"
    } else if (state === "ours") {
      hunk.ours.push(line)
    } else if (state === "base") {
      hunk.base?.push(line)
    } else {
      hunk.theirs.push(line)
    }
  }

  plain.push(...pending)
  if (plain.length > 0) segments.push({ kind: "text", lines: plain })
  return segments
}

function hunkLines(hunk: Hunk): string[] {
  const { markers } = hunk
  const baseLines =
    markers.base !== undefined ? [markers.base, ...(hunk.base ?? [])] : []
  return [
    markers.start,
    ...hunk.ours,
    ...baseLines,
    markers.separator,
    ...hunk.theirs,
    markers.end,
  ]
}

function generatedAt(lines: string[]): number | undefined {
  if (lines.length !== 1) return undefined
  const match = lines[0].match(GENERATED_LINE)
  if (!match) return undefined
  const time = new Date(match[1]).getTime()
  return Number.isNaN(time) ? undefined : time
}

function resolveGeneratedLine(hunk: Hunk): string[] | undefined {
  const oursAt = generatedAt(hunk.ours)
  const theirsAt = generatedAt(hunk.theirs)
  if (oursAt === undefined || theirsAt === undefined) return undefined
  return oursAt >= theirsAt ? hunk.ours : hunk.theirs
}

function decisionEntryNumber(line: string): number | undefined {
  const match = line.match(DECISION_ENTRY)
  return match ? Number(match[1]) : undefined
}

/** Array.prototype.sort is stable, so entries with the same number keep their order. */
function sortByDecisionNumber(entries: string[]): string[] {
  return [...entries].sort(
    (left, right) =>
      (decisionEntryNumber(left) ?? 0) - (decisionEntryNumber(right) ?? 0),
  )
}

function sortedIfAllDecisionEntries(lines: string[]): string[] {
  const allEntries = lines.every(
    (line) => decisionEntryNumber(line) !== undefined,
  )
  return allEntries ? sortByDecisionNumber(lines) : lines
}

/** Blank lines separate sections, so only lines with content count as duplicates. */
function withoutDuplicateLines(lines: string[]): string[] {
  const seen = new Set<string>()
  const kept: string[] = []
  for (const line of lines) {
    if (line.trim() !== "" && seen.has(line)) continue
    seen.add(line)
    kept.push(line)
  }
  return kept
}

function resolveUnion(path: string, hunk: Hunk): string[] {
  const union = withoutDuplicateLines([...hunk.ours, ...hunk.theirs])
  return path === INDEX_FILE ? sortedIfAllDecisionEntries(union) : union
}

function resolveHunk(
  path: string,
  hunk: Hunk,
): { lines: string[]; rule: Rule } | undefined {
  const generated = resolveGeneratedLine(hunk)
  if (generated) return { lines: generated, rule: "generated line" }
  if (UNION_FILES.includes(path)) {
    return { lines: resolveUnion(path, hunk), rule: "union" }
  }
  return undefined
}

/** `path` is repo-relative, such as "docs/index.md". */
export function resolveFile(path: string, text: string): FileResolution {
  const resolved: Record<Rule, number> = { "generated line": 0, union: 0 }
  const remainingLines: number[] = []
  const output: string[] = []

  for (const segment of parseConflicts(text)) {
    if (segment.kind === "text") {
      output.push(...segment.lines)
      continue
    }
    const resolution = resolveHunk(path, segment.hunk)
    if (resolution) {
      resolved[resolution.rule] += 1
      output.push(...resolution.lines)
    } else {
      remainingLines.push(output.length + 1)
      output.push(...hunkLines(segment.hunk))
    }
  }

  return { text: output.join("\n"), resolved, remainingLines }
}

/**
 * Sorts every run of consecutive decision entries in the index by number.
 * Renumbering a record can leave its entry out of order.
 */
export function sortDecisionEntries(text: string): string {
  const output: string[] = []
  let run: string[] = []
  for (const line of text.split("\n")) {
    if (decisionEntryNumber(line) !== undefined) {
      run.push(line)
      continue
    }
    output.push(...sortByDecisionNumber(run), line)
    run = []
  }
  output.push(...sortByDecisionNumber(run))
  return output.join("\n")
}

function numberOf(fileName: string): string | undefined {
  return fileName.match(DECISION_FILENAME)?.[1]
}

/**
 * Plans renames for decision records that share a number. `paths` are the
 * repo-relative paths in the decisions directory. When exactly one record of a group
 * exists on the base branch, the others move to the next free numbers.
 * Otherwise nobody can tell which one came first, so the group is reported.
 */
export function planRenumbering(
  paths: string[],
  existsAtBase: (path: string) => boolean,
): { renumberings: Renumbering[]; collisions: DecisionCollision[] } {
  const pathsByNumber = new Map<string, string[]>()
  for (const path of [...paths].sort()) {
    const number = numberOf(posix.basename(path))
    if (!number) continue
    pathsByNumber.set(number, [...(pathsByNumber.get(number) ?? []), path])
  }

  let highest = Math.max(0, ...[...pathsByNumber.keys()].map(Number))
  const renumberings: Renumbering[] = []
  const collisions: DecisionCollision[] = []

  for (const [number, group] of pathsByNumber) {
    if (group.length < 2) continue
    const onBase = group.filter(existsAtBase)
    if (onBase.length !== 1) {
      collisions.push({ number, paths: group })
      continue
    }
    for (const path of group.filter((candidate) => candidate !== onBase[0])) {
      highest += 1
      const newNumber = String(highest).padStart(DECISION_NUMBER_LENGTH, "0")
      const fileName = posix.basename(path)
      renumberings.push({
        from: path,
        to: posix.join(
          posix.dirname(path),
          newNumber + fileName.slice(DECISION_NUMBER_LENGTH),
        ),
      })
    }
  }
  return { renumberings, collisions }
}

/**
 * Points every mention of a renamed decision record at its new file name.
 * A markdown link to it also gets the number in its label changed, so
 * "[ADR-0010](/decisions/0010-x.md)" becomes "[ADR-0012](/decisions/0012-x.md)".
 */
export function rewriteReferences(
  text: string,
  oldFileName: string,
  newFileName: string,
): string {
  const oldNumber = numberOf(oldFileName)
  const newNumber = numberOf(newFileName)
  const withLinks = text.replace(
    MARKDOWN_LINK,
    (link, label: string, target: string) => {
      const path = target.split("#")[0]
      if (path !== oldFileName && !path.endsWith(`/${oldFileName}`)) {
        return link
      }
      const newLabel =
        oldNumber && newNumber
          ? label.replace(new RegExp(`\\b${oldNumber}\\b`, "g"), newNumber)
          : label
      return `[${newLabel}](${target.replace(oldFileName, newFileName)})`
    },
  )
  return withLinks.replaceAll(oldFileName, newFileName)
}

export function hasConflictMarkers(text: string): boolean {
  return text.split("\n").some((line) => START_MARKER.test(line))
}
