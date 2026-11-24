/** Creates a worktree for `node scripts/worktree.ts`, the review script and the implement script. */

import { existsSync, lstatSync, mkdirSync, symlinkSync } from "node:fs"
import { dirname, isAbsolute, join, normalize } from "node:path"
import { run, runAllowingFailure } from "../review/shell.ts"

export type WorktreeRequest = {
  /** The main checkout. Git commands run there, and the linked files come from it. */
  mainWorktree: string
  /** Where the worktree goes. */
  path: string
  /** The branch to check out. A branch that does not exist starts at `base`. Detached when absent. */
  branch?: string
  /** A ref or sha. HEAD when absent. */
  base?: string
  /** Set up the new branch to track `base`, a remote branch. */
  track?: boolean
  /** Commands to run in the new worktree, each as argv, after the files are linked. */
  setup: string[][]
  /** Repo-relative paths of files to link from the main checkout. */
  links: string[]
}

export type WorktreeResult = {
  /** One line per listed file that was not linked, with the reason. */
  skipped: string[]
}

function branchExists(mainWorktree: string, branch: string): boolean {
  return (
    runAllowingFailure(
      ["git", "show-ref", "--verify", "--quiet", `refs/heads/${branch}`],
      mainWorktree,
    ).exitCode === 0
  )
}

function addArguments(request: WorktreeRequest, newBranch: boolean): string[] {
  const { path, branch, base = "HEAD" } = request
  if (!branch) return ["--detach", path, base]
  if (!newBranch) return [path, branch]
  return [...(request.track ? ["--track"] : []), "-b", branch, path, base]
}

function checkedLink(link: string): string {
  if (isAbsolute(link) || normalize(link).startsWith("..")) {
    throw new Error(`worktreeLinks entry ${link} must stay inside the repo`)
  }
  return normalize(link)
}

/** Links one file. Returns why it was skipped, or null when it is linked. */
function linkFile(mainWorktree: string, path: string, link: string): string | null {
  const source = join(mainWorktree, link)
  const target = join(path, link)
  if (!existsSync(source)) return `skipped ${link}: the main checkout has no such file`
  if (existsSync(target) || isLink(target)) {
    return `skipped ${link}: the worktree already has it`
  }
  mkdirSync(dirname(target), { recursive: true })
  symlinkSync(source, target)
  return null
}

function isLink(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink()
  } catch {
    return false
  }
}

/**
 * Creates the worktree, links the listed files, then runs the setup commands.
 * A failure removes the half-made worktree, and the branch when this call made
 * it, so the next run starts clean.
 */
export function createWorktree(request: WorktreeRequest): WorktreeResult {
  const { mainWorktree, path, branch } = request
  const links = request.links.map(checkedLink)
  const newBranch = branch !== undefined && !branchExists(mainWorktree, branch)
  run(["git", "worktree", "add", ...addArguments(request, newBranch)], mainWorktree)
  try {
    const skipped = links.flatMap((link) => linkFile(mainWorktree, path, link) ?? [])
    for (const command of request.setup) run(command, path)
    return { skipped }
  } catch (error) {
    run(["git", "worktree", "remove", "--force", path], mainWorktree)
    if (newBranch) run(["git", "update-ref", "-d", `refs/heads/${branch}`], mainWorktree)
    throw error
  }
}
