import { spawnSync } from "node:child_process"
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { envWithoutGit } from "../../../scripts/test-env.ts"

const SCRIPTS = join(import.meta.dirname, "..")
const TODAY = "2026-11-25"
const sandboxes: string[] = []

afterEach(() => {
  for (const dir of sandboxes.splice(0)) rmSync(dir, { recursive: true, force: true })
})

type Repo = {
  dir: string
  skills(...args: string[]): { status: number; stdout: string; stderr: string }
  page(): string
  addSkill(name: string): void
  writePage(rows: [string, string][]): void
}

function sandbox(config: object = {}): Repo {
  const dir = mkdtempSync(join(tmpdir(), "skills-"))
  sandboxes.push(dir)
  cpSync(SCRIPTS, join(dir, "scripts"), {
    recursive: true,
    filter: (source) => !source.endsWith(".test.ts"),
  })
  writeFileSync(join(dir, "package.json"), '{"type":"module"}\n')
  writeFileSync(join(dir, "agents.config.json"), `${JSON.stringify(config)}\n`)
  const repo: Repo = {
    dir,
    skills(...args) {
      const result = spawnSync(
        process.execPath,
        ["scripts/skills.ts", ...args, "--today", TODAY],
        { cwd: dir, encoding: "utf8", env: envWithoutGit() },
      )
      return {
        status: result.status ?? 1,
        stdout: result.stdout.trimEnd(),
        stderr: result.stderr.trimEnd(),
      }
    },
    page: () => readFileSync(join(dir, "docs/agents/skills.md"), "utf8"),
    writePage(rows) {
      mkdirSync(join(dir, "docs/agents"), { recursive: true })
      const lines = rows.map(([skill, due]) => `| ${skill} | - | 2026-01-01 | ${due} |`)
      writeFileSync(
        join(dir, "docs/agents/skills.md"),
        ["# Skills", "", "| Skill | Technology | Updated | Review due |", "|---|---|---|---|", ...lines, ""].join("\n"),
      )
    },
    addSkill(name) {
      const folder = join(dir, ".claude/skills", name)
      mkdirSync(folder, { recursive: true })
      writeFileSync(join(folder, "SKILL.md"), `---\nname: ${name}\n---\n`)
    },
  }
  return repo
}

describe("skills.ts due", () => {
  test("creates the Skills page with a row per repo-local skill on the first run", () => {
    const repo = sandbox()
    repo.addSkill("release")
    repo.addSkill("next")

    const result = repo.skills("due")

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("created docs/agents/skills.md with 2 rows")
    expect(repo.page()).toContain("| next | - | 2026-11-25 |")
    expect(repo.page()).toContain("| release | - | 2026-11-25 |")
  })

  test("writes the page at the path the config names", () => {
    const repo = sandbox({ skills: { page: "docs/my-skills.md" } })
    repo.addSkill("release")

    repo.skills("due")

    expect(existsSync(join(repo.dir, "docs/my-skills.md"))).toBe(true)
    expect(existsSync(join(repo.dir, "docs/agents/skills.md"))).toBe(false)
  })

  test("counts a linked skill folder as repo-local", () => {
    const repo = sandbox()
    mkdirSync(join(repo.dir, "plugin/linked"), { recursive: true })
    writeFileSync(join(repo.dir, "plugin/linked/SKILL.md"), "---\nname: linked\n---\n")
    mkdirSync(join(repo.dir, ".claude/skills"), { recursive: true })
    symlinkSync(join(repo.dir, "plugin/linked"), join(repo.dir, ".claude/skills/linked"))

    repo.skills("due")

    expect(repo.page()).toContain("| linked | - |")
  })
})

describe("skills.ts due, the list", () => {
  test("prints all due skills, oldest first, in one list", () => {
    const repo = sandbox()
    for (const name of ["a", "b", "c", "d"]) repo.addSkill(name)
    repo.writePage([["a", "2026-11-20"], ["b", "2026-10-01"], ["c", "2026-12-30"], ["d", "2026-11-25"]])

    const result = repo.skills("due")

    expect(result.stdout).toBe("3 due\nb 2026-10-01\na 2026-11-20\nd 2026-11-25")
  })

  test("prints none when no review is due", () => {
    const repo = sandbox()
    repo.addSkill("a")
    repo.writePage([["a", "2026-12-30"]])

    expect(repo.skills("due").stdout).toBe("0 due")
  })

  test("adds a row for a skill that is new and counts it as not due", () => {
    const repo = sandbox()
    repo.addSkill("a")
    repo.addSkill("fresh")
    repo.writePage([["a", "2026-11-01"]])

    const result = repo.skills("due")

    expect(result.stdout).toBe("1 due\na 2026-11-01")
    expect(repo.page()).toContain("| fresh | - | 2026-11-25 | 2026-12-05 |")
  })
})

describe("the review interval", () => {
  test("is 10 days in the template config, and sets the due date of a new row", () => {
    const template = JSON.parse(
      readFileSync(join(SCRIPTS, "..", "agents.config.json"), "utf8"),
    )
    expect(template.skills.reviewIntervalDays).toBe(10)
    const repo = sandbox(template)
    repo.addSkill("release")

    repo.skills("due")

    expect(repo.page()).toContain("| release | - | 2026-11-25 | 2026-12-05 |")
  })

  test("follows the interval the repo sets", () => {
    const repo = sandbox({ skills: { reviewIntervalDays: 3 } })
    repo.addSkill("release")

    repo.skills("due")

    expect(repo.page()).toContain("| release | - | 2026-11-25 | 2026-11-28 |")
  })
})
