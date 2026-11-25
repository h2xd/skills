import { existsSync, lstatSync, mkdirSync, symlinkSync } from "node:fs"
import { dirname, isAbsolute, join, normalize } from "node:path"
import { run, runAllowingFailure } from "../review/shell.ts"

export type Checkout =
  | { kind: "detached"; at: string }
  | { kind: "branch"; name: string; whenNew: { base: string; track: boolean } }

export type WorktreeRequest = {
  mainWorktree: string
  path: string
  checkout: Checkout
  setup: string[][]
  links: string[]
}

export type WorktreeResult = {
  skipped: string[]
  branchExisted: boolean
}

function branchExists(mainWorktree: string, branch: string): boolean {
  return (
    runAllowingFailure(
      ["git", "show-ref", "--verify", "--quiet", `refs/heads/${branch}`],
      mainWorktree,
    ).exitCode === 0
  )
}

function addArguments(path: string, checkout: Checkout, isNewBranch: boolean): string[] {
  if (checkout.kind === "detached") return ["--detach", path, checkout.at]
  if (!isNewBranch) return [path, checkout.name]
  const { base, track } = checkout.whenNew
  return [...(track ? ["--track"] : []), "-b", checkout.name, path, base]
}

function checkedLink(link: string): string {
  if (isAbsolute(link) || normalize(link).startsWith("..")) {
    throw new Error(`worktreeLinks entry ${link} must stay inside the repo`)
  }
  return normalize(link)
}

function skipReason(source: string, target: string, link: string): string | null {
  if (!existsSync(source)) return `skipped ${link}: the main checkout has no such file`
  if (existsSync(target) || isLink(target)) {
    return `skipped ${link}: the worktree already has it`
  }
  return null
}

function linkFiles(mainWorktree: string, path: string, links: string[]): string[] {
  const skipped: string[] = []
  for (const link of links) {
    const source = join(mainWorktree, link)
    const target = join(path, link)
    const reason = skipReason(source, target, link)
    if (reason !== null) {
      skipped.push(reason)
      continue
    }
    mkdirSync(dirname(target), { recursive: true })
    symlinkSync(source, target)
  }
  return skipped
}

function isLink(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink()
  } catch {
    return false
  }
}

export function createWorktree(request: WorktreeRequest): WorktreeResult {
  const { mainWorktree, path, checkout } = request
  const links = request.links.map(checkedLink)
  const branchExisted = checkout.kind === "branch" && branchExists(mainWorktree, checkout.name)
  const newBranch = checkout.kind === "branch" && !branchExisted ? checkout.name : null
  run(["git", "worktree", "add", ...addArguments(path, checkout, newBranch !== null)])
  try {
    const skipped = linkFiles(mainWorktree, path, links)
    for (const command of request.setup) run(command, path)
    return { skipped, branchExisted }
  } catch (error) {
    run(["git", "worktree", "remove", "--force", path], mainWorktree)
    if (newBranch !== null) {
      run(["git", "update-ref", "-d", `refs/heads/${newBranch}`], mainWorktree)
    }
    throw error
  }
}
