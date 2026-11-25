import type { Commit, WeekCount } from "./facts.ts"

const BAR_WIDTH = 20
const GRAPH_WIDTH = 20

export function progressBar(label: string, done: number, total: number): string {
  if (!Number.isInteger(total) || total < 1) throw new Error(`total must be an integer of 1 or more, got ${total}`)
  if (!Number.isInteger(done) || done < 0 || done > total) {
    throw new Error(`done must be an integer from 0 to ${total}, got ${done}`)
  }
  const filled = Math.floor((BAR_WIDTH * done) / total)
  const percent = Math.floor((100 * done) / total)
  return `${label} [${"#".repeat(filled)}${"-".repeat(BAR_WIDTH - filled)}] ${done}/${total} ${percent}%`
}

export function weekGraph(weeks: WeekCount[]): string {
  const busiest = Math.max(0, ...weeks.map((week) => week.count))
  return weeks
    .map(({ week, count }) => {
      const marks = count === 0 ? 0 : Math.max(1, Math.round((count / busiest) * GRAPH_WIDTH))
      return `${week} | ${"#".repeat(marks)} ${count}`
    })
    .join("\n")
}

export function timeline(commits: Pick<Commit, "hash" | "date" | "subject">[]): string {
  return commits
    .toReversed()
    .toSorted((a, b) => a.date.localeCompare(b.date))
    .map((commit) => `o ${commit.date} ${commit.hash} ${commit.subject}`)
    .join("\n|\n")
}
