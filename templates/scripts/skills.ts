#!/usr/bin/env node
/**
 * Keeps the Skills page, one row per repo-local skill, for h2xd:session-reflect.
 *
 *   node scripts/skills.ts due [--record-run] [--today YYYY-MM-DD]
 *   node scripts/skills.ts reviewed <skill> [--today YYYY-MM-DD]
 *
 * `due` creates the page when it is missing, adds a row for each new
 * repo-local skill and lists the skills whose review is due, oldest first.
 * It prints `last run: <date>`, or `last run: none`, before the count. That is
 * the date of the last `due --record-run`, kept as a `Last run:` line above
 * the table. Plain `due` writes no date there. `due --record-run` writes
 * today's date, prints `recorded last run: <date>` and lists no skill.
 * `reviewed` sets the review date of one skill to today and its due date one
 * interval later. Run it only after h2xd:review-skills ran on that skill. A
 * failure prints one line to stderr and exits 1. The logic lives in
 * scripts/skills/.
 */

import { dueCommand, reviewedCommand } from "./skills/commands.ts"
import { failStale, isUnknownOption, STALE_COPY } from "./stale.ts"

const COMMANDS: Record<string, (argv: string[]) => void> = {
  due: dueCommand,
  reviewed: reviewedCommand,
}

const [name, ...rest] = process.argv.slice(2)
const command = COMMANDS[name ?? ""]

if (!command) {
  console.error(
    `usage: node scripts/skills.ts <${Object.keys(COMMANDS).join("|")}> ...`,
  )
  if (name !== undefined) console.error(`skills: ${STALE_COPY}`)
  process.exit(1)
}

try {
  command(rest)
} catch (error) {
  if (isUnknownOption(error)) failStale("skills")
  console.error(
    `skills ${name}: ${error instanceof Error ? error.message : error}`,
  )
  process.exit(1)
}
