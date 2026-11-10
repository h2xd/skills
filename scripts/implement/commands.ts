/** The subcommands of `node scripts/implement.ts`. Each takes its argv tail and does the I/O. */

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { parseArgs } from "node:util"
import { config } from "../config.ts"
import { run, runAllowingFailure } from "../review/shell.ts"
import {
  findWorktreeForBranch,
  newWorktreePath,
  parseWorktreeList,
} from "../review/worktree.ts"
import { unlandedCommits } from "./landed.ts"
import { formatSplit, parseFileMap, planSplit } from "./split.ts"

const SPLIT_USAGE = "split <map.md> --criteria <count> [--out FILE]"
const WORKTREE_USAGE = "worktree <build worker id>"
const CLEANUP_USAGE = "cleanup <build worker id>"

function usage(text: string): Error {
  return new Error(`usage: node scripts/implement.ts ${text}`)
}

export function splitCommand(argv: string[]): void {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { criteria: { type: "string" }, out: { type: "string" } },
  })
  const mapFile = positionals[0]
  const criteriaCount = Number(values.criteria)
  if (!mapFile || !Number.isInteger(criteriaCount) || criteriaCount < 1) {
    throw usage(SPLIT_USAGE)
  }
  const split = planSplit(
    parseFileMap(readFileSync(mapFile, "utf8"), criteriaCount),
    config.implement,
  )
  const text = formatSplit(split)
  if (values.out) {
    writeFileSync(values.out, text)
    console.log(`${split.verdict}: wrote ${values.out}`)
  } else {
    process.stdout.write(text)
  }
}

function workerIdFrom(argv: string[], usageText: string): string {
  const { positionals } = parseArgs({ args: argv, allowPositionals: true })
  const id = positionals[0]
  if (!id || !/^\d+$/.test(id)) throw usage(usageText)
  return id
}

function ticketBranch(): string {
  const branch = run(["git", "branch", "--show-current"])
  if (branch === "") throw new Error("HEAD is detached, switch to the ticket branch")
  return branch
}

function branchExists(branch: string): boolean {
  return (
    runAllowingFailure(["git", "show-ref", "--verify", "--quiet", `refs/heads/${branch}`])
      .exitCode === 0
  )
}

function removeWorkerBranch(workerBranch: string): void {
  run(["git", "update-ref", "-d", `refs/heads/${workerBranch}`])
}

export function worktreeCommand(argv: string[]): void {
  const id = workerIdFrom(argv, WORKTREE_USAGE)
  const workerBranch = `${ticketBranch()}-w${id}`
  const [mainWorktree] = parseWorktreeList(
    run(["git", "worktree", "list", "--porcelain"]),
  )
  const path = newWorktreePath(mainWorktree.path, workerBranch)
  if (branchExists(workerBranch) || existsSync(path)) {
    throw new Error(
      `${workerBranch} or ${path} exists. Run \`node scripts/implement.ts cleanup ${id}\` first`,
    )
  }
  run(["git", "worktree", "add", "-b", workerBranch, path, "HEAD"])
  try {
    for (const command of config.worktreeSetup) run(command, path)
  } catch (error) {
    run(["git", "worktree", "remove", "--force", path])
    removeWorkerBranch(workerBranch)
    throw error
  }
  console.log(path)
}

export function cleanupCommand(argv: string[]): void {
  const id = workerIdFrom(argv, CLEANUP_USAGE)
  const branch = ticketBranch()
  const workerBranch = `${branch}-w${id}`
  const unlanded = unlandedCommits(run(["git", "cherry", branch, workerBranch]))
  if (unlanded.length > 0) {
    throw new Error(
      `${workerBranch} keeps its worktree, these commits are not on ${branch}: ${unlanded.join(", ")}`,
    )
  }
  const entry = findWorktreeForBranch(
    parseWorktreeList(run(["git", "worktree", "list", "--porcelain"])),
    workerBranch,
  )
  if (entry) run(["git", "worktree", "remove", entry.path])
  removeWorkerBranch(workerBranch)
  console.log(`removed ${workerBranch}`)
}
