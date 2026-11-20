export type FixItem = { id: string; file: string | undefined }

export type SplitSettings = { fixMaxWorkers: number }

export type FixerWorker = { id: number; items: string[]; files: string[] }

export type FixSplit = { workers: FixerWorker[]; reasons: string[] }

export const MAX_ITEMS = 5

const ITEM_ID = /^(?:T|S)\d+$/
const LOCATION = /^(.+?)(?::\d+(?:-\d+)?)?$/

function cells(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim())
}

export function parseFixItems(plan: string, threads: string): FixItem[] {
  const known = new Set(
    [...threads.matchAll(/^## ((?:T|S)\d+)\s*$/gm)].map((match) => match[1]),
  )
  const items: FixItem[] = []
  for (const line of plan.split("\n")) {
    if (!line.trim().startsWith("|")) continue
    const [id, bucket, location] = cells(line)
    if (!ITEM_ID.test(id) || bucket.replaceAll("*", "").toLowerCase() !== "fix") {
      continue
    }
    if (!known.has(id)) throw new Error(`${id} is in the plan, not in threads.md`)
    if (items.some((item) => item.id === id)) throw new Error(`${id} has two rows`)
    const path = (location ?? "").replaceAll("`", "")
    const file = path === "" || path === "-" ? undefined : LOCATION.exec(path)?.[1]
    items.push({ id, file: file?.replace(/^\.\//, "") })
  }
  return items
}

function sameFileGroups(items: FixItem[]): FixItem[][] {
  const groups: FixItem[][] = []
  const byFile = new Map<string, FixItem[]>()
  for (const item of items) {
    const group = item.file === undefined ? undefined : byFile.get(item.file)
    if (group) {
      group.push(item)
      continue
    }
    const created = [item]
    groups.push(created)
    if (item.file !== undefined) byFile.set(item.file, created)
  }
  return groups
}

export function planFixSplit(items: FixItem[], settings: SplitSettings): FixSplit {
  if (items.length === 0) return { workers: [], reasons: ["no fix items"] }
  const order = new Map(items.map((item, index) => [item.id, index]))
  const groups = sameFileGroups(items)
  if (!Number.isInteger(settings.fixMaxWorkers)) {
    throw new Error(`review.fixMaxWorkers must be a whole number, not ${JSON.stringify(settings.fixMaxWorkers)}`)
  }
  const cap = Math.max(settings.fixMaxWorkers, 1)
  const limit = Math.min(cap, groups.length)
  const bySize = [...groups].sort(
    (a, b) => b.length - a.length || order.get(a[0].id)! - order.get(b[0].id)!,
  )

  const pack = (binCount: number): FixItem[][] => {
    const packed: FixItem[][] = Array.from({ length: binCount }, () => [])
    for (const group of bySize) {
      const fits = packed.filter((bin) => bin.length + group.length <= MAX_ITEMS)
      const candidates = fits.length > 0 ? fits : packed
      const target = candidates.reduce((best, bin) => (bin.length < best.length ? bin : best))
      target.push(...group)
    }
    return packed
  }

  let wanted = Math.min(Math.ceil(items.length / MAX_ITEMS), limit)
  let bins = pack(wanted)
  while (wanted < limit && bins.some((bin) => bin.length > MAX_ITEMS)) {
    wanted += 1
    bins = pack(wanted)
  }

  const workers = bins
    .filter((bin) => bin.length > 0)
    .map((bin) => bin.sort((a, b) => order.get(a.id)! - order.get(b.id)!))
    .sort((a, b) => order.get(a[0].id)! - order.get(b[0].id)!)
    .map((bin, index) => ({
      id: index + 1,
      items: bin.map((item) => item.id),
      files: [
        ...new Set(bin.flatMap((item) => (item.file === undefined ? [] : [item.file]))),
      ].sort(),
    }))

  const reasons = [`${items.length} fix items, at most ${MAX_ITEMS} per fixer worker`]
  if (workers.some((worker) => worker.items.length > MAX_ITEMS)) {
    reasons.push(
      `a group holds more than ${MAX_ITEMS} items: the same file or the cap of ${cap} fixer workers`,
    )
  }
  return { workers, reasons }
}

export function formatFixSplit(split: FixSplit): string {
  return [
    `# Split`,
    ``,
    `- Fixer workers: ${split.workers.length}`,
    ``,
    ...split.workers.flatMap((worker) => [
      `## Fixer worker ${worker.id}`,
      ``,
      `- Items: ${worker.items.join(", ")}`,
      `- Files: ${worker.files.join(", ") || "unknown"}`,
      ``,
    ]),
    `## Why`,
    ``,
    ...split.reasons.map((reason) => `- ${reason}`),
    ``,
  ].join("\n")
}
