import { spawnSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"

const SCRIPTS = join(import.meta.dirname, "..")
const TICKET = "feat/1-x"
const GIT_LOCATION_VARIABLES = [
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_COMMON_DIR",
  "GIT_OBJECT_DIRECTORY",
]
const GIT_ENV = {
  ...Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !GIT_LOCATION_VARIABLES.includes(name)),
  ),
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_EDITOR: "true",
}

type Result = { status: number; stdout: string; stderr: string }

function exec(file: string, args: string[], cwd: string): Result {
  const result = spawnSync(file, args, { cwd, encoding: "utf8", env: GIT_ENV })
  if (result.error) throw result.error
  return {
    status: result.status ?? 1,
    stdout: result.stdout.trimEnd(),
    stderr: result.stderr.trimEnd(),
  }
}

function git(cwd: string, ...args: string[]): string {
  const result = exec("git", args, cwd)
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`)
  }
  return result.stdout
}

const worktreeParents: string[] = []

afterEach(() => {
  for (const parent of worktreeParents.splice(0)) {
    rmSync(parent, { recursive: true, force: true })
  }
})

function copyScriptsWithoutWorktreeSetup(parent: string): string {
  const configRoot = join(parent, "tool")
  mkdirSync(configRoot)
  cpSync(SCRIPTS, join(configRoot, "scripts"), { recursive: true })
  writeFileSync(join(configRoot, "package.json"), '{"type":"module"}\n')
  writeFileSync(join(configRoot, "agents.config.json"), '{"worktreeSetup":[]}\n')
  return join(configRoot, "scripts", "implement.ts")
}

function setup() {
  const parent = realpathSync(mkdtempSync(join(tmpdir(), "implement-")))
  worktreeParents.push(parent)
  const cli = copyScriptsWithoutWorktreeSetup(parent)
  const repo = join(parent, "repo")
  mkdirSync(repo)
  git(repo, "init", "-b", "main")
  git(repo, "config", "user.name", "Test")
  git(repo, "config", "user.email", "test@example.com")
  git(repo, "config", "commit.gpgsign", "false")
  writeFileSync(join(repo, "base.txt"), "base\n")
  git(repo, "add", ".")
  git(repo, "commit", "-m", "base")
  git(repo, "checkout", "-b", TICKET)

  const implement = (...args: string[]) =>
    exec(process.execPath, [cli, ...args], repo)
  const worktree = (id: string): string => {
    const result = implement("worktree", id)
    expect(result.status).toBe(0)
    return result.stdout
  }
  const commit = (cwd: string, file: string, text: string, message: string) => {
    writeFileSync(join(cwd, file), text)
    git(cwd, "add", file)
    git(cwd, "commit", "-m", message)
  }
  const branches = () => git(repo, "branch", "--format=%(refname:short)").split("\n")
  return { parent, repo, implement, worktree, commit, branches }
}

describe("implement worktree and cleanup on a real git repo", () => {
  test("two build workers land with cherry-pick -x and cleanup removes both", () => {
    const { repo, implement, worktree, commit, branches } = setup()
    const one = worktree("1")
    const two = worktree("2")
    commit(one, "a.txt", "a\n", "add a")
    commit(two, "b.txt", "b\n", "add b")

    git(repo, "cherry-pick", "-x", `${TICKET}..${TICKET}-w1`)
    git(repo, "cherry-pick", "-x", `${TICKET}..${TICKET}-w2`)

    expect(implement("cleanup", "1").stdout).toBe(`removed ${TICKET}-w1`)
    expect(implement("cleanup", "2").stdout).toBe(`removed ${TICKET}-w2`)
    expect(existsSync(one)).toBe(false)
    expect(existsSync(two)).toBe(false)
    expect(branches()).toEqual([TICKET, "main"])
    expect(git(repo, "worktree", "list", "--porcelain").split("\n\n").length).toBe(1)
  })

  test("cleanup accepts a commit that a hand resolution finished", () => {
    const { repo, implement, worktree, commit, branches } = setup()
    const one = worktree("1")
    const two = worktree("2")
    commit(one, "base.txt", "one\n", "change base in one")
    commit(two, "base.txt", "two\n", "change base in two")

    git(repo, "cherry-pick", "-x", `${TICKET}..${TICKET}-w1`)
    const pick = (): { status: number } =>
      exec("git", ["cherry-pick", "-x", `${TICKET}..${TICKET}-w2`], repo)
    expect(pick().status).toBe(1)
    writeFileSync(join(repo, "base.txt"), "one and two\n")
    git(repo, "add", "base.txt")
    git(repo, "cherry-pick", "--continue")

    expect(git(repo, "status", "--short")).toBe("")
    expect(implement("cleanup", "1").status).toBe(0)
    expect(implement("cleanup", "2").stdout).toBe(`removed ${TICKET}-w2`)
    expect(existsSync(two)).toBe(false)
    expect(branches()).toEqual([TICKET, "main"])
  })

  test("the undo after an aborted pick leaves HEAD on the pre-pick sha", () => {
    const { repo, worktree, commit } = setup()
    const one = worktree("1")
    const two = worktree("2")
    commit(one, "base.txt", "one\n", "change base in one")
    commit(two, "c.txt", "c\n", "add c")
    commit(two, "base.txt", "two\n", "change base in two")
    git(repo, "cherry-pick", "-x", `${TICKET}..${TICKET}-w1`)
    const prePick = git(repo, "rev-parse", "HEAD")

    const pick = exec("git", ["cherry-pick", "-x", `${TICKET}..${TICKET}-w2`], repo)
    expect(pick.status).toBe(1)
    git(repo, "cherry-pick", "--abort")

    expect(git(repo, "rev-parse", "HEAD")).toBe(prePick)
    expect(git(repo, "diff", prePick, "HEAD")).toBe("")
    expect(git(repo, "status", "--short")).toBe("")
  })

  test("the undo after a finished pick reverts the range back to the pre-pick sha", () => {
    const { repo, worktree, commit } = setup()
    const one = worktree("1")
    const two = worktree("2")
    commit(one, "base.txt", "one\n", "change base in one")
    commit(two, "base.txt", "two\n", "change base in two")
    git(repo, "cherry-pick", "-x", `${TICKET}..${TICKET}-w1`)
    const prePick = git(repo, "rev-parse", "HEAD")

    const pick = exec("git", ["cherry-pick", "-x", `${TICKET}..${TICKET}-w2`], repo)
    expect(pick.status).toBe(1)
    writeFileSync(join(repo, "base.txt"), "one and two\n")
    git(repo, "add", "base.txt")
    git(repo, "cherry-pick", "--continue")
    expect(git(repo, "rev-parse", "HEAD") === prePick).toBe(false)
    git(repo, "revert", "--no-edit", `${prePick}..HEAD`)

    expect(git(repo, "diff", prePick, "HEAD")).toBe("")
    expect(git(repo, "status", "--short")).toBe("")
  })

  test("cleanup refuses a worktree with an uncommitted file and keeps everything", () => {
    const { repo, implement, worktree, commit, branches } = setup()
    const one = worktree("1")
    commit(one, "a.txt", "a\n", "add a")
    git(repo, "cherry-pick", "-x", `${TICKET}..${TICKET}-w1`)
    writeFileSync(join(one, "stray.txt"), "stray\n")

    const result = implement("cleanup", "1")

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("stray.txt")
    expect(existsSync(one)).toBe(true)
    expect(branches()).toContain(`${TICKET}-w1`)
  })

  test("cleanup refuses a detached worktree", () => {
    const { repo, implement, worktree, branches } = setup()
    const one = worktree("1")
    git(one, "checkout", "--detach")

    const result = implement("cleanup", "1")

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("is not on")
    expect(existsSync(one)).toBe(true)
    expect(branches()).toContain(`${TICKET}-w1`)
    expect(git(repo, "status", "--short")).toBe("")
  })

  test("cleanup leaves a leftover folder alone and worktree refuses it", () => {
    const { implement } = setup()
    const probe = implement("worktree", "1")
    expect(probe.status).toBe(0)
    const path = probe.stdout
    expect(implement("cleanup", "1").status).toBe(0)
    mkdirSync(path)
    writeFileSync(join(path, "left.txt"), "left\n")

    const cleanup = implement("cleanup", "1")
    const again = implement("worktree", "1")

    expect(cleanup.status).toBe(0)
    expect(cleanup.stdout).toBe(`nothing to remove for ${TICKET}-w1`)
    expect(existsSync(join(path, "left.txt"))).toBe(true)
    expect(again.status).toBe(1)
    expect(again.stderr).toContain("Remove the folder")
  })

  test("a second worktree on the same ticket branch and id refuses and points to cleanup", () => {
    const { implement, worktree, branches } = setup()
    const one = worktree("1")

    const again = implement("worktree", "1")

    expect(again.status).toBe(1)
    expect(again.stderr).toContain("node scripts/implement.ts cleanup 1")
    expect(existsSync(one)).toBe(true)
    expect(branches().filter((name) => name === `${TICKET}-w1`).length).toBe(1)
  })
})
