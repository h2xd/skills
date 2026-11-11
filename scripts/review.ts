#!/usr/bin/env node
/**
 * Mechanical steps of the review-pr and review-fix skills, so each step is one
 * command.
 *
 *   node scripts/review.ts worktree <branch>
 *   node scripts/review.ts context [pr] [--worktree PATH] [--out FILE]
 *   node scripts/review.ts threads [pr] [--worktree PATH] [--out FILE]
 *   node scripts/review.ts reply <pr> <replies.md> --sha SHA --threads <threads.md> [--dry-run]
 *   node scripts/review.ts resolve [--threads <threads.md>] <thread-id or T label>...
 *   node scripts/review.ts options --validate <review.json>
 *   node scripts/review.ts findings --validate <findings.json>
 *   node scripts/review.ts merge <findings.json>... --out review.json [--pr N] [--worktree PATH] [--pick pick.md] [--bullets FILE] [--preview FILE]
 *   node scripts/review.ts fleet --base <branch> [--worktree PATH] [--one-way-door] [--out FILE]
 *
 * Output is markdown on stdout, or in the file given by --out. A failure prints
 * one line to stderr and exits 1. The logic lives in scripts/review/.
 */

import {
  contextCommand,
  findingsCommand,
  fleetCommand,
  mergeCommand,
  optionsCommand,
  replyCommand,
  resolveCommand,
  threadsCommand,
  worktreeCommand,
} from "./review/commands.ts"

const COMMANDS: Record<string, (argv: string[]) => void> = {
  worktree: worktreeCommand,
  context: contextCommand,
  threads: threadsCommand,
  reply: replyCommand,
  resolve: resolveCommand,
  options: optionsCommand,
  findings: findingsCommand,
  merge: mergeCommand,
  fleet: fleetCommand,
}

const [name, ...rest] = process.argv.slice(2)
const command = COMMANDS[name ?? ""]

if (!command) {
  console.error(
    `usage: node scripts/review.ts <${Object.keys(COMMANDS).join("|")}> ...`,
  )
  process.exit(1)
}

try {
  command(rest)
} catch (error) {
  console.error(
    `review ${name}: ${error instanceof Error ? error.message : error}`,
  )
  process.exit(1)
}
