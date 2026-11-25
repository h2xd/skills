#!/usr/bin/env node
/**
 * The facts and the drawings for the catchup skill. It only reads: it writes
 * no file and changes no git state.
 *
 *   node scripts/catchup.ts facts [--scope work|repo] [--base BRANCH] [--user EMAIL]
 *   node scripts/catchup.ts bar <label> <done> <total>
 *   node scripts/catchup.ts timeline <commit range>
 *   node scripts/catchup.ts handoff [--dir DIR]
 *
 * `facts` picks the work scope on a branch other than the default one, and the
 * repo scope on the default branch. --scope wins. In the repo scope, with the
 * default branch checked out and `origin/<default>` present, `ahead of remote:`
 * and `behind remote:` follow the `branch:` line, and a count of 0 has no
 * line. `bar` draws a progress bar, `timeline` draws the commits of a range
 * such as `main..feat/x`, and `handoff` prints the path of the newest handoff
 * document of this repo, or none. A failure prints one line to stderr and
 * exits 1. The logic lives in scripts/catchup/.
 */

import {
  barCommand,
  factsCommand,
  handoffCommand,
  timelineCommand,
} from "./catchup/commands.ts"
import { failStale, isUnknownOption, STALE_COPY } from "./stale.ts"

const COMMANDS: Record<string, (argv: string[]) => void> = {
  facts: factsCommand,
  bar: barCommand,
  timeline: timelineCommand,
  handoff: handoffCommand,
}

const [name, ...rest] = process.argv.slice(2)
const command = COMMANDS[name ?? ""]

if (!command) {
  console.error(
    `usage: node scripts/catchup.ts <${Object.keys(COMMANDS).join("|")}> ...`,
  )
  if (name !== undefined) console.error(`catchup: ${STALE_COPY}`)
  process.exit(1)
}

try {
  command(rest)
} catch (error) {
  if (isUnknownOption(error)) failStale("catchup")
  console.error(
    `catchup ${name}: ${error instanceof Error ? error.message : error}`,
  )
  process.exit(1)
}
