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
  fastImport(stream: string): void
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
  const run = (
    file: string,
    args: string[],
    extra: Record<string, string> = {},
    input?: string,
  ): Result => {
    const result = spawnSync(file, args, {
      cwd: dir,
      encoding: "utf8",
      env: environment(extra),
      input,
    })
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
    fastImport(stream) {
      const result = run("git", ["fast-import", "--quiet"], {}, stream)
      if (result.status !== 0) throw new Error(result.stderr)
      git("reset", "--quiet")
    },
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

function behindRemote(): Repo {
  const repo = history()
  repo.git("checkout", "main")
  repo.commit("skills/c.md", "2026-11-19", "bob", "fix: repair c")
  repo.commit("skills/d.md", "2026-11-19", "bob", "fix: repair d")
  repo.git("update-ref", "refs/remotes/origin/main", "main")
  repo.git("symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main")
  repo.git("checkout", "-b", "feat/9-x")
  repo.commit("src/own.ts", "2026-11-24", "ada", "feat: own")
  repo.git("branch", "-f", "main", "main~2")
  return repo
}

function remoteDiffers(): Repo {
  const repo = history()
  repo.git("checkout", "main")
  repo.git("update-ref", "refs/remotes/origin/main", "main")
  repo.git("symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main")
  return repo
}

function changesAfterOwnCommit(count: number): Repo {
  const repo = sandbox()
  repo.commit("README.md", "2026-11-02", "ada", "feat: start")
  for (let number = 1; number <= count; number++) {
    repo.commit(`skills/s${number}.md`, "2026-11-10", "bob", `fix: change ${number}`)
  }
  return repo
}

const BULK_SUBJECT = `feat: ${"a subject as long as the ones in a repo that has lived for years ".repeat(3)}`
const BULK_DIRECTORY = "a-directory-with-a-long-name-".repeat(4)

function bulkHistory(commits: number, trackedFiles: number): string {
  const person = `ada <${PEOPLE.ada.email}>`
  const stream: string[] = []
  for (let number = 1; number <= commits; number++) {
    const message = `${BULK_SUBJECT} ${number}`
    stream.push(
      "commit refs/heads/main",
      `committer ${person} ${1_760_000_000 + number} +0000`,
      `data ${message.length}`,
      message,
    )
    if (number === 1) {
      for (let file = 1; file <= trackedFiles; file++) {
        const content = `file ${file}`
        stream.push(`M 100644 inline ${BULK_DIRECTORY}/file-${file}.txt`, `data ${content.length}`, content)
      }
    }
    stream.push("")
  }
  return `${stream.join("\n")}\n`
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

  test("counts no uncommitted file on a clean branch", () => {
    const result = history().catchup("facts")

    expect(result.stdout.split("\n")).toContain("uncommitted: 0")
  })

  test("counts the branch against the remote default branch when the local one is behind", () => {
    const repo = behindRemote()

    const lines = repo.catchup("facts").stdout.split("\n")

    expect(lines).toContain("scope: work")
    expect(lines).toContain("base: origin/main")
    expect(lines).toContain("ahead: 1")
  })

  test("takes main as the base when both main and master exist and there is no remote", () => {
    const repo = history()
    repo.git("branch", "master")

    expect(repo.catchup("facts").stdout.split("\n")).toContain("base: main")
  })

  test("works in a repo with no user.email", () => {
    const repo = history()
    repo.git("config", "--unset", "user.email")

    const result = repo.catchup("facts", "--scope", "work")

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("scope: work")
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

  test("lists at most 10 tags in the Documentary", () => {
    const repo = history()
    repo.git("checkout", "main")
    for (let release = 1; release <= 11; release++) repo.git("tag", `v0.${release}.0`)

    const result = repo.catchup("facts", "--user", "nobody@example.com")

    const tags = result.stdout.split("\n").filter((line) => /^- v0\.\d+\.0 /.test(line))
    expect(tags).toHaveLength(10)
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

  test("counts the commits of the remote default branch when the local one is behind", () => {
    const repo = behindRemote()
    repo.git("checkout", "main")

    const lines = repo.catchup("facts").stdout.split("\n")

    expect(lines).toContain("scope: repo")
    expect(lines).toContain("branch: main")
    expect(lines).toContain("commits: 5")
  })

  test("lists 20 changes since the user's last commit and no line for more", () => {
    const result = changesAfterOwnCommit(20).catchup("facts")

    const lines = result.stdout.split("\n")
    expect(lines).toContain("since your last commit: 20")
    expect(lines.filter((line) => /^- [0-9a-f]+ /.test(line)).length).toBe(20)
    expect(result.stdout).not.toContain(" more")
  })

  test("lists 20 of 21 changes and counts the rest", () => {
    const result = changesAfterOwnCommit(21).catchup("facts")

    const lines = result.stdout.split("\n")
    expect(lines).toContain("since your last commit: 21")
    expect(lines.filter((line) => /^- [0-9a-f]+ /.test(line)).length).toBe(20)
    expect(lines).toContain("- and 1 more")
  })

  test("reads a history whose log is larger than one mebibyte", () => {
    const repo = sandbox()
    repo.fastImport(bulkHistory(8_000, 1))

    const result = repo.catchup("facts", "--scope", "repo")

    expect(result.status).toBe(0)
    expect(result.stdout.split("\n")).toContain("commits: 8000")
  })

  test("reads a repo whose list of tracked files is larger than one mebibyte", () => {
    const repo = sandbox()
    repo.fastImport(bulkHistory(1, 12_000))

    const result = repo.catchup("facts", "--scope", "repo", "--user", "nobody@example.com")

    expect(result.status).toBe(0)
    expect(result.stdout.split("\n")).toContain(`- ${BULK_DIRECTORY}/ 12000 files`)
  })

  test("counts the changes after the user's last commit up to the remote default branch", () => {
    const repo = sandbox()
    repo.commit("README.md", "2026-11-02", "bob", "feat: start")
    repo.commit("skills/own.md", "2026-11-03", "ada", "feat: own")
    repo.commit("skills/o1.md", "2026-11-04", "bob", "fix: other one")
    repo.commit("skills/o2.md", "2026-11-05", "bob", "fix: other two")
    repo.git("update-ref", "refs/remotes/origin/main", "main")
    repo.git("symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main")
    repo.git("reset", "--hard", "--quiet", "main~3")

    const lines = repo.catchup("facts").stdout.split("\n")

    expect(lines).toContain("commits: 4")
    expect(lines).toContain("your commits: 1")
    expect(lines).toContain("since your last commit: 2")
    expect(lines.some((line) => line.endsWith("fix: other two (Bob)"))).toBe(true)
  })

  test("counts the unpushed commits of the default branch and lists none of them as changes", () => {
    const repo = sandbox()
    repo.commit("README.md", "2026-11-02", "bob", "feat: start")
    repo.commit("skills/a.md", "2026-11-03", "bob", "fix: a")
    repo.git("update-ref", "refs/remotes/origin/main", "main")
    repo.git("symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main")
    repo.commit("skills/own1.md", "2026-11-04", "ada", "feat: own one")
    repo.commit("skills/own2.md", "2026-11-05", "ada", "feat: own two")

    const result = repo.catchup("facts")

    const lines = result.stdout.split("\n")
    expect(lines).toContain("commits: 4")
    expect(lines).toContain("your commits: 2")
    expect(lines).toContain("since your last commit: 0")
    expect(result.stdout).not.toContain("feat: own")
  })

  test("counts the remote default branch from a ticket branch, whatever the local one holds", () => {
    const repo = history()
    repo.git("update-ref", "refs/remotes/origin/main", "main~1")
    repo.git("symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main")

    const result = repo.catchup("facts", "--scope", "repo")

    const lines = result.stdout.split("\n")
    expect(lines).toContain("commits: 2")
    expect(lines).toContain("since your last commit: 0")
    expect(result.stdout).not.toContain("feat: x")
  })

  test("says how many commits the default branch is ahead of its remote", () => {
    const repo = remoteDiffers()
    repo.commit("skills/own1.md", "2026-11-04", "ada", "feat: own one")
    repo.commit("skills/own2.md", "2026-11-05", "ada", "feat: own two")

    const lines = repo.catchup("facts").stdout.split("\n")

    expect(lines[lines.indexOf("branch: main") + 1]).toBe("ahead of remote: 2")
    expect(lines.some((line) => line.startsWith("behind remote:"))).toBe(false)
  })

  test("says how many commits the default branch is behind its remote", () => {
    const repo = remoteDiffers()
    repo.commit("skills/o1.md", "2026-11-04", "bob", "fix: other one")
    repo.commit("skills/o2.md", "2026-11-05", "bob", "fix: other two")
    repo.commit("skills/o3.md", "2026-11-06", "bob", "fix: other three")
    repo.git("update-ref", "refs/remotes/origin/main", "main")
    repo.git("reset", "--hard", "--quiet", "main~3")

    const lines = repo.catchup("facts").stdout.split("\n")

    expect(lines[lines.indexOf("branch: main") + 1]).toBe("behind remote: 3")
    expect(lines.some((line) => line.startsWith("ahead of remote:"))).toBe(false)
  })

  test("says both counts when the default branch and its remote diverge", () => {
    const repo = remoteDiffers()
    repo.commit("skills/o1.md", "2026-11-04", "bob", "fix: other one")
    repo.commit("skills/o2.md", "2026-11-05", "bob", "fix: other two")
    repo.git("update-ref", "refs/remotes/origin/main", "main")
    repo.git("reset", "--hard", "--quiet", "main~2")
    repo.commit("skills/own.md", "2026-11-06", "ada", "feat: own")

    const lines = repo.catchup("facts").stdout.split("\n")

    const at = lines.indexOf("branch: main")
    expect(lines[at + 1]).toBe("ahead of remote: 1")
    expect(lines[at + 2]).toBe("behind remote: 2")
  })

  test("prints neither line when the default branch equals its remote", () => {
    const result = remoteDiffers().catchup("facts")

    expect(result.stdout).not.toContain("ahead of remote")
    expect(result.stdout).not.toContain("behind remote")
  })

  test("prints neither line in a repo with no remote", () => {
    const repo = history()
    repo.git("checkout", "main")

    const result = repo.catchup("facts")

    expect(result.stdout).not.toContain("ahead of remote")
    expect(result.stdout).not.toContain("behind remote")
  })

  test("prints neither line from a ticket branch", () => {
    const repo = remoteDiffers()
    repo.commit("skills/own.md", "2026-11-04", "ada", "feat: own")
    repo.git("checkout", "-b", "feat/5-x")

    const result = repo.catchup("facts", "--scope", "repo")

    expect(result.stdout).not.toContain("ahead of remote")
    expect(result.stdout).not.toContain("behind remote")
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

  test("refuses a bar whose count is not a number", () => {
    const result = sandbox().catchup("bar", "x", "abc", "3")

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("done must be an integer")
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
