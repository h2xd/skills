import { spawnSync } from "node:child_process"
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, test } from "node:test"
import { expect } from "../../scripts/expect.ts"
import { envWithoutGit } from "../../scripts/test-env.ts"

const HOOKS = join(import.meta.dirname, "..", "githooks")

let repo: string

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "githooks-"))
  mkdirSync(join(repo, ".githooks"))
  mkdirSync(join(repo, "scripts"))
})

afterEach(() => {
  rmSync(repo, { recursive: true, force: true })
})

/** Install a hook and the lint script it calls. The lint appends to `log`. */
function install(hook: string, lint: string, lintExit = 0) {
  writeFileSync(join(repo, ".githooks", hook), readFileSync(join(HOOKS, hook), "utf8"))
  writeFileSync(
    join(repo, "scripts", lint),
    `import { appendFileSync } from "node:fs"\n` +
      `appendFileSync("log", "lint " + process.argv.slice(2).join(" ") + "\\n")\n` +
      `process.exit(${lintExit})\n`,
  )
}

/** Add an executable file to `.githooks/<hook>.d/` that logs its name and arguments. */
function addScript(hook: string, name: string, exit = 0, executable = true) {
  const dir = join(repo, ".githooks", `${hook}.d`)
  mkdirSync(dir, { recursive: true })
  const path = join(dir, name)
  writeFileSync(path, `#!/bin/sh\necho "${name} $*" >> log\nexit ${exit}\n`)
  if (executable) chmodSync(path, 0o755)
}

function run(hook: string, ...args: string[]) {
  const result = spawnSync("sh", [join(repo, ".githooks", hook), ...args], {
    cwd: repo,
    encoding: "utf8",
    env: envWithoutGit(),
  })
  let log: string[] = []
  try {
    log = readFileSync(join(repo, "log"), "utf8").trim().split("\n").map((line) => line.trim())
  } catch {}
  return { status: result.status, stderr: result.stderr, log }
}

describe("the commit-msg hook", () => {
  test("runs the lint, then each executable in commit-msg.d in name order, with the message path", () => {
    install("commit-msg", "lint-commit-message.ts")
    addScript("commit-msg", "20-second")
    addScript("commit-msg", "10-first")
    addScript("commit-msg", "15-not-executable", 0, false)
    const result = run("commit-msg", "MSG")
    expect(result.status).toBe(0)
    expect(result.log).toEqual(["lint MSG", "10-first MSG", "20-second MSG"])
  })

  test("fails on the first failure and runs nothing after it", () => {
    install("commit-msg", "lint-commit-message.ts")
    addScript("commit-msg", "10-bad", 3)
    addScript("commit-msg", "20-never")
    const result = run("commit-msg", "MSG")
    expect(result.status).toBe(1)
    expect(result.log).toEqual(["lint MSG", "10-bad MSG"])
  })

  test("skips commit-msg.d when the lint fails", () => {
    install("commit-msg", "lint-commit-message.ts", 1)
    addScript("commit-msg", "10-never")
    const result = run("commit-msg", "MSG")
    expect(result.status).toBe(1)
    expect(result.log).toEqual(["lint MSG"])
  })

  test("passes when commit-msg.d does not exist", () => {
    install("commit-msg", "lint-commit-message.ts")
    expect(run("commit-msg", "MSG").status).toBe(0)
  })
})

describe("the pre-commit hook", () => {
  test("runs the docs check, then each executable in pre-commit.d in name order", () => {
    install("pre-commit", "lint-docs.ts")
    addScript("pre-commit", "20-second")
    addScript("pre-commit", "10-first")
    addScript("pre-commit", "15-not-executable", 0, false)
    const result = run("pre-commit")
    expect(result.status).toBe(0)
    expect(result.log).toEqual(["lint", "10-first", "20-second"])
  })

  test("fails on the first failure and runs nothing after it", () => {
    install("pre-commit", "lint-docs.ts")
    addScript("pre-commit", "10-bad", 1)
    addScript("pre-commit", "20-never")
    const result = run("pre-commit")
    expect(result.status).toBe(1)
    expect(result.log).toEqual(["lint", "10-bad"])
  })

  test("skips pre-commit.d when the docs check fails", () => {
    install("pre-commit", "lint-docs.ts", 1)
    addScript("pre-commit", "10-never")
    const result = run("pre-commit")
    expect(result.status).toBe(1)
    expect(result.log).toEqual(["lint"])
  })

  test("ships a commented example that unsets the GIT_ variables", () => {
    const text = readFileSync(join(HOOKS, "pre-commit"), "utf8")
    for (const name of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_PREFIX", "GIT_COMMON_DIR"]) {
      expect(text).toContain(`unset ${name}`)
    }
    const example = text.split("\n").filter((line) => line.includes("unset "))
    expect(example.every((line) => line.startsWith("#"))).toBe(true)
  })
})
