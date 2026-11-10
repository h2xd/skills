/**
 * Groups a ticket's acceptance criteria for the h2xd:code-implement build
 * workers. Criteria that share a file or depend on each other form one
 * criteria group, so no two build workers write the same file.
 */

export type FileMap = {
  /** The files per criterion number. `null` means the scout was unsure. */
  files: Map<number, string[] | null>
  /** Pairs of a criterion and the criterion it needs. */
  needs: [number, number][]
}

export type SplitSettings = { maxWorkers: number }

export type Verdict = "single" | "split" | "ask"

export type Worker = { id: number; criteria: number[]; files: string[] }

export type Split = { verdict: Verdict; workers: Worker[]; reasons: string[] }

/** A ticket with fewer criteria than this is not worth a scout and worktrees. */
export const MIN_CRITERIA = 3

const FILES_LINE = /^(\d+):\s*(.+)$/
const NEEDS_LINE = /^(\d+) needs (\d+)$/

/**
 * Reads the scout's map: `<n>: <file>, <file>` or `<n>: unsure` per criterion,
 * and `<n> needs <m>` per dependency. Headings and blank lines are skipped.
 */
export function parseFileMap(text: string, criteriaCount: number): FileMap {
  const files = new Map<number, string[] | null>()
  const needs: [number, number][] = []
  const known = (criterion: number) => {
    if (criterion < 1 || criterion > criteriaCount) {
      throw new Error(
        `criterion ${criterion} is not one of the ${criteriaCount} criteria`,
      )
    }
    return criterion
  }

  text.split("\n").forEach((raw, index) => {
    const line = raw.trim()
    if (line === "" || line.startsWith("#")) return
    const needsMatch = NEEDS_LINE.exec(line)
    if (needsMatch) {
      needs.push([known(Number(needsMatch[1])), known(Number(needsMatch[2]))])
      return
    }
    const filesMatch = FILES_LINE.exec(line)
    if (!filesMatch) throw new Error(`line ${index + 1}: cannot read "${line}"`)
    const criterion = known(Number(filesMatch[1]))
    if (files.has(criterion)) {
      throw new Error(`criterion ${criterion} has two lines`)
    }
    const value = filesMatch[2].trim()
    files.set(
      criterion,
      value === "unsure"
        ? null
        : value
            .split(",")
            .map((file) => file.trim().replaceAll("`", ""))
            .filter((file) => file !== ""),
    )
  })

  for (let criterion = 1; criterion <= criteriaCount; criterion++) {
    if (!files.has(criterion)) {
      throw new Error(`criterion ${criterion} has no line`)
    }
  }
  return { files, needs }
}

/** The criteria groups: criteria joined by a shared file or a `needs` pair. */
function connectedGroups(map: FileMap): number[][] {
  const parent = new Map<number, number>()
  for (const criterion of map.files.keys()) parent.set(criterion, criterion)
  const find = (criterion: number): number => {
    const up = parent.get(criterion) ?? criterion
    if (up === criterion) return criterion
    const root = find(up)
    parent.set(criterion, root)
    return root
  }
  const union = (a: number, b: number) => parent.set(find(a), find(b))

  const firstUser = new Map<string, number>()
  for (const [criterion, files] of map.files) {
    for (const file of files ?? []) {
      const other = firstUser.get(file)
      if (other === undefined) firstUser.set(file, criterion)
      else union(criterion, other)
    }
  }
  for (const [criterion, needed] of map.needs) union(criterion, needed)

  const groups = new Map<number, number[]>()
  for (const criterion of map.files.keys()) {
    const root = find(criterion)
    groups.set(root, [...(groups.get(root) ?? []), criterion])
  }
  return [...groups.values()].map((group) => group.sort((a, b) => a - b))
}

const bySizeThenFirst = (a: number[], b: number[]) =>
  a.length - b.length || a[0] - b[0]

function toWorkers(groups: number[][], map: FileMap): Worker[] {
  return groups
    .map((group) => [...group].sort((a, b) => a - b))
    .sort((a, b) => a[0] - b[0])
    .map((criteria, index) => ({
      id: index + 1,
      criteria,
      files: [
        ...new Set(criteria.flatMap((criterion) => map.files.get(criterion) ?? [])),
      ].sort(),
    }))
}

export function planSplit(map: FileMap, settings: SplitSettings): Split {
  const all = [...map.files.keys()].sort((a, b) => a - b)
  const single = (reason: string): Split => ({
    verdict: "single",
    workers: toWorkers([all], map),
    reasons: [reason],
  })
  if (all.length < MIN_CRITERIA) {
    return single(`fewer than ${MIN_CRITERIA} criteria`)
  }

  const unsure = all.filter((criterion) => map.files.get(criterion) === null)
  const isLoneUnsure = (group: number[]) =>
    group.length === 1 && unsure.includes(group[0])
  const connected = connectedGroups(map)
  let groups = connected.filter((group) => !isLoneUnsure(group))
  if (groups.length === 0) {
    return single("the scout is unsure of the files of every criterion")
  }
  const largest = [...groups].sort((a, b) => b.length - a.length || a[0] - b[0])[0]
  largest.push(...connected.filter(isLoneUnsure).flat())

  const independent = groups.length
  while (groups.length > Math.max(settings.maxWorkers, 1)) {
    const [smallest, next, ...rest] = [...groups].sort(bySizeThenFirst)
    groups = [[...smallest, ...next], ...rest]
  }
  if (groups.length === 1) {
    return single(
      independent === 1
        ? "every criterion shares a file or a dependency with another"
        : `the cap is ${settings.maxWorkers} build worker`,
    )
  }

  const reasons = unsure.map(
    (criterion) => `criterion ${criterion}: the scout is unsure of its files`,
  )
  reasons.push(`${independent} criteria groups share no file and no dependency`)
  if (independent > groups.length) {
    reasons.push(
      `joined the smallest groups to stay within ${settings.maxWorkers} build workers`,
    )
  }
  return {
    verdict: unsure.length > 0 ? "ask" : "split",
    workers: toWorkers(groups, map),
    reasons,
  }
}

export function formatSplit(split: Split): string {
  return [
    `# Split`,
    ``,
    `- Verdict: ${split.verdict}`,
    `- Build workers: ${split.workers.length}`,
    ``,
    ...split.workers.flatMap((worker) => [
      `## Build worker ${worker.id}`,
      ``,
      `- Criteria: ${worker.criteria.join(", ")}`,
      `- Files: ${worker.files.join(", ") || "unknown"}`,
      ``,
    ]),
    `## Why`,
    ``,
    ...split.reasons.map((reason) => `- ${reason}`),
    ``,
  ].join("\n")
}
