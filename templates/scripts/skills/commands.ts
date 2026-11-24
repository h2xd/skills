/** The subcommands of `node scripts/skills.ts`. Each takes its argv tail and does the I/O. */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { parseArgs } from "node:util"
import { config, REPO_ROOT } from "../config.ts"
import { formatPage, parsePage, type SkillRow, syncRows } from "./page.ts"

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

/** Writes the page when a row is missing or too many, and returns its rows. */
function syncedPage(date: string): Synced {
  const path = join(REPO_ROOT, config.skills.page)
  const existing = existsSync(path) ? readFileSync(path, "utf8") : null
  const rows = syncRows(
    existing === null ? [] : parsePage(existing),
    repoLocalSkills(),
    date,
    config.skills.reviewIntervalDays,
  )
  const text = formatPage(rows, date, existing)
  if (text !== existing) {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, text)
  }
  return { rows, created: existing === null }
}

export function dueCommand(argv: string[]): void {
  const { values } = parseArgs({ args: argv, options: { today: { type: "string" } } })
  const { rows, created } = syncedPage(today(values.today))
  if (created) console.log(`created ${config.skills.page} with ${rows.length} rows`)
}
