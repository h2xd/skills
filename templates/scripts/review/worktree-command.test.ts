import { spawnSync } from "node:child_process"
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { envWithoutGit } from "../../../scripts/test-env.ts"

const SCRIPTS = join(import.meta.dirname, "..")
const BRANCH = "feat/7-thing"
const sandboxes: string[] = []

afterEach(() => {
  for (const dir of sandboxes.splice(0)) rmSync(dir, { recursive: true, force: true })
})

type Result = { status: number; stdout: string; stderr: string }

type Repo = {
  dir: string
  git(...args: string[]): string
  review(...args: string[]): Result
}

function exec(file: string, args: string[], cwd: string): Result {
  const result = spawnSync(file, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...envWithoutGit(),
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_SYSTEM: "/dev/null",
      GIT_CONFIG_NOSYSTEM: "1",
    },
  })
  if (result.error) throw result.error
  return {
    status: result.status ?? 128,
    stdout: result.stdout.trimEnd(),
    stderr: result.stderr.trimEnd(),
  }
}

function sandbox(config: object): Repo {
  const parent = realpathSync(mkdtempSync(join(tmpdir(), "review-worktree-")))
  sandboxes.push(parent)
  const origin = join(parent, "origin.git")
  const dir = join(parent, "repo")
  mkdirSync(dir)
  const git = (...args: string[]) => {
    const result = exec("git", args, dir)
    if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`)
    return result.stdout
  }
  git("init", "--bare", "--initial-branch=main", origin)
  git("init", "--initial-branch=main")
  git("config", "user.name", "Test")
  git("config", "user.email", "test@example.com")
  git("config", "commit.gpgsign", "false")
  cpSync(SCRIPTS, join(dir, "scripts"), {
    recursive: true,
    filter: (source) => !source.endsWith(".test.ts"),
  })
  writeFileSync(join(dir, "package.json"), '{"type":"module"}\n')
  writeFileSync(join(dir, "agents.config.json"), `${JSON.stringify(config)}\n`)
  git("add", ".")
  git("commit", "-m", "base")
  git("remote", "add", "origin", origin)
  git("push", "origin", "main")
  git("checkout", "-b", BRANCH)
  writeFileSync(join(dir, "change.txt"), "change\n")
  git("add", "change.txt")
  git("commit", "-m", "change")
  git("push", "origin", BRANCH)
  git("checkout", "main")
  git("branch", "-D", BRANCH)
  return {
    dir,
    git,
    review: (...args) => exec(process.execPath, ["scripts/review.ts", ...args], dir),
  }
}

describe("review.ts worktree", () => {
  test("links the files of worktreeLinks into the review worktree", () => {
    const repo = sandbox({ worktreeSetup: [], worktreeLinks: [".env.local"] })
    writeFileSync(join(repo.dir, ".env.local"), "SECRET=1\n")

    const result = repo.review("worktree", BRANCH)

    expect(result.status).toBe(0)
    expect(readFileSync(join(result.stdout, "change.txt"), "utf8")).toBe("change\n")
    expect(readFileSync(join(result.stdout, ".env.local"), "utf8")).toBe("SECRET=1\n")
  })

  test("says which file of worktreeLinks it skipped and still prints the path", () => {
    const repo = sandbox({ worktreeSetup: [], worktreeLinks: ["missing.cfg"] })

    const result = repo.review("worktree", BRANCH)

    expect(result.status).toBe(0)
    expect(readFileSync(join(result.stdout, "change.txt"), "utf8")).toBe("change\n")
    expect(result.stderr).toContain("review: skipped missing.cfg: the main checkout has no such file")
  })

  test("the review branch tracks its remote branch when git sets up no tracking by default", () => {
    const repo = sandbox({ worktreeSetup: [] })
    repo.git("config", "branch.autoSetupMerge", "false")

    const result = repo.review("worktree", BRANCH)

    expect(result.status).toBe(0)
    expect(
      repo.git("-C", result.stdout, "rev-parse", "--abbrev-ref", `${BRANCH}@{upstream}`),
    ).toBe(`origin/${BRANCH}`)
  })
})
