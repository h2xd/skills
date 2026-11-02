import { spawnSync } from "node:child_process"
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, test } from "node:test"
import { expect } from "./expect.ts"

const ROOT = join(import.meta.dirname, "..")
const SCRIPT = join(ROOT, "scripts", "install-codex.sh")
const SKILLS = readdirSync(join(ROOT, "skills")).sort()

let home: string

function install(...flags: string[]) {
  return spawnSync("sh", [SCRIPT, "--project", home, ...flags], { encoding: "utf8" })
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "cat-cafe-"))
})

afterEach(() => {
  rmSync(home, { recursive: true, force: true })
})

describe("install-codex.sh", () => {
  test("links every skill, the templates and the agents folder", () => {
    expect(install().status).toBe(0)
    expect(readdirSync(join(home, ".agents", "skills")).sort()).toEqual(SKILLS)
    expect(readlinkSync(join(home, ".agents", "skills", "plan-grill"))).toBe(join(ROOT, "skills", "plan-grill"))
    expect(lstatSync(join(home, ".agents", "templates")).isSymbolicLink()).toBe(true)
    expect(lstatSync(join(home, ".agents", "agents")).isSymbolicLink()).toBe(true)
  })

  test("turns each agent into the TOML Codex reads", () => {
    install()
    for (const name of ["comment-reaper", "skill-polisher"]) {
      const toml = readFileSync(join(home, ".codex", "agents", `${name}.toml`), "utf8")
      expect(toml).toContain(`name = "${name}"`)
      expect(toml).toContain('description = "')
      expect(toml).toContain("developer_instructions = '''")
      expect(toml.trimEnd().endsWith("'''")).toBe(true)
    }
  })

  test("runs again without skipping its own files, and leaves a stranger's alone", () => {
    install()
    mkdirSync(join(home, ".agents", "skills", "nap-planner"))
    rmSync(join(home, ".agents", "skills", "what"))
    mkdirSync(join(home, ".agents", "skills", "what"))
    const again = install()
    expect(again.stdout).toContain("skipped 1")
    expect(again.stderr).toContain(".agents/skills/what: something else is there")
    expect(lstatSync(join(home, ".agents", "skills", "what")).isSymbolicLink()).toBe(false)
  })

  test("copies with --copy, and a second run still knows its copies", () => {
    expect(install("--copy").status).toBe(0)
    expect(lstatSync(join(home, ".agents", "skills", "next")).isDirectory()).toBe(true)
    expect(install("--copy").stdout).toContain("skipped 0")
  })

  test("uninstalls only what it installed", () => {
    install()
    mkdirSync(join(home, ".agents", "skills", "nap-planner"))
    expect(install("--uninstall").status).toBe(0)
    expect(readdirSync(join(home, ".agents", "skills"))).toEqual(["nap-planner"])
    expect(existsSync(join(home, ".agents", "templates"))).toBe(false)
    expect(readdirSync(join(home, ".codex", "agents"))).toEqual([])
  })
})
