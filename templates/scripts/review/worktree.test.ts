import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import {
  findWorktreeForBranch,
  newWorktreePath,
  parseWorktreeList,
} from "./worktree.ts"

const PORCELAIN = `worktree /Users/me/projects/snack-drawer
HEAD 1111111
branch refs/heads/main

worktree /Users/me/projects/snack-drawer/.claude/worktrees/fix
HEAD 2222222
branch refs/heads/worktree-fix

worktree /Users/me/projects/snack-drawer.detached
HEAD 3333333
detached
`

describe("parseWorktreeList", () => {
  test("reads path and branch, main worktree first", () => {
    const entries = parseWorktreeList(PORCELAIN)
    expect(entries).toEqual([
      { path: "/Users/me/projects/snack-drawer", branch: "main" },
      {
        path: "/Users/me/projects/snack-drawer/.claude/worktrees/fix",
        branch: "worktree-fix",
      },
      { path: "/Users/me/projects/snack-drawer.detached", branch: undefined },
    ])
  })
})

describe("findWorktreeForBranch", () => {
  test("matches a branch, including one with a slash", () => {
    const entries = [
      { path: "/a", branch: "chore/x" },
      { path: "/b", branch: "main" },
    ]
    expect(findWorktreeForBranch(entries, "chore/x")?.path).toBe("/a")
    expect(findWorktreeForBranch(entries, "other")).toBeUndefined()
  })
})

describe("newWorktreePath", () => {
  test("places a sibling of the main worktree and flattens slashes", () => {
    expect(newWorktreePath("/Users/me/projects/snack-drawer", "fix/95-env")).toBe(
      "/Users/me/projects/snack-drawer.fix-95-env",
    )
  })
})
