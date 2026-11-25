import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { parseArgs } from "node:util"
import { config, REPO_ROOT } from "../config.ts"
import {
  dueSkills,
  formatPage,
  markReviewed,
  parsePage,
  readLastRun,
  setLastRun,
  type SkillRow,
  syncRows,
} from "./page.ts"

const SKILL_FOLDERS = ".claude/skills"
const DATE = /^\d{4}-\d{2}-\d{2}$/

function today(argument: string | undefined): string {
  if (argument === undefined) return new Date().toISOString().slice(0, 10)
  if (!DATE.test(argument)) throw new Error(`--today needs YYYY-MM-DD, got ${argument}`)
  return argument
}

function repoLocalSkills(): string[] {
  const folder = join(REPO_ROOT, SKILL_FOLDERS)
  if (!existsSync(folder)) return []
  return readdirSync(folder).filter((name) => existsSync(join(folder, name, "SKILL.md")))
}

type Synced = { rows: SkillRow[]; created: boolean; lastRun: string | null }

function pagePath(): string {
  return join(REPO_ROOT, config.skills.page)
}

function writePage(text: string, existing: string | null): void {
  if (text === existing) return
  mkdirSync(dirname(pagePath()), { recursive: true })
  writeFileSync(pagePath(), text)
}

function syncPage(date: string, recordRun: boolean): Synced {
  const existing = existsSync(pagePath()) ? readFileSync(pagePath(), "utf8") : null
  const rows = syncRows(
    existing === null ? [] : parsePage(existing),
    repoLocalSkills(),
    date,
    config.skills.reviewIntervalDays,
  )
  const text = formatPage(rows, date, existing)
  writePage(recordRun ? setLastRun(text, date) : text, existing)
  return { rows, created: existing === null, lastRun: readLastRun(existing) }
}

export function dueCommand(argv: string[]): void {
  const { values } = parseArgs({ args: argv, options: { today: { type: "string" } } })
  const date = today(values.today)
  const { rows, created, lastRun } = syncPage(date, true)
  if (created) console.log(`created ${config.skills.page} with ${rows.length} rows`)
  console.log(`last run: ${lastRun ?? "none"}`)
  const due = dueSkills(rows, date)
  console.log([`${due.length} due`, ...due.map((row) => `${row.skill} ${row.due}`)].join("\n"))
}

const REVIEWED_USAGE = "usage: node scripts/skills.ts reviewed <skill>"

export function reviewedCommand(argv: string[]): void {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { today: { type: "string" } },
  })
  const [skill] = positionals
  if (!skill || positionals.length > 1) throw new Error(REVIEWED_USAGE)
  if (!repoLocalSkills().includes(skill)) {
    throw new Error(`${skill} is not a repo-local skill`)
  }
  const date = today(values.today)
  const { rows } = syncPage(date, false)
  const marked = markReviewed(
    rows,
    skill,
    date,
    config.skills.reviewIntervalDays,
  )
  const existing = readFileSync(pagePath(), "utf8")
  writePage(formatPage(marked, date, existing), existing)
  console.log(`reviewed ${skill}, next review ${marked.find((row) => row.skill === skill)?.due}`)
}
