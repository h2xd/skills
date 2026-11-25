import { spawnSync } from "node:child_process"
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
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
const sandboxes: string[] = []

afterEach(() => {
  for (const dir of sandboxes.splice(0)) rmSync(dir, { recursive: true, force: true })
})

type Result = { status: number; stdout: string; stderr: string }

type Repo = {
  dir: string
  parent: string
  git(...args: string[]): string
  commit(file: string, date: string, who: "ada" | "bob", message: string): void
  catchup(...args: string[]): Result
}

const PEOPLE = {
  ada: { name: "Ada", email: "ada@example.com" },
  bob: { name: "Bob", email: "bob@example.com" },
}

function sandbox(): Repo {
  const parent = realpathSync(mkdtempSync(join(tmpdir(), "catchup-")))
  sandboxes.push(parent)
  const dir = join(parent, "repo")
  mkdirSync(dir)
  const environment = (extra: Record<string, string> = {}) => ({
    ...envWithoutGit(),
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    ...extra,
  })
  const run = (file: string, args: string[], extra: Record<string, string> = {}): Result => {
    const result = spawnSync(file, args, { cwd: dir, encoding: "utf8", env: environment(extra) })
    if (result.error) throw result.error
    return {
      status: result.status ?? 128,
      stdout: result.stdout.trimEnd(),
      stderr: result.stderr.trimEnd(),
    }
  }
  const git = (...args: string[]) => {
    const result = run("git", args)
    if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`)
    return result.stdout
  }
  git("init", "--initial-branch=main")
  git("config", "user.name", "Ada")
  git("config", "user.email", "ada@example.com")
  git("config", "commit.gpgsign", "false")
  cpSync(SCRIPTS, join(dir, "scripts"), {
    recursive: true,
    filter: (source) => !source.endsWith(".test.ts"),
  })
  writeFileSync(join(dir, "package.json"), '{"type":"module"}\n')
  writeFileSync(join(dir, "agents.config.json"), "{}\n")
  git("add", ".")
  return {
    dir,
    parent,
    git,
    commit(file, date, who, message) {
      mkdirSync(join(dir, file, ".."), { recursive: true })
      writeFileSync(join(dir, file), `${message}\n`)
      git("add", file)
      const person = PEOPLE[who]
      const stamp = `${date}T12:00:00Z`
      const result = run("git", ["commit", "-m", message], {
        GIT_AUTHOR_NAME: person.name,
        GIT_AUTHOR_EMAIL: person.email,
        GIT_AUTHOR_DATE: stamp,
        GIT_COMMITTER_NAME: person.name,
        GIT_COMMITTER_EMAIL: person.email,
        GIT_COMMITTER_DATE: stamp,
      })
      if (result.status !== 0) throw new Error(result.stderr)
    },
    catchup: (...args) => run(process.execPath, ["scripts/catchup.ts", ...args]),
  }
}

function history(): Repo {
  const repo = sandbox()
  repo.commit("README.md", "2026-11-02", "ada", "feat: start")
  repo.commit("skills/a.md", "2026-11-04", "ada", "feat: add a")
  repo.commit("skills/b.md", "2026-11-18", "bob", "fix: repair b")
  repo.git("checkout", "-b", "feat/12-thing")
  repo.commit("src/x.ts", "2026-11-20", "ada", "feat: x")
  repo.commit("src/y.ts", "2026-11-23", "ada", "feat: y")
  return repo
}

function files(dir: string): string[] {
  return readdirSync(dir, { recursive: true }).map(String).filter((name) => !name.startsWith(".git")).sort()
}

describe("catchup.ts facts, the work scope", () => {
  test("picks the work scope on a ticket branch and states the facts", () => {
    const repo = history()
    writeFileSync(join(repo.dir, "todo.txt"), "open\n")

    const result = repo.catchup("facts")

    expect(result.status).toBe(0)
    const lines = result.stdout.split("\n")
    expect(lines).toContain("scope: work")
    expect(lines).toContain("branch: feat/12-thing")
    expect(lines).toContain("base: main")
    expect(lines).toContain("ticket: 12")
    expect(lines).toContain("ahead: 2")
    expect(lines).toContain("uncommitted: 1")
  })

  test("lists the last three commits, newest first", () => {
    const repo = history()

    const result = repo.catchup("facts")

    const after = result.stdout.split("last commits:\n")[1].split("\ncommits per week:")[0].split("\n")
    expect(after.map((line) => line.replace(/^- [0-9a-f]+ /, ""))).toEqual([
      "2026-11-23 feat: y",
      "2026-11-20 feat: x",
      "2026-11-18 fix: repair b",
    ])
  })

  test("draws the commits per week of the branch", () => {
    const result = history().catchup("facts")

    expect(result.stdout).toContain("commits per week:")
    expect(result.stdout).toContain("2026-11-16 | #################### 1")
    expect(result.stdout).toContain("2026-11-23 | #################### 1")
    expect(result.stdout).not.toContain("2026-11-02 | ")
  })

  test("says there is no ticket for a branch without a number", () => {
    const repo = history()
    repo.git("checkout", "-b", "chore/tidy")

    expect(repo.catchup("facts").stdout).toContain("ticket: none")
  })

  test("an argument picks the work scope on the default branch", () => {
    const repo = history()
    repo.git("checkout", "main")

    const result = repo.catchup("facts", "--scope", "work")

    expect(result.stdout).toContain("scope: work")
    expect(result.stdout).toContain("ahead: 0")
  })
})

describe("catchup.ts facts, the repo scope", () => {
  test("picks the repo scope on the default branch", () => {
    const repo = history()
    repo.git("checkout", "main")

    expect(repo.catchup("facts").stdout).toContain("scope: repo")
  })

  test("lists what changed since the user's last commit, with a graph per week", () => {
    const repo = history()
    repo.git("checkout", "main")

    const result = repo.catchup("facts")

    const lines = result.stdout.split("\n")
    expect(lines).toContain("mode: changes")
    expect(lines).toContain("your last commit: 2026-11-04")
    expect(lines).toContain("since your last commit: 1")
    expect(lines.some((line) => /^- [0-9a-f]+ 2026-11-18 fix: repair b \(Bob\)$/.test(line))).toBe(true)
    expect(result.stdout).toContain("commits per week:")
    expect(result.stdout).toContain("2026-11-16 | ")
  })

  test("prints the Documentary facts for a user with no commit", () => {
    const repo = history()
    repo.git("checkout", "main")
    repo.git("tag", "v0.1.0")

    const result = repo.catchup("facts", "--user", "nobody@example.com")

    const lines = result.stdout.split("\n")
    expect(lines).toContain("mode: documentary")
    expect(lines).toContain("- first commit: 2026-11-02")
    expect(lines).toContain("- commits: 3")
    expect(lines).toContain("- authors: 2")
    expect(lines).toContain("- busiest week: 2026-11-02 with 2 commits")
    expect(lines.some((line) => line.startsWith("- v0.1.0 "))).toBe(true)
    expect(lines).toContain("- skills/ 2 files")
    expect(lines).toContain("- (root) 3 files")
    expect(result.stdout).toContain("commits per week:")
  })

  test("an argument picks the repo scope on a ticket branch", () => {
    const result = history().catchup("facts", "--scope", "repo")

    expect(result.stdout).toContain("scope: repo")
  })

  test("takes the default branch from the remote, and gives it the repo scope", () => {
    const repo = history()
    repo.git("checkout", "main")
    repo.git("update-ref", "refs/remotes/origin/main", "main")
    repo.git("symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main")

    const lines = repo.catchup("facts").stdout.split("\n")

    expect(lines).toContain("scope: repo")
    expect(lines).toContain("branch: main")
  })

  test("refuses a scope it does not know", () => {
    const result = history().catchup("facts", "--scope", "galaxy")

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("scope must be work or repo")
  })
})

describe("catchup.ts bar, timeline and handoff", () => {
  test("draws a progress bar", () => {
    const result = sandbox().catchup("bar", "Loop", "3", "7")

    expect(result.stdout).toBe("Loop [########------------] 3/7 42%")
  })

  test("refuses a bar with a count above the total", () => {
    const result = sandbox().catchup("bar", "Loop", "8", "7")

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("done must be")
  })

  test("draws the timeline of a commit range, oldest first", () => {
    const repo = history()

    const result = repo.catchup("timeline", "main..feat/12-thing")

    expect(result.stdout.split("\n").map((line) => line.replace(/ [0-9a-f]{7,} /, " "))).toEqual([
      "o 2026-11-20 feat: x",
      "|",
      "o 2026-11-23 feat: y",
    ])
  })

  test("finds the newest handoff document of the repo", () => {
    const repo = sandbox()
    const temp = join(repo.parent, "temp")
    mkdirSync(temp)
    for (const name of [
      "handoff-repo-20261120-0900.md",
      "handoff-repo-20261124-1530.md",
      "handoff-other-20261125-1000.md",
    ]) {
      writeFileSync(join(temp, name), "x\n")
    }

    const result = repo.catchup("handoff", "--dir", temp)

    expect(result.stdout).toBe(join(temp, "handoff-repo-20261124-1530.md"))
  })

  test("says none when the repo has no handoff document", () => {
    const repo = sandbox()
    const temp = join(repo.parent, "temp")
    mkdirSync(temp)

    expect(repo.catchup("handoff", "--dir", temp).stdout).toBe("none")
  })
})

describe("catchup.ts changes no file", () => {
  test("leaves the files and the git state as they were after every command", () => {
    const repo = history()
    repo.git("checkout", "main")
    const before = files(repo.dir)
    const status = repo.git("status", "--porcelain")
    const head = repo.git("rev-parse", "HEAD")

    for (const args of [
      ["facts"],
      ["facts", "--scope", "work"],
      ["facts", "--user", "nobody@example.com"],
      ["bar", "Loop", "1", "2"],
      ["timeline", "main..feat/12-thing"],
      ["handoff", "--dir", repo.parent],
    ]) {
      expect(repo.catchup(...args).status).toBe(0)
    }

    expect(files(repo.dir)).toEqual(before)
    expect(repo.git("status", "--porcelain")).toBe(status)
    expect(repo.git("rev-parse", "HEAD")).toBe(head)
  })

  test("prints usage for an unknown command", () => {
    const result = sandbox().catchup("start-a-skill")

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("usage: node scripts/catchup.ts")
  })
})
