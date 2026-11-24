/** The subcommands of `node scripts/skills.ts`. Each takes its argv tail and does the I/O. */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { parseArgs } from "node:util"
import { config, REPO_ROOT } from "../config.ts"
import {
  dueSkills,
  formatPage,
  markReviewed,
  parsePage,
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

/** Linked skill folders count: a folder is a skill when it holds a SKILL.md. */
function repoLocalSkills(): string[] {
  const folder = join(REPO_ROOT, SKILL_FOLDERS)
  if (!existsSync(folder)) return []
  return readdirSync(folder).filter((name) => existsSync(join(folder, name, "SKILL.md")))
}

type Synced = { rows: SkillRow[]; created: boolean }

function pagePath(): string {
  return join(REPO_ROOT, config.skills.page)
}

function writePage(rows: SkillRow[], date: string, existing: string | null): void {
  const text = formatPage(rows, date, existing)
  if (text === existing) return
  mkdirSync(dirname(pagePath()), { recursive: true })
  writeFileSync(pagePath(), text)
}

/** Writes the page when a row is missing or too many, and returns its rows. */
function syncedPage(date: string): Synced {
  const existing = existsSync(pagePath()) ? readFileSync(pagePath(), "utf8") : null
  const rows = syncRows(
    existing === null ? [] : parsePage(existing),
    repoLocalSkills(),
    date,
    config.skills.reviewIntervalDays,
  )
  writePage(rows, date, existing)
  return { rows, created: existing === null }
}

export function dueCommand(argv: string[]): void {
  const { values } = parseArgs({ args: argv, options: { today: { type: "string" } } })
  const date = today(values.today)
  const { rows, created } = syncedPage(date)
  if (created) console.log(`created ${config.skills.page} with ${rows.length} rows`)
  const due = dueSkills(rows, date)
  console.log([`${due.length} due`, ...due.map((row) => `${row.skill} ${row.due}`)].join("\n"))
}

const REVIEWED_USAGE = "usage: node scripts/skills.ts reviewed <skill> [--technology NAME]"

export function reviewedCommand(argv: string[]): void {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { today: { type: "string" }, technology: { type: "string" } },
  })
  const [skill] = positionals
  if (!skill || positionals.length > 1) throw new Error(REVIEWED_USAGE)
  if (!repoLocalSkills().includes(skill)) {
    throw new Error(`${skill} is not a repo-local skill`)
  }
  const date = today(values.today)
  const { rows } = syncedPage(date)
  const marked = markReviewed(
    rows,
    skill,
    date,
    config.skills.reviewIntervalDays,
    values.technology,
  )
  writePage(marked, date, readFileSync(pagePath(), "utf8"))
  console.log(`reviewed ${skill}, next review ${marked.find((row) => row.skill === skill)?.due}`)
}
