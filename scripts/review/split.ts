export type FixItem = { id: string; file: string | undefined; group?: string }

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
    const [id, bucket, location, , group] = cells(line)
    if (!ITEM_ID.test(id) || bucket.replaceAll("*", "").toLowerCase() !== "fix") {
      continue
    }
    if (!known.has(id)) throw new Error(`${id} is in the plan, not in threads.md`)
    if (items.some((item) => item.id === id)) throw new Error(`${id} has two rows`)
    const path = (location ?? "").replaceAll("`", "")
    const file = path === "" || path === "-" ? undefined : LOCATION.exec(path)?.[1]
    items.push({
      id,
      file: file?.replace(/^\.\//, ""),
      ...(group === undefined || group === "" || group === "-" ? {} : { group }),
    })
  }
  return items
}

function unitKey(item: FixItem): string | undefined {
  if (item.group !== undefined) return `group:${item.group}`
  return item.file === undefined ? undefined : `file:${item.file}`
}

function unitsOf(items: FixItem[]): FixItem[][] {
  const units: FixItem[][] = []
  const byKey = new Map<string, FixItem[]>()
  for (const item of items) {
    const key = unitKey(item)
    const unit = key === undefined ? undefined : byKey.get(key)
    if (unit) {
      unit.push(item)
      continue
    }
    const created = [item]
    units.push(created)
    if (key !== undefined) byKey.set(key, created)
  }
  return units
}

export function planFixSplit(items: FixItem[], settings: SplitSettings): FixSplit {
  if (items.length === 0) return { workers: [], reasons: ["no fix items"] }
  const order = new Map(items.map((item, index) => [item.id, index]))
  const groups = unitsOf(items)
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
      `a group holds more than ${MAX_ITEMS} items: the same file, one group or the cap of ${cap} fixer workers`,
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

export type FixerPlan = { name: string; text: string }

function rowId(line: string): string | undefined {
  if (!line.trim().startsWith("|")) return undefined
  const id = cells(line)[0]
  return ITEM_ID.test(id) ? id : undefined
}

export function fixerPlans(plan: string, split: FixSplit): FixerPlan[] {
  const lines = plan.split("\n")
  const preamble = lines.slice(0, Math.max(0, lines.findIndex((line) => rowId(line) !== undefined)))
  return split.workers.map((worker) => ({
    name: `plan-${worker.id}.md`,
    text: `${[
      ...preamble,
      ...lines.filter((line) => worker.items.includes(rowId(line) ?? "")),
    ].join("\n")}\n`,
  }))
}
