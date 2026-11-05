/** Pure helpers behind `node scripts/review.ts worktree`. */

import { basename, dirname, join } from "node:path"

export type WorktreeEntry = {
  path: string
  /** Undefined for a detached HEAD. */
  branch?: string
}

const BRANCH_REFERENCE_PREFIX = "refs/heads/"

/** Parses `git worktree list --porcelain`. The first entry is the main worktree. */
export function parseWorktreeList(porcelain: string): WorktreeEntry[] {
  return porcelain
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block !== "")
    .map((block) => {
      const lines = block.split("\n")
      const path = lines
        .find((line) => line.startsWith("worktree "))
        ?.slice("worktree ".length)
      const reference = lines
        .find((line) => line.startsWith("branch "))
        ?.slice("branch ".length)
      if (!path) throw new Error(`worktree list entry without a path: ${block}`)
      return {
        path,
        branch: reference?.startsWith(BRANCH_REFERENCE_PREFIX)
          ? reference.slice(BRANCH_REFERENCE_PREFIX.length)
          : undefined,
      }
    })
}

export function findWorktreeForBranch(
  entries: WorktreeEntry[],
  branch: string,
): WorktreeEntry | undefined {
  return entries.find((entry) => entry.branch === branch)
}

/** Sibling of the main worktree: `<parent>/<repo name>.<branch, / as ->`. */
export function newWorktreePath(mainWorktree: string, branch: string): string {
  const name = `${basename(mainWorktree)}.${branch.replaceAll("/", "-")}`
  return join(dirname(mainWorktree), name)
}
