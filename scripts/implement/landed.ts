/** Pure checks behind `node scripts/implement.ts worktree` and `cleanup`. */

import type { WorktreeEntry } from "../review/worktree.ts"

export function workerBranchName(ticketBranch: string, id: string): string {
  return `${ticketBranch}-w${id}`
}

/**
 * The commits that `git cherry` marks with `+`: on the worker branch, not on the ticket branch.
 * A `+` commit still counts as landed when the ticket log names it in a `cherry-pick -x` trailer.
 */
export function unlandedCommits(
  cherryOutput: string,
  ticketLog: string,
): string[] {
  return cherryOutput
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("+"))
    .map((line) => line.slice(1).trim())
    .filter((sha) => !ticketLog.includes(`(cherry picked from commit ${sha})`))
}

export type WorktreeFacts = {
  id: string
  workerBranch: string
  path: string
  branchExists: boolean
  pathExists: boolean
  worktrees: WorktreeEntry[]
}

export function worktreeBlocker(facts: WorktreeFacts): string | undefined {
  const { id, workerBranch, path } = facts
  const registered = facts.worktrees.some((entry) => entry.path === path)
  if (facts.branchExists || registered) {
    return `${workerBranch} or ${path} exists. Run \`node scripts/implement.ts cleanup ${id}\` first`
  }
  if (facts.pathExists) {
    return `${path} exists and is not a worktree of ${workerBranch}. Remove the folder.`
  }
  return undefined
}

export type CleanupPlan =
  | { kind: "refuse"; message: string }
  | { kind: "go"; checkLanded: boolean; removeWorktree?: string }

export function planCleanup(
  facts: Pick<WorktreeFacts, "workerBranch" | "path" | "branchExists" | "worktrees">,
): CleanupPlan {
  const { workerBranch, path } = facts
  const atPath = facts.worktrees.find((entry) => entry.path === path)
  if (atPath && atPath.branch !== workerBranch) {
    return {
      kind: "refuse",
      message: `${path} is not on ${workerBranch}, check it by hand`,
    }
  }
  if (atPath && !facts.branchExists) {
    return {
      kind: "refuse",
      message: `${path} has no branch ${workerBranch}, check it and run git worktree remove --force ${path}`,
    }
  }
  const onBranch = facts.worktrees.find((entry) => entry.branch === workerBranch)
  return {
    kind: "go",
    checkLanded: facts.branchExists,
    removeWorktree: (onBranch ?? atPath)?.path,
  }
}

export function uncommittedBlocker(
  path: string,
  statusPorcelain: string,
): string | undefined {
  const files = statusPorcelain
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
  if (files.length === 0) return undefined
  return `${path} has files that are not committed: ${files.join(", ")}. Check them, then run git worktree remove --force ${path}`
}
