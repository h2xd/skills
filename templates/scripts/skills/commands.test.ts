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

type Result = { status: number; stdout: string; stderr: string }

type Repo = {
  dir: string
  skills(...args: string[]): Result
  skillsOn(date: string, ...args: string[]): Result
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
      return repo.skillsOn(TODAY, ...args)
    },
    skillsOn(date, ...args) {
      const result = spawnSync(
        process.execPath,
        ["scripts/skills.ts", ...args, "--today", date],
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

  test("creates an empty page in a repo with no skill folder", () => {
    const repo = sandbox()

    const result = repo.skills("due")

    expect(result.status).toBe(0)
    expect(result.stdout).toBe("created docs/agents/skills.md with 0 rows\nlast run: none\n0 due")
  })

  test("gives no row to a folder that holds no SKILL.md", () => {
    const repo = sandbox()
    repo.addSkill("release")
    mkdirSync(join(repo.dir, ".claude/skills/notes"), { recursive: true })
    writeFileSync(join(repo.dir, ".claude/skills/notes/draft.md"), "notes\n")

    const result = repo.skills("due")

    expect(result.stdout).toContain("created docs/agents/skills.md with 1 rows")
    expect(repo.page()).not.toContain("| notes |")
  })
})

describe("skills.ts due, the last run", () => {
  test("prints none and writes no date on a plain run", () => {
    const repo = sandbox()
    repo.addSkill("a")

    const result = repo.skills("due")

    expect(result.stdout).toContain("last run: none")
    expect(repo.page()).not.toContain("Last run:")
  })

  test("prints the same last run on two plain runs on two days", () => {
    const repo = sandbox()
    repo.addSkill("a")
    repo.skillsOn("2026-11-20", "due", "--record-run")

    const first = repo.skillsOn("2026-11-25", "due")
    const second = repo.skillsOn("2026-11-30", "due")

    expect(first.stdout).toContain("last run: 2026-11-20")
    expect(second.stdout).toContain("last run: 2026-11-20")
    expect(repo.page()).toContain("Last run: 2026-11-20")
  })

  test("still creates the page and adds the rows on a plain run", () => {
    const repo = sandbox()
    repo.addSkill("a")

    const result = repo.skills("due")

    expect(result.stdout).toContain("created docs/agents/skills.md with 1 rows")
    expect(repo.page()).toContain("| a | - | 2026-11-25 | 2026-12-05 |")
  })

  test("--record-run writes today above the table and prints it", () => {
    const repo = sandbox()
    repo.addSkill("a")

    const result = repo.skills("due", "--record-run")

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("recorded last run: 2026-11-25")
    expect(repo.page()).toContain("\nLast run: 2026-11-25\n")
    expect(repo.page().indexOf("Last run:")).toBeLessThan(repo.page().indexOf("| Skill |"))
  })

  test("--record-run prints only the recorded line when a skill is due", () => {
    const repo = sandbox()
    repo.addSkill("a")
    repo.skillsOn("2026-11-25", "due")

    const result = repo.skillsOn("2026-12-10", "due", "--record-run")

    expect(result.stdout).toBe("recorded last run: 2026-12-10")
  })

  test("--record-run moves the date that a plain run printed", () => {
    const repo = sandbox()
    repo.addSkill("a")
    repo.skillsOn("2026-11-20", "due", "--record-run")
    expect(repo.skillsOn("2026-11-25", "due").stdout).toContain("last run: 2026-11-20")

    repo.skillsOn("2026-11-25", "due", "--record-run")

    expect(repo.skillsOn("2026-11-30", "due").stdout).toContain("last run: 2026-11-25")
    expect(repo.page()).not.toContain("Last run: 2026-11-20")
  })

  test("is not moved by reviewed", () => {
    const repo = sandbox()
    repo.addSkill("a")
    repo.skillsOn("2026-11-20", "due", "--record-run")

    repo.skillsOn("2026-11-25", "reviewed", "a")

    expect(repo.page()).toContain("Last run: 2026-11-20")
    expect(repo.page()).toContain("| a | - | 2026-11-25 | 2026-12-05 |")
  })

  test("keeps the text around the table and the rows", () => {
    const repo = sandbox()
    repo.addSkill("a")
    repo.skillsOn("2026-11-20", "due", "--record-run")
    const edited = repo.page().replace("# Skills", "# Skills\n\nA note from a person.")
    writeFileSync(join(repo.dir, "docs/agents/skills.md"), `${edited}\nAfter the table.\n`)

    repo.skillsOn("2026-11-25", "due", "--record-run")

    expect(repo.page()).toContain("A note from a person.")
    expect(repo.page()).toContain("After the table.")
    expect(repo.page()).toContain("| a | - | 2026-11-20 | 2026-11-30 |")
  })

  test("prints none for an existing page that has no Last run line", () => {
    const repo = sandbox()
    repo.addSkill("a")
    repo.writePage([["a", "2026-12-30"]])

    const result = repo.skills("due")

    expect(result.stdout).toBe("last run: none\n0 due")
    expect(repo.page()).not.toContain("Last run:")
  })
})

describe("skills.ts due, a row that does not parse", () => {
  test("fails with the line number and leaves the page unchanged", () => {
    const repo = sandbox()
    repo.addSkill("tech-zod")
    mkdirSync(join(repo.dir, "docs/agents"), { recursive: true })
    const page = [
      "# Skills",
      "",
      "| Skill | Technology | Updated | Review due |",
      "|---|---|---|---|",
      "| tech-zod | zod | 2026-10-01 | 2026-12-1 |",
      "",
    ].join("\n")
    writeFileSync(join(repo.dir, "docs/agents/skills.md"), page)

    const result = repo.skills("due")

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("line 5")
    expect(result.stderr).toContain("2026-12-1")
    expect(repo.page()).toBe(page)
  })

  test("fails on an empty Technology cell, for reviewed too", () => {
    const repo = sandbox()
    repo.addSkill("a")
    mkdirSync(join(repo.dir, "docs/agents"), { recursive: true })
    const page = "| Skill | Technology | Updated | Review due |\n|---|---|---|---|\n| a || 2026-10-01 | 2026-10-11 |\n"
    writeFileSync(join(repo.dir, "docs/agents/skills.md"), page)

    const result = repo.skills("reviewed", "a")

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("line 3")
    expect(repo.page()).toBe(page)
  })
})

describe("skills.ts due, the list", () => {
  test("prints all due skills, oldest first, in one list", () => {
    const repo = sandbox()
    for (const name of ["a", "b", "c", "d"]) repo.addSkill(name)
    repo.writePage([["a", "2026-11-20"], ["b", "2026-10-01"], ["c", "2026-12-30"], ["d", "2026-11-25"]])

    const result = repo.skills("due")

    expect(result.stdout).toBe("last run: none\n3 due\nb 2026-10-01\na 2026-11-20\nd 2026-11-25")
  })

  test("prints none when no review is due", () => {
    const repo = sandbox()
    repo.addSkill("a")
    repo.writePage([["a", "2026-12-30"]])

    expect(repo.skills("due").stdout).toBe("last run: none\n0 due")
  })

  test("adds a row for a skill that is new and counts it as not due", () => {
    const repo = sandbox()
    repo.addSkill("a")
    repo.addSkill("fresh")
    repo.writePage([["a", "2026-11-01"]])

    const result = repo.skills("due")

    expect(result.stdout).toBe("last run: none\n1 due\na 2026-11-01")
    expect(repo.page()).toContain("| fresh | - | 2026-11-25 | 2026-12-05 |")
  })
})

describe("skills.ts reviewed", () => {
  test("moves the review date and the due date of one skill only", () => {
    const repo = sandbox()
    repo.addSkill("a")
    repo.addSkill("b")
    repo.writePage([["a", "2026-11-01"], ["b", "2026-11-02"]])

    const result = repo.skills("reviewed", "a")

    expect(result.status).toBe(0)
    expect(result.stdout).toBe("reviewed a, next review 2026-12-05")
    expect(repo.page()).toContain("| a | - | 2026-11-25 | 2026-12-05 |")
    expect(repo.page()).toContain("| b | - | 2026-01-01 | 2026-11-02 |")
  })

  test("sets the due date from the interval the repo sets", () => {
    const repo = sandbox({ skills: { reviewIntervalDays: 3 } })
    repo.addSkill("a")
    repo.writePage([["a", "2026-11-01"]])

    const result = repo.skills("reviewed", "a")

    expect(result.stdout).toBe("reviewed a, next review 2026-11-28")
    expect(repo.page()).toContain("| a | - | 2026-11-25 | 2026-11-28 |")
  })

  test("refuses a second skill name and leaves the page unchanged", () => {
    const repo = sandbox()
    repo.addSkill("a")
    repo.addSkill("b")
    repo.writePage([["a", "2026-11-01"], ["b", "2026-11-02"]])
    const before = repo.page()

    const result = repo.skills("reviewed", "a", "b")

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("usage: node scripts/skills.ts reviewed <skill>")
    expect(repo.page()).toBe(before)
  })

  test("leaves every review date alone when only due runs", () => {
    const repo = sandbox()
    repo.addSkill("a")
    repo.writePage([["a", "2026-11-01"]])

    repo.skills("due")

    expect(repo.page()).toContain("| a | - | 2026-01-01 | 2026-11-01 |")
  })

  test("refuses a skill that is not repo-local and writes no row for it", () => {
    const repo = sandbox()
    repo.addSkill("a")
    repo.writePage([["a", "2026-11-01"]])

    const result = repo.skills("reviewed", "plugin-skill")

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("plugin-skill is not a repo-local skill")
    expect(repo.page()).not.toContain("plugin-skill")
  })

  test("prints usage when no skill is given", () => {
    const result = sandbox().skills("reviewed")

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("usage: node scripts/skills.ts reviewed <skill>")
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

  test("keeps a padded table the way a formatter writes it", () => {
    const repo = sandbox()
    repo.addSkill("nitro")
    mkdirSync(join(repo.dir, "docs/agents"), { recursive: true })
    writeFileSync(
      join(repo.dir, "docs/agents/skills.md"),
      [
        "# Skills",
        "",
        "| Skill   | Technology | Updated    | Review due |",
        "| ------- | ---------- | ---------- | ---------- |",
        "| nitro   | Node       | 2026-10-01 | 2026-10-11 |",
        "",
      ].join("\n"),
    )

    const result = repo.skills("due")

    expect(result.stdout).toBe("last run: none\n1 due\nnitro 2026-10-11")
    expect((repo.page().match(/\| Skill /g) ?? []).length).toBe(1)
    expect(repo.page()).toContain("| nitro | Node | 2026-10-01 | 2026-10-11 |")
  })

  test("follows the interval the repo sets", () => {
    const repo = sandbox({ skills: { reviewIntervalDays: 3 } })
    repo.addSkill("release")

    repo.skills("due")

    expect(repo.page()).toContain("| release | - | 2026-11-25 | 2026-11-28 |")
  })
})
