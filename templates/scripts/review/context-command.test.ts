import { spawnSync } from "node:child_process"
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { envWithoutGit } from "../../../scripts/test-env.ts"

const REVIEW = join(import.meta.dirname, "..", "review.ts")

const FAKE_GH = `#!/usr/bin/env node
const args = process.argv.slice(2).join(" ")
if (args.startsWith("pr view")) {
  console.log(JSON.stringify({
    number: 7, title: "T", body: "", author: { login: "a" }, url: "https://x/7",
    baseRefName: "main", headRefName: "feat", headRefOid: process.env.FAKE_HEAD,
    closingIssuesReferences: [],
    mergeable: process.env.FAKE_MERGEABLE, mergeStateStatus: process.env.FAKE_STATE,
  }))
} else if (args.startsWith("repo view")) {
  console.log(JSON.stringify({ owner: { login: "o" }, name: "r" }))
} else if (args.startsWith("api user")) {
  console.log("me")
} else if (args.startsWith("api graphql")) {
  console.log(JSON.stringify({ data: { repository: { pullRequest: {
    reviewThreads: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [] },
    reviews: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [] },
    comments: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [] },
  } } } }))
} else {
  console.error("fake gh: " + args)
  process.exit(1)
}
`

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "context-"))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

function git(cwd: string, ...args: string[]): string {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", env: envWithoutGit() })
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`)
  return result.stdout.trim()
}

function setup(): { worktree: string; head: string; origin: string } {
  const origin = join(root, "origin.git")
  const worktree = join(root, "work")
  git(root, "init", "--bare", "--initial-branch=main", origin)
  git(root, "init", "--initial-branch=main", worktree)
  git(worktree, "config", "user.email", "t@example.com")
  git(worktree, "config", "user.name", "t")
  git(worktree, "remote", "add", "origin", origin)
  writeFileSync(join(worktree, "a.txt"), "a\n")
  git(worktree, "add", ".")
  git(worktree, "commit", "-m", "init")
  git(worktree, "push", "origin", "main")
  git(worktree, "checkout", "-b", "feat")
  writeFileSync(join(root, "gh"), FAKE_GH)
  chmodSync(join(root, "gh"), 0o755)
  return { worktree, head: git(worktree, "rev-parse", "HEAD"), origin }
}

function context(mergeable: string, state: string, options: { baseAhead?: number } = {}): string {
  const { worktree, head, origin } = setup()
  for (let n = 0; n < (options.baseAhead ?? 0); n++) {
    const other = join(root, `other-${n}`)
    git(root, "clone", "--branch", "main", origin, other)
    git(other, "config", "user.email", "t@example.com")
    git(other, "config", "user.name", "t")
    writeFileSync(join(other, `b${n}.txt`), "b\n")
    git(other, "add", ".")
    git(other, "commit", "-m", `base ${n}`)
    git(other, "push", "origin", "main")
  }
  const result = spawnSync(process.execPath, [REVIEW, "context", "--worktree", worktree], {
    encoding: "utf8",
    env: {
      ...envWithoutGit(),
      PATH: `${root}:${process.env.PATH}`,
      FAKE_HEAD: head,
      FAKE_MERGEABLE: mergeable,
      FAKE_STATE: state,
    },
  })
  if (result.status !== 0) throw new Error(result.stderr)
  return result.stdout
}

describe("review.ts context", () => {
  test("warns when the base has a commit the head lacks, with GitHub saying clean", () => {
    expect(context("MERGEABLE", "CLEAN", { baseAhead: 2 })).toContain(
      "Head behind base: the base has 2 commit(s)",
    )
  })

  test("warns when the PR is conflicting", () => {
    expect(context("CONFLICTING", "DIRTY")).toContain("Conflicting")
  })

  test("warns when GitHub says conflicting and gives no other merge state", () => {
    expect(context("CONFLICTING", "UNKNOWN")).toContain("Conflicting")
  })

  test("prints no warning for a clean PR", () => {
    expect(context("MERGEABLE", "CLEAN")).not.toContain("## Warnings")
  })

  test("trusts the local count, not a BEHIND state from GitHub", () => {
    expect(context("MERGEABLE", "BEHIND")).not.toContain("## Warnings")
  })
})
