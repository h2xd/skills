#!/usr/bin/env node
/**
 * Creates a git worktree, links the files of `worktreeLinks` from the main
 * checkout, and runs the commands of `worktreeSetup` in it.
 *
 *   node scripts/worktree.ts <path> [--branch NAME] [--base REF]
 *
 * Without --branch the worktree is detached at the base. With --branch, an
 * existing branch is checked out, and a new one starts at the base, HEAD when
 * --base is absent. Prints the path on stdout. A listed file that the main
 * checkout lacks is skipped, with a note on stderr. A failed setup command
 * removes the worktree. A failure prints one line to stderr and exits 1.
 * The logic lives in scripts/worktree/.
 */

import { resolve } from "node:path"
import { parseArgs } from "node:util"
import { config } from "./config.ts"
import { run } from "./review/shell.ts"
import { parseWorktreeList } from "./review/worktree.ts"
import { failStale, isUnknownOption } from "./stale.ts"
import { createWorktree } from "./worktree/create.ts"

const USAGE = "usage: node scripts/worktree.ts <path> [--branch NAME] [--base REF]"

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { branch: { type: "string" }, base: { type: "string" } },
  })
  if (positionals.length !== 1) throw new Error(USAGE)
  const path = resolve(positionals[0])
  const [{ path: mainWorktree }] = parseWorktreeList(
    run(["git", "worktree", "list", "--porcelain"]),
  )
  const { skipped } = createWorktree({
    mainWorktree,
    path,
    checkout:
      values.branch === undefined
        ? { kind: "detached", at: values.base ?? "HEAD" }
        : {
            kind: "branch",
            name: values.branch,
            whenNew: { base: values.base ?? "HEAD", track: false },
          },
    setup: config.worktreeSetup,
    links: config.worktreeLinks,
  })
  for (const note of skipped) console.error(`worktree: ${note}`)
  console.log(path)
} catch (error) {
  if (isUnknownOption(error)) failStale("worktree")
  console.error(`worktree: ${error instanceof Error ? error.message : error}`)
  process.exit(1)
}
