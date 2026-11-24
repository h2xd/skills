/** Pure helpers behind `node scripts/catchup.ts`: the facts that git output holds. */

export type Commit = {
  hash: string
  /** YYYY-MM-DD. */
  date: string
  author: string
  email: string
  subject: string
}

export type WeekCount = {
  /** The Monday of the week, as YYYY-MM-DD. */
  week: string
  count: number
}

export const LOG_FORMAT = "%h%x09%ad%x09%an%x09%ae%x09%s"

const DAY_MS = 24 * 60 * 60 * 1000

/** Reads `git log --date=short --format=LOG_FORMAT`. */
export function parseLog(text: string): Commit[] {
  return text
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => {
      const [hash, date, author, email, ...subject] = line.split("\t")
      return { hash, date, author, email, subject: subject.join("\t") }
    })
}

export function weekStart(date: string): string {
  const day = new Date(`${date}T00:00:00Z`)
  const sinceMonday = (day.getUTCDay() + 6) % 7
  return new Date(day.getTime() - sinceMonday * DAY_MS).toISOString().slice(0, 10)
}

/** One entry for each week from the first commit to the last, so a quiet week shows as 0. */
export function commitsPerWeek(dates: string[]): WeekCount[] {
  if (dates.length === 0) return []
  const counts = new Map<string, number>()
  for (const date of dates) counts.set(weekStart(date), (counts.get(weekStart(date)) ?? 0) + 1)
  const weeks = [...counts.keys()].sort()
  const result: WeekCount[] = []
  for (
    let week = weeks[0];
    week <= weeks[weeks.length - 1];
    week = new Date(new Date(`${week}T00:00:00Z`).getTime() + 7 * DAY_MS).toISOString().slice(0, 10)
  ) {
    result.push({ week, count: counts.get(week) ?? 0 })
  }
  return result
}

/** The ticket number of a branch such as `feat/116-name`, or null. */
export function branchTicket(branch: string): string | null {
  return branch.match(/\/(\d+)-/)?.[1] ?? null
}

/** Tracked files per top-level folder, folders by name and the root files last. */
export function topLevelCounts(files: string[]): { name: string; files: number }[] {
  const counts = new Map<string, number>()
  for (const file of files) {
    const name = file.includes("/") ? `${file.split("/")[0]}/` : "(root)"
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts]
    .map(([name, count]) => ({ name, files: count }))
    .sort((a, b) => (a.name === "(root)" ? 1 : b.name === "(root)" ? -1 : a.name.localeCompare(b.name)))
}

/** The file name with the newest stamp among `handoff-<repo>-<YYYYMMDD-HHMM>.md`, or null. */
export function newestHandoff(names: string[], repo: string): string | null {
  const escaped = repo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const pattern = new RegExp(`^handoff-${escaped}-(\\d{8}-\\d{4})\\.md$`)
  const stamped = names.flatMap((name) => {
    const stamp = name.match(pattern)?.[1]
    return stamp ? [{ name, stamp }] : []
  })
  return stamped.sort((a, b) => b.stamp.localeCompare(a.stamp))[0]?.name ?? null
}
