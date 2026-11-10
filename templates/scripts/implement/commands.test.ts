import { spawnSync } from "node:child_process"
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"

const SCRIPTS = join(import.meta.dirname, "..")
const TICKET = "feat/1-x"
const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
}

type Result = { status: number; stdout: string; stderr: string }

const sandboxes: string[] = []

afterEach(() => {
  for (const dir of sandboxes.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

function exec(file: string, args: string[], cwd: string): Result {
  const result = spawnSync(file, args, { cwd, env: GIT_ENV, encoding: "utf8" })
  if (result.error) throw result.error
  return {
    status: result.status ?? 128,
    stdout: result.stdout.trimEnd(),
    stderr: result.stderr.trimEnd(),
  }
}

type Repo = {
  worktreeParent: string
  dir: string
  git(...args: string[]): Result
  mustGit(...args: string[]): string
  implement(...args: string[]): Result
  mustImplement(...args: string[]): string
  worktreePath(id: string): string
  write(path: string, content: string, inDir?: string): void
  commitFile(inDir: string, path: string, content: string): string
  branches(): string[]
  worktrees(): string[]
}

function sandbox(worktreeSetup: string[][] = []): Repo {
  const worktreeParent = realpathSync(mkdtempSync(join(tmpdir(), "implement-")))
  sandboxes.push(worktreeParent)
  const dir = join(worktreeParent, "repo")
  mkdirSync(dir)
  const git = (...args: string[]) => exec("git", args, dir)
  const mustGit = (...args: string[]) => {
    const result = git(...args)
    if (result.status !== 0) {
      throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`)
    }
    return result.stdout
  }
  const implement = (...args: string[]) =>
    exec(process.execPath, ["scripts/implement.ts", ...args], dir)
  const write = (path: string, content: string, inDir = dir) => {
    writeFileSync(join(inDir, path), content)
  }
  const repo: Repo = {
    worktreeParent,
    dir,
    git,
    mustGit,
    write,
    implement,
    mustImplement: (...args) => {
      const result = implement(...args)
      if (result.status !== 0) {
        throw new Error(`implement ${args.join(" ")} failed: ${result.stderr}`)
      }
      return result.stdout
    },
    worktreePath: (id) => join(worktreeParent, `repo.${TICKET.replace("/", "-")}-w${id}`),
    commitFile(inDir, path, content) {
      write(path, content, inDir)
      mustGit("-C", inDir, "add", path)
      mustGit("-C", inDir, "commit", "-m", `edit ${path}`)
      return mustGit("-C", inDir, "rev-parse", "HEAD")
    },
    branches: () =>
      mustGit("branch", "--format=%(refname:short)").split("\n").sort(),
    worktrees: () =>
      mustGit("worktree", "list", "--porcelain")
        .split("\n")
        .filter((line) => line.startsWith("worktree "))
        .map((line) => line.slice("worktree ".length)),
  }
  mustGit("init", "--initial-branch=main")
  mustGit("config", "user.name", "Test")
  mustGit("config", "user.email", "test@example.com")
  mustGit("config", "commit.gpgsign", "false")
  cpSync(SCRIPTS, join(dir, "scripts"), {
    recursive: true,
    filter: (source) => !source.endsWith(".test.ts"),
  })
  write("package.json", '{"type":"module"}\n')
  write("agents.config.json", `${JSON.stringify({ worktreeSetup })}\n`)
  for (const file of ["a.txt", "b.txt", "c.txt"]) write(file, "base\n")
  mustGit("add", ".")
  mustGit("commit", "-m", "base")
  mustGit("checkout", "-b", TICKET)
  return repo
}

function pickInProgress(repo: Repo): boolean {
  return (
    repo.git("rev-parse", "--verify", "CHERRY_PICK_HEAD").status === 0 ||
    existsSync(join(repo.dir, ".git", "sequencer"))
  )
}

function undoPickSince(repo: Repo, preSha: string): void {
  if (pickInProgress(repo)) repo.mustGit("cherry-pick", "--abort")
  if (repo.mustGit("rev-parse", "HEAD") !== preSha) {
    repo.mustGit("revert", "--no-edit", `${preSha}..HEAD`)
  }
}

describe("implement.ts worktree and cleanup", () => {
  test("two build workers land by cherry-pick -x, and cleanup removes both", () => {
    const repo = sandbox()
    const paths = ["1", "2"].map((id) => repo.mustImplement("worktree", id))
    expect(paths).toEqual([repo.worktreePath("1"), repo.worktreePath("2")])
    repo.commitFile(paths[0], "a.txt", "one\n")
    repo.commitFile(paths[1], "b.txt", "two\n")

    repo.mustGit("cherry-pick", "-x", `${TICKET}..${TICKET}-w1`)
    repo.mustGit("cherry-pick", "-x", `${TICKET}..${TICKET}-w2`)
    expect(repo.implement("cleanup", "1").stdout).toBe(`removed ${TICKET}-w1`)
    expect(repo.implement("cleanup", "2").stdout).toBe(`removed ${TICKET}-w2`)

    expect(repo.branches()).toEqual([TICKET, "main"])
    expect(repo.worktrees()).toEqual([repo.dir])
    expect(existsSync(paths[0])).toBe(false)
    expect(existsSync(paths[1])).toBe(false)
  })

  test("cleanup keeps a worktree whose commit is not on the ticket branch", () => {
    const repo = sandbox()
    const path = repo.mustImplement("worktree", "1")
    const sha = repo.commitFile(path, "a.txt", "one\n")

    const result = repo.implement("cleanup", "1")

    expect(result.status).toBe(1)
    expect(result.stderr).toContain(sha)
    expect(repo.branches()).toContain(`${TICKET}-w1`)
    expect(existsSync(path)).toBe(true)
  })

  test("cleanup succeeds after a conflict that the fix worker resolved by hand", () => {
    const repo = sandbox()
    const first = repo.mustImplement("worktree", "1")
    const second = repo.mustImplement("worktree", "2")
    repo.commitFile(first, "a.txt", "from one\n")
    repo.commitFile(second, "a.txt", "from two\n")

    repo.mustGit("cherry-pick", "-x", `${TICKET}..${TICKET}-w1`)
    const conflict = repo.git("cherry-pick", "-x", `${TICKET}..${TICKET}-w2`)
    expect(conflict.status).toBe(1)
    repo.write("a.txt", "from one and two\n")
    repo.mustGit("add", "a.txt")
    repo.mustGit("-c", "core.editor=true", "cherry-pick", "--continue")
    expect(repo.mustGit("status", "--short")).toBe("")

    expect(repo.implement("cleanup", "1").status).toBe(0)
    expect(repo.implement("cleanup", "2").stdout).toBe(`removed ${TICKET}-w2`)
    expect(repo.branches()).toEqual([TICKET, "main"])
    expect(repo.worktrees()).toEqual([repo.dir])
  })

  test("cleanup refuses the second build worker while its conflict is open", () => {
    const repo = sandbox()
    const first = repo.mustImplement("worktree", "1")
    const second = repo.mustImplement("worktree", "2")
    repo.commitFile(first, "a.txt", "from one\n")
    repo.commitFile(second, "a.txt", "from two\n")
    repo.mustGit("cherry-pick", "-x", `${TICKET}..${TICKET}-w1`)
    repo.git("cherry-pick", "-x", `${TICKET}..${TICKET}-w2`)

    const result = repo.implement("cleanup", "2")

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("keeps its worktree")
    expect(existsSync(second)).toBe(true)
  })

  test("the undo leaves the ticket branch as it was after a conflict the fix worker gave up", () => {
    const repo = sandbox()
    const path = repo.mustImplement("worktree", "1")
    repo.commitFile(repo.dir, "b.txt", "ticket b\n")
    repo.commitFile(repo.dir, "c.txt", "ticket c\n")
    repo.commitFile(path, "a.txt", "worker a\n")
    repo.commitFile(path, "b.txt", "worker b\n")
    repo.commitFile(path, "c.txt", "worker c\n")
    const preSha = repo.mustGit("rev-parse", "HEAD")

    expect(repo.git("cherry-pick", "-x", `${TICKET}..${TICKET}-w1`).status).toBe(1)
    repo.write("b.txt", "resolved b\n")
    repo.mustGit("add", "b.txt")
    const next = repo.git("-c", "core.editor=true", "cherry-pick", "--continue")
    expect(next.status).toBe(1)
    expect(repo.mustGit("log", "--format=%s", `${preSha}..HEAD`)).toContain("edit b.txt")
    undoPickSince(repo, preSha)

    expect(repo.mustGit("diff", preSha, "HEAD")).toBe("")
    expect(repo.mustGit("status", "--short")).toBe("")
  })

  test("the undo aborts a pick the fix worker left open and reverts its hand commits", () => {
    const repo = sandbox()
    const path = repo.mustImplement("worktree", "1")
    repo.commitFile(repo.dir, "b.txt", "ticket b\n")
    repo.commitFile(path, "b.txt", "worker b\n")
    repo.commitFile(path, "a.txt", "worker a\n")
    const preSha = repo.mustGit("rev-parse", "HEAD")

    expect(repo.git("cherry-pick", "-x", `${TICKET}..${TICKET}-w1`).status).toBe(1)
    repo.write("b.txt", "resolved b\n")
    repo.mustGit("commit", "-am", "fix worker")
    repo.commitFile(repo.dir, "c.txt", "fix worker again\n")
    expect(repo.mustGit("rev-list", "--count", `${preSha}..HEAD`)).toBe("2")
    expect(repo.git("rev-parse", "--verify", "CHERRY_PICK_HEAD").status === 0).toBe(false)
    expect(pickInProgress(repo)).toBe(true)
    undoPickSince(repo, preSha)

    expect(pickInProgress(repo)).toBe(false)
    expect(repo.mustGit("diff", preSha, "HEAD")).toBe("")
    expect(repo.mustGit("status", "--short")).toBe("")
  })

  test("cleanup refuses a worktree with a file that is not committed", () => {
    const repo = sandbox()
    const path = repo.mustImplement("worktree", "1")
    repo.commitFile(path, "a.txt", "one\n")
    repo.mustGit("cherry-pick", "-x", `${TICKET}..${TICKET}-w1`)
    repo.write("scratch.txt", "left over\n", path)

    const result = repo.implement("cleanup", "1")

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("scratch.txt")
    expect(existsSync(path)).toBe(true)
    expect(repo.branches()).toContain(`${TICKET}-w1`)
  })

  test("cleanup refuses a worktree with a detached head", () => {
    const repo = sandbox()
    const path = repo.mustImplement("worktree", "1")
    repo.mustGit("-C", path, "checkout", "--detach")

    const result = repo.implement("cleanup", "1")

    expect(result.status).toBe(1)
    expect(result.stderr).toContain(`is not on ${TICKET}-w1`)
    expect(existsSync(path)).toBe(true)
    expect(repo.branches()).toContain(`${TICKET}-w1`)
  })

  test("a folder left at the worktree path stops worktree, and cleanup keeps it", () => {
    const repo = sandbox()
    const path = repo.worktreePath("1")
    mkdirSync(path)
    writeFileSync(join(path, "keep.txt"), "mine\n")

    const made = repo.implement("worktree", "1")
    const cleaned = repo.implement("cleanup", "1")

    expect(made.status).toBe(1)
    expect(made.stderr).toContain("Remove the folder")
    expect(cleaned.status).toBe(0)
    expect(cleaned.stdout).toBe(`nothing to remove for ${TICKET}-w1`)
    expect(existsSync(join(path, "keep.txt"))).toBe(true)
    expect(repo.branches()).toEqual([TICKET, "main"])
  })

  test("a second worktree for the same build worker is refused and changes nothing", () => {
    const repo = sandbox()
    const path = repo.mustImplement("worktree", "1")
    const sha = repo.commitFile(path, "a.txt", "one\n")

    const again = repo.implement("worktree", "1")

    expect(again.status).toBe(1)
    expect(again.stderr).toContain("cleanup 1")
    expect(repo.mustGit("rev-parse", `${TICKET}-w1`)).toBe(sha)
    expect(repo.worktrees()).toEqual([repo.dir, path])
  })

  test("a failed worktreeSetup rolls back the branch and the worktree", () => {
    const repo = sandbox([["false"]])

    const made = repo.implement("worktree", "1")

    expect(made.status).toBe(1)
    expect(made.stderr).toContain("`false` exited with")
    expect(repo.branches()).toEqual([TICKET, "main"])
    expect(repo.worktrees()).toEqual([repo.dir])
    expect(existsSync(repo.worktreePath("1"))).toBe(false)
  })
})
