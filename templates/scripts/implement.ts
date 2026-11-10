#!/usr/bin/env node
/**
 * Mechanical steps of the code-implement skill, so each step is one command.
 *
 *   node scripts/implement.ts split <map.md> --criteria <count> [--out FILE]
 *   node scripts/implement.ts worktree <build worker id>
 *   node scripts/implement.ts cleanup <build worker id>
 *
 * `split` prints markdown on stdout, or writes it to the file given by --out.
 * `worktree` prints the path of the new worktree. `cleanup` removes the
 * worktree and branch of a build worker whose commits are on the ticket
 * branch, and refuses otherwise. A failure prints one line to
 * stderr and exits 1. The logic lives in scripts/implement/.
 */

import {
  cleanupCommand,
  splitCommand,
  worktreeCommand,
} from "./implement/commands.ts"

const COMMANDS: Record<string, (argv: string[]) => void> = {
  split: splitCommand,
  worktree: worktreeCommand,
  cleanup: cleanupCommand,
}

const [name, ...rest] = process.argv.slice(2)
const command = COMMANDS[name ?? ""]

if (!command) {
  console.error(
    `usage: node scripts/implement.ts <${Object.keys(COMMANDS).join("|")}> ...`,
  )
  process.exit(1)
}

try {
  command(rest)
} catch (error) {
  console.error(
    `implement ${name}: ${error instanceof Error ? error.message : error}`,
  )
  process.exit(1)
}
