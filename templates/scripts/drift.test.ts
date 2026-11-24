import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, test } from "node:test"
import { expect } from "../../scripts/expect.ts"

const SCRIPT = join(import.meta.dirname, "drift.ts")

let plugin: string
let repo: string

function put(root: string, path: string, content: string) {
  mkdirSync(join(root, path, ".."), { recursive: true })
  writeFileSync(join(root, path), content)
}

function drift() {
  return spawnSync(process.execPath, [SCRIPT, plugin, repo], { encoding: "utf8" })
}

beforeEach(() => {
  plugin = mkdtempSync(join(tmpdir(), "drift-plugin-"))
  repo = mkdtempSync(join(tmpdir(), "drift-repo-"))
  put(plugin, ".claude-plugin/plugin.json", JSON.stringify({ version: "0.2.0" }))
  put(plugin, "templates/scripts/a.ts", "a\n")
  put(plugin, "templates/scripts/a.test.ts", "test\n")
  put(plugin, "templates/githooks/pre-commit", "hook\n")
  put(repo, "agents.config.json", JSON.stringify({ version: "0.2.0" }))
  put(repo, "scripts/a.ts", "a\n")
  put(repo, ".githooks/pre-commit", "hook\n")
})

afterEach(() => {
  rmSync(plugin, { recursive: true, force: true })
  rmSync(repo, { recursive: true, force: true })
})

describe("drift.ts <plugin root> <repo root>", () => {
  test("exits 0 when the version and every copy match, and ignores tests", () => {
    const run = drift()
    expect(run.stdout.trim()).toBe("ok: the copies match plugin 0.2.0")
    expect(run.status).toBe(0)
  })

  test("exits 0 and names an older version and a changed file", () => {
    put(repo, "agents.config.json", JSON.stringify({ version: "0.1.0" }))
    put(repo, "scripts/a.ts", "edited\n")
    const run = drift()
    expect(run.status).toBe(0)
    expect(run.stdout).toContain("(repo 0.1.0, plugin 0.2.0)")
    expect(run.stdout).toContain("changed: scripts/a.ts")
  })

  test("ignores a seed that the repo copied and changed, because the repo owns it", () => {
    put(plugin, "templates/seeds/lang-ts-base/SKILL.md", "seed\n")
    put(repo, ".claude/skills/lang-ts-base/SKILL.md", "adapted to the repo\n")
    const run = drift()
    expect(run.stdout.trim()).toBe("ok: the copies match plugin 0.2.0")
    expect(run.status).toBe(0)
  })

  test("exits 1 and names a script that the repo lacks", () => {
    put(plugin, "templates/scripts/b.ts", "b\n")
    const run = drift()
    expect(run.status).toBe(1)
    expect(run.stdout).toContain("missing: scripts/b.ts")
  })

  test("exits 0 for a repo without .githooks, a husky repo", () => {
    rmSync(join(repo, ".githooks"), { recursive: true })
    expect(drift().status).toBe(0)
  })

  test("treats a repo config without a version as older, and exits 0", () => {
    put(repo, "agents.config.json", "{}")
    const run = drift()
    expect(run.stdout).toContain("repo no version")
    expect(run.status).toBe(0)
  })

  test("fails with usage when a root is missing", () => {
    const run = spawnSync(process.execPath, [SCRIPT], { encoding: "utf8" })
    expect(run.status).toBe(2)
    expect(run.stderr).toContain("usage: node scripts/drift.ts")
  })
})
