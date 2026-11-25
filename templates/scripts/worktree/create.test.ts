import { spawnSync } from "node:child_process"
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterEach, describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { envWithoutGit } from "../../../scripts/test-env.ts"

const SCRIPTS = join(import.meta.dirname, "..")
const sandboxes: string[] = []

afterEach(() => {
  for (const dir of sandboxes.splice(0)) rmSync(dir, { recursive: true, force: true })
})

type Result = { status: number; stdout: string; stderr: string }

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

type Repo = {
  parent: string
  dir: string
  worktree(...args: string[]): Result
  worktreeFrom(cwd: string, ...args: string[]): Result
  git(...args: string[]): string
  write(path: string, content: string): void
  path(name: string): string
  branches(): string[]
  worktrees(): string[]
}

function sandbox(config: object = {}): Repo {
  const parent = realpathSync(mkdtempSync(join(tmpdir(), "worktree-")))
  sandboxes.push(parent)
  const dir = join(parent, "repo")
  mkdirSync(dir)
  const git = (...args: string[]) => {
    const result = exec("git", args, dir)
    if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`)
    return result.stdout
  }
  const write = (path: string, content: string) => {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), content)
  }
  git("init", "--initial-branch=main")
  git("config", "user.name", "Test")
  git("config", "user.email", "test@example.com")
  git("config", "commit.gpgsign", "false")
  cpSync(SCRIPTS, join(dir, "scripts"), {
    recursive: true,
    filter: (source) => !source.endsWith(".test.ts"),
  })
  write("package.json", '{"type":"module"}\n')
  write("agents.config.json", `${JSON.stringify(config)}\n`)
  write("a.txt", "base\n")
  git("add", ".")
  git("commit", "-m", "base")
  return {
    parent,
    dir,
    worktree: (...args) => exec(process.execPath, ["scripts/worktree.ts", ...args], dir),
    worktreeFrom: (cwd, ...args) =>
      exec(process.execPath, ["scripts/worktree.ts", ...args], cwd),
    git,
    write,
    path: (name) => join(parent, name),
    branches: () => git("branch", "--format=%(refname:short)").split("\n").sort(),
    worktrees: () =>
      git("worktree", "list", "--porcelain")
        .split("\n")
        .filter((line) => line.startsWith("worktree "))
        .map((line) => line.slice("worktree ".length)),
  }
}

describe("worktree.ts", () => {
  test("creates the worktree on a new branch and prints its path", () => {
    const repo = sandbox()
    const path = repo.path("wt")

    const result = repo.worktree(path, "--branch", "feat/x")

    expect(result.status).toBe(0)
    expect(result.stdout).toBe(path)
    expect(readFileSync(join(path, "a.txt"), "utf8")).toBe("base\n")
    expect(repo.branches()).toEqual(["feat/x", "main"])
  })

  test("starts the new branch at the base the caller names", () => {
    const repo = sandbox()
    repo.git("tag", "start")
    repo.write("a.txt", "later\n")
    repo.git("commit", "-am", "later")
    const path = repo.path("wt")

    repo.worktree(path, "--branch", "b", "--base", "start")

    expect(readFileSync(join(path, "a.txt"), "utf8")).toBe("base\n")
  })

  test("makes a detached worktree when no branch is named", () => {
    const repo = sandbox()
    const path = repo.path("wt")

    expect(repo.worktree(path).status).toBe(0)

    expect(repo.git("-C", path, "branch", "--show-current")).toBe("")
    expect(repo.branches()).toEqual(["main"])
  })

  test("starts a detached worktree at the base the caller names", () => {
    const repo = sandbox()
    const start = repo.git("rev-parse", "HEAD")
    repo.write("a.txt", "later\n")
    repo.git("commit", "-am", "later")
    const path = repo.path("wt")

    const result = repo.worktree(path, "--base", start)

    expect(result.status).toBe(0)
    expect(repo.git("-C", path, "rev-parse", "HEAD")).toBe(start)
  })

  test("checks out a branch that already exists", () => {
    const repo = sandbox()
    repo.git("branch", "old")
    const path = repo.path("wt")

    expect(repo.worktree(path, "--branch", "old").status).toBe(0)

    expect(repo.git("-C", path, "branch", "--show-current")).toBe("old")
  })

  test("runs each setup command in the new worktree", () => {
    const repo = sandbox({ worktreeSetup: [["touch", "installed-1"], ["touch", "installed-2"]] })
    const path = repo.path("wt")

    repo.worktree(path)

    expect(existsSync(join(path, "installed-1"))).toBe(true)
    expect(existsSync(join(path, "installed-2"))).toBe(true)
  })

  test("links each listed file from the main checkout", () => {
    const repo = sandbox({ worktreeLinks: [".env.local", ".claude/settings.local.json"] })
    repo.write(".env.local", "SECRET=1\n")
    repo.write(".claude/settings.local.json", "{}\n")
    const path = repo.path("wt")

    const result = repo.worktree(path)

    expect(result.status).toBe(0)
    expect(readFileSync(join(path, ".env.local"), "utf8")).toBe("SECRET=1\n")
    expect(readFileSync(join(path, ".claude/settings.local.json"), "utf8")).toBe("{}\n")
    expect(lstatSync(join(path, ".env.local")).isSymbolicLink()).toBe(true)
  })

  test("links the files before it runs the setup commands", () => {
    const repo = sandbox({
      worktreeLinks: [".env.local"],
      worktreeSetup: [["cp", ".env.local", "seen-by-setup"]],
    })
    repo.write(".env.local", "SECRET=1\n")
    const path = repo.path("wt")

    expect(repo.worktree(path).status).toBe(0)

    expect(readFileSync(join(path, "seen-by-setup"), "utf8")).toBe("SECRET=1\n")
  })

  test("skips a listed file the main checkout lacks, says so, and still creates the worktree", () => {
    const repo = sandbox({ worktreeLinks: [".env.local", "present.txt"] })
    repo.write("present.txt", "here\n")
    const path = repo.path("wt")

    const result = repo.worktree(path)

    expect(result.status).toBe(0)
    expect(result.stdout).toBe(path)
    expect(result.stderr).toContain(".env.local")
    expect(result.stderr).toContain("skipped")
    expect(existsSync(join(path, ".env.local"))).toBe(false)
    expect(readFileSync(join(path, "present.txt"), "utf8")).toBe("here\n")
  })

  test("skips a listed file when the worktree already has a link at that path", () => {
    const repo = sandbox({ worktreeLinks: ["local.cfg"] })
    symlinkSync("nowhere", join(repo.dir, "local.cfg"))
    repo.git("add", "local.cfg")
    repo.git("commit", "-m", "track a link that points nowhere")
    rmSync(join(repo.dir, "local.cfg"))
    repo.write("local.cfg", "real\n")
    const path = repo.path("wt")

    const result = repo.worktree(path)

    expect(result.status).toBe(0)
    expect(result.stderr).toContain("skipped local.cfg: the worktree already has it")
    expect(repo.worktrees()).toEqual([repo.dir, path])
  })

  test("skips a listed file that the worktree already holds as a real file", () => {
    const repo = sandbox({ worktreeLinks: ["local.cfg"] })
    repo.write("local.cfg", "committed\n")
    repo.git("add", "local.cfg")
    repo.git("commit", "-m", "track local.cfg")
    const path = repo.path("wt")

    const result = repo.worktree(path)

    expect(result.status).toBe(0)
    expect(result.stderr).toContain("skipped local.cfg: the worktree already has it")
    expect(repo.worktrees()).toEqual([repo.dir, path])
    expect(lstatSync(join(path, "local.cfg")).isSymbolicLink()).toBe(false)
    expect(readFileSync(join(path, "local.cfg"), "utf8")).toBe("committed\n")
  })

  test("refuses an absolute listed path and creates no worktree", () => {
    const repo = sandbox()
    const outside = repo.path("outside.cfg")
    writeFileSync(outside, "outside\n")
    repo.write("agents.config.json", `${JSON.stringify({ worktreeLinks: [outside] })}\n`)
    const path = repo.path("wt")

    const result = repo.worktree(path)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain(`worktreeLinks entry ${outside} must stay inside the repo`)
    expect(existsSync(path)).toBe(false)
    expect(repo.worktrees()).toEqual([repo.dir])
  })

  test("refuses a listed path that leaves the repo", () => {
    const repo = sandbox({ worktreeLinks: ["../outside"] })
    const path = repo.path("wt")

    const result = repo.worktree(path)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("../outside")
    expect(existsSync(path)).toBe(false)
  })

  test("removes the worktree and the new branch when a setup command fails", () => {
    const repo = sandbox({ worktreeSetup: [["touch", "half"], ["false"]] })
    const path = repo.path("wt")

    const result = repo.worktree(path, "--branch", "feat/x")

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("`false` exited with")
    expect(existsSync(path)).toBe(false)
    expect(repo.worktrees()).toEqual([repo.dir])
    expect(repo.branches()).toEqual(["main"])
  })

  test("keeps a branch that existed before when a setup command fails", () => {
    const repo = sandbox({ worktreeSetup: [["false"]] })
    repo.git("branch", "old")
    const path = repo.path("wt")

    expect(repo.worktree(path, "--branch", "old").status).toBe(1)

    expect(existsSync(path)).toBe(false)
    expect(repo.branches()).toEqual(["main", "old"])
  })

  test("the next run starts clean after a failed one", () => {
    const repo = sandbox({ worktreeSetup: [["false"]] })
    const path = repo.path("wt")
    repo.worktree(path, "--branch", "feat/x")
    repo.write("agents.config.json", `${JSON.stringify({ worktreeSetup: [] })}\n`)

    const again = repo.worktree(path, "--branch", "feat/x")

    expect(again.status).toBe(0)
    expect(repo.branches()).toEqual(["feat/x", "main"])
  })

  test("says when --base is ignored because the branch already exists", () => {
    const repo = sandbox()
    repo.git("branch", "old")
    repo.write("a.txt", "later\n")
    repo.git("commit", "-am", "later")
    const path = repo.path("wt")

    const result = repo.worktree(path, "--branch", "old", "--base", "main")

    expect(result.status).toBe(0)
    expect(result.stderr).toContain("worktree: old already exists, so --base main is ignored")
    expect(repo.git("-C", path, "rev-parse", "HEAD")).toBe(repo.git("rev-parse", "old"))
  })

  test("stays silent about --base when the branch is new or --base is absent", () => {
    const repo = sandbox()
    repo.git("branch", "old")

    const fresh = repo.worktree(repo.path("a"), "--branch", "new", "--base", "main")
    const reused = repo.worktree(repo.path("b"), "--branch", "old")

    expect(fresh.stderr).toBe("")
    expect(reused.stderr).toBe("")
  })

  test("prints usage when no path is given", () => {
    const result = sandbox().worktree()

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("usage: node scripts/worktree.ts <path>")
  })
})

describe("worktree.ts from a linked worktree", () => {
  function linked(repo: Repo): string {
    const caller = repo.path("caller")
    repo.git("worktree", "add", "-b", "ticket", caller)
    writeFileSync(join(caller, "ticket.txt"), "ticket\n")
    repo.git("-C", caller, "add", "ticket.txt")
    repo.git("-C", caller, "commit", "-m", "ticket work")
    return caller
  }

  test("starts at the HEAD of the caller, not of the main checkout", () => {
    const repo = sandbox()
    const caller = linked(repo)
    const path = repo.path("wt")

    const result = repo.worktreeFrom(caller, path)

    expect(result.status).toBe(0)
    expect(repo.git("-C", path, "rev-parse", "HEAD")).toBe(repo.git("-C", caller, "rev-parse", "HEAD"))
    expect(readFileSync(join(path, "ticket.txt"), "utf8")).toBe("ticket\n")
  })

  test("starts a new branch at the HEAD of the caller", () => {
    const repo = sandbox()
    const caller = linked(repo)
    const path = repo.path("wt")

    expect(repo.worktreeFrom(caller, path, "--branch", "worker").status).toBe(0)

    expect(repo.git("rev-parse", "worker")).toBe(repo.git("-C", caller, "rev-parse", "HEAD"))
  })

  test("removes the worktree and the new branch when a setup command fails", () => {
    const repo = sandbox({ worktreeSetup: [["false"]] })
    const caller = linked(repo)
    const path = repo.path("wt")

    const result = repo.worktreeFrom(caller, path, "--branch", "worker")

    expect(result.status).toBe(1)
    expect(existsSync(path)).toBe(false)
    expect(repo.worktrees()).toEqual([repo.dir, caller])
    expect(repo.branches()).toEqual(["main", "ticket"])
  })
})
