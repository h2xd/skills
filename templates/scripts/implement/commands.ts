/** The subcommands of `node scripts/implement.ts`. Each takes its argv tail and does the I/O. */

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { parseArgs } from "node:util"
import { config } from "../config.ts"
import { run, runAllowingFailure } from "../review/shell.ts"
import {
  newWorktreePath,
  parseWorktreeList,
  type WorktreeEntry,
} from "../review/worktree.ts"
import {
  planCleanup,
  uncommittedBlocker,
  unlandedCommits,
  workerBranchName,
  worktreeBlocker,
} from "./landed.ts"
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

function workerBranchFor(id: string): string {
  return workerBranchName(ticketBranch(), id)
}

function worktreeEntries(): WorktreeEntry[] {
  return parseWorktreeList(run(["git", "worktree", "list", "--porcelain"]))
}

export function worktreeCommand(argv: string[]): void {
  const id = workerIdFrom(argv, WORKTREE_USAGE)
  const workerBranch = workerBranchFor(id)
  const worktrees = worktreeEntries()
  const path = newWorktreePath(worktrees[0].path, workerBranch)
  const blocker = worktreeBlocker({
    id,
    workerBranch,
    path,
    branchExists: branchExists(workerBranch),
    pathExists: existsSync(path),
    worktrees,
  })
  if (blocker) throw new Error(blocker)
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
  const workerBranch = workerBranchName(branch, id)
  const worktrees = worktreeEntries()
  const exists = branchExists(workerBranch)
  const plan = planCleanup({
    workerBranch,
    path: newWorktreePath(worktrees[0].path, workerBranch),
    branchExists: exists,
    worktrees,
  })
  if (plan.kind === "refuse") throw new Error(plan.message)
  if (plan.checkLanded) {
    const unlanded = unlandedCommits(
      run(["git", "cherry", branch, workerBranch]),
      run(["git", "log", "--format=%B", `${workerBranch}..${branch}`]),
    )
    if (unlanded.length > 0) {
      throw new Error(
        `${workerBranch} keeps its worktree, these commits are not on ${branch}: ${unlanded.join(", ")}`,
      )
    }
  }
  if (plan.removeWorktree) {
    const blocker = uncommittedBlocker(
      plan.removeWorktree,
      run(["git", "-C", plan.removeWorktree, "status", "--porcelain"]),
    )
    if (blocker) throw new Error(blocker)
    run(["git", "worktree", "remove", plan.removeWorktree])
  }
  if (exists) removeWorkerBranch(workerBranch)
  console.log(
    plan.removeWorktree || exists
      ? `removed ${workerBranch}`
      : `nothing to remove for ${workerBranch}`,
  )
}
