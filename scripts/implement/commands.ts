/** The subcommands of `node scripts/implement.ts`. Each takes its argv tail and does the I/O. */

import { readFileSync, writeFileSync } from "node:fs"
import { parseArgs } from "node:util"
import { config } from "../config.ts"
import { run } from "../review/shell.ts"
import { newWorktreePath, parseWorktreeList } from "../review/worktree.ts"
import { formatSplit, parseFileMap, planSplit } from "./split.ts"

const SPLIT_USAGE = "split <map.md> --criteria <count> [--out FILE]"
const WORKTREE_USAGE = "worktree <build worker id>"

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

/**
 * Creates the worktree of one build worker on a new branch, `<branch>-w<id>`,
 * from the current HEAD, and prints its path.
 */
export function worktreeCommand(argv: string[]): void {
  const { positionals } = parseArgs({ args: argv, allowPositionals: true })
  const id = positionals[0]
  if (!id || !/^\d+$/.test(id)) throw usage(WORKTREE_USAGE)
  const branch = run(["git", "branch", "--show-current"])
  if (branch === "") throw new Error("HEAD is detached, switch to the ticket branch")
  const workerBranch = `${branch}-w${id}`
  const [mainWorktree] = parseWorktreeList(
    run(["git", "worktree", "list", "--porcelain"]),
  )
  const path = newWorktreePath(mainWorktree.path, workerBranch)
  run(["git", "worktree", "add", "-b", workerBranch, path, "HEAD"])
  for (const command of config.worktreeSetup) run(command, path)
  console.log(path)
}
