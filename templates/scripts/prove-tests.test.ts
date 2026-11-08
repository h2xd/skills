import { afterEach, beforeEach, describe, test } from "node:test"
import { expect } from "../../scripts/expect.ts"
import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const SCRIPT = join(import.meta.dirname, "prove-tests.sh")

const LIB = `max() { if [ "$1" -gt "$2" ]; then echo "$1"; else echo "$2"; fi; }\n`
const TESTS = `. ./lib.sh\n[ "$(max 3 2)" = 3 ] && [ "$(max 2 3)" = 3 ]\n`

let repo: string
let mutants: string

function sh(command: string, cwd = repo) {
  return spawnSync("sh", ["-c", command], { cwd, encoding: "utf8" })
}

function mutant(id: string, from: string, to: string) {
  writeFileSync(
    join(mutants, `${id}.patch`),
    `--- a/lib.sh\n+++ b/lib.sh\n@@ -1 +1 @@\n-${from}+${to}`,
  )
}

function prove(...args: string[]) {
  return spawnSync("sh", [SCRIPT, "--mutants", mutants, "--test", "sh test.sh", ...args], {
    cwd: repo,
    encoding: "utf8",
  })
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "prove-tests-repo-"))
  mutants = mkdtempSync(join(tmpdir(), "prove-tests-mutants-"))
  writeFileSync(join(repo, "lib.sh"), LIB)
  writeFileSync(join(repo, "test.sh"), TESTS)
  sh("git init -q && git add -A && git -c user.name=t -c user.email=t@t commit -qm init")
})

afterEach(() => {
  rmSync(repo, { recursive: true, force: true })
  rmSync(mutants, { recursive: true, force: true })
})

describe("prove-tests.sh", () => {
  test("reports each mutant as killed, survived, timeout or invalid", { timeout: 30_000 }, () => {
    mutant("001", LIB, LIB.replace("-gt", "-lt"))
    mutant("002", LIB, LIB.replace("-gt", "-ge"))
    mutant("003", LIB, LIB.replace(`echo "$1"; else`, `while :; do :; done; else`))
    mutant("004", "no such line\n", "x\n")
    const run = prove("--timeout-factor", "1")
    expect(run.status).toBe(0)
    const statuses = run.stdout.trim().split("\n").map((line) => line.split("\t").slice(0, 2).join(" "))
    expect(statuses).toEqual(["001 killed", "002 survived", "003 timeout", "004 invalid"])
  })

  test("applies a patch that has no context lines", () => {
    writeFileSync(join(repo, "lib.sh"), `# top\n${LIB}# bottom\n`)
    sh("git add -A && git -c user.name=t -c user.email=t@t commit -qm three")
    writeFileSync(
      join(mutants, "001.patch"),
      `--- a/lib.sh\n+++ b/lib.sh\n@@ -2 +2 @@\n-${LIB}+${LIB.replace("-gt", "-lt")}`,
    )
    expect(prove().stdout).toStartWith("001\tkilled\t")
  })

  test("applies a zero-context patch that carries a diffstat", () => {
    writeFileSync(join(repo, "lib.sh"), `# top\n${LIB}# bottom\n`)
    sh("git add -A && git -c user.name=t -c user.email=t@t commit -qm three")
    writeFileSync(
      join(mutants, "001.patch"),
      ` lib.sh | 2 +-\n 1 file changed\n\n--- a/lib.sh\n+++ b/lib.sh\n@@ -2 +2 @@\n-${LIB}+${LIB.replace("-gt", "-lt")}`,
    )
    expect(prove().stdout).toStartWith("001\tkilled\t")
  })

  test("keeps a patch with context anchored, so a moved first line is invalid", () => {
    writeFileSync(join(repo, "notes.txt"), "z\nb\nc\nd\ne\nf\ng\nx\na\nb\nc\n")
    sh("git add -A && git -c user.name=t -c user.email=t@t commit -qm moved")
    writeFileSync(join(mutants, "001.patch"), "--- a/notes.txt\n+++ b/notes.txt\n@@ -1,3 +1,3 @@\n-a\n+A\n b\n c\n")
    expect(prove().stdout).toStartWith("001\tinvalid\t")
  })

  test("never touches the caller's files and removes its worktree", () => {
    mutant("001", LIB, LIB.replace("-gt", "-lt"))
    prove()
    expect(readFileSync(join(repo, "lib.sh"), "utf8")).toBe(LIB)
    expect(sh("git status --porcelain").stdout).toBe("")
    expect(sh("git worktree list").stdout.trim().split("\n")).toHaveLength(1)
  })

  test("mutates the uncommitted state, untracked files included", () => {
    writeFileSync(join(repo, "lib.sh"), LIB.replace("-gt", "-ge"))
    mkdirSync(join(repo, "more"))
    writeFileSync(join(repo, "more", "test.sh"), `. ./lib.sh\n[ "$(max 1 1)" = 1 ]\n`)
    mutant("001", LIB.replace("-gt", "-ge"), LIB.replace("-gt", "-lt"))
    writeFileSync(
      join(mutants, "002.patch"),
      "--- a/more/test.sh\n+++ b/more/test.sh\n@@ -2 +2 @@\n-[ \"$(max 1 1)\" = 1 ]\n+[ \"$(max 1 1)\" = 2 ]\n",
    )
    const run = prove()
    expect(run.stdout).toStartWith("001\tkilled\t")
    expect(run.stdout).toContain("002\tsurvived\t")
  })

  test("runs only the listed mutants", () => {
    mutant("001", LIB, LIB.replace("-gt", "-lt"))
    mutant("002", LIB, LIB.replace("-gt", "-ge"))
    expect(prove("--only", "002").stdout).toStartWith("002\tsurvived")
    expect(prove("--only", "002").stdout).not.toContain("001")
  })

  test("marks a mutant invalid when the check command fails on it", () => {
    mutant("001", LIB, LIB.replace("-gt", "-lt"))
    expect(prove("--check", "false").stdout).toStartWith("001\tinvalid")
  })

  test("stops with exit 3 when the tests already fail", () => {
    writeFileSync(join(repo, "test.sh"), "exit 1\n")
    mutant("001", LIB, LIB.replace("-gt", "-lt"))
    const run = prove()
    expect(run.status).toBe(3)
    expect(run.stdout).toStartWith("baseline\tred")
  })

  test("writes the results to --out as well", () => {
    mutant("001", LIB, LIB.replace("-gt", "-lt"))
    const out = join(mutants, "results.tsv")
    prove("--out", out)
    expect(readFileSync(out, "utf8")).toStartWith("001\tkilled")
  })
})
