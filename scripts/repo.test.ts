import { describe, test } from "node:test"
import { expect } from "./expect.ts"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

const ROOT = join(import.meta.dirname, "..")

describe("this repo's tone", () => {
  test("uses the ASD-STE100 template unchanged", () => {
    const template = readFileSync(join(ROOT, "templates/output-styles/asd-ste100.md"), "utf8")
    const installed = readFileSync(join(ROOT, ".claude/output-styles/asd-ste100.md"), "utf8")
    expect(installed).toBe(template)
  })

  test("lists every status and work-state marker in the tone and the GitHub text", () => {
    const files = ["templates/output-styles/asd-ste100.md", "skills/setup-tone/github-text.md"]
    for (const file of files) {
      const text = readFileSync(join(ROOT, file), "utf8")
      for (const marker of ["🔴", "🟡", "🟤", "🟢", "⚪", "🟪", "🟧", "🟦"]) {
        expect(text.includes(marker)).toBe(true)
      }
    }
  })

  test("names the work-state markers in the skills that list work items", () => {
    for (const name of ["next", "plan-backlog", "plan-triage"]) {
      const text = readFileSync(join(ROOT, `skills/${name}/SKILL.md`), "utf8")
      for (const marker of ["🟪", "🟧", "🟦"]) {
        expect(text.includes(marker)).toBe(true)
      }
    }
  })

  test("triage says a white item is optional", () => {
    const text = readFileSync(join(ROOT, "skills/review-fix/triage.md"), "utf8")
    expect(text.includes("A ⚪ item is optional")).toBe(true)
  })

  test("sets it as the default output style", () => {
    const settings = JSON.parse(readFileSync(join(ROOT, ".claude/settings.json"), "utf8"))
    expect(settings.outputStyle).toBe("ASD-STE100")
  })
})

/** The bold rule names of a numbered list under the given `##` heading. */
function ruleNames(path: string, heading: string): string[] {
  const text = readFileSync(join(ROOT, path), "utf8")
  const section = text.split(`\n## ${heading}\n`)[1]?.split("\n## ")[0] ?? ""
  return [...section.matchAll(/^\d+\. \*\*([^*]+)\*\*/gm)].map((match) => match[1])
}

describe("the GitHub text rules", () => {
  test("say the same thing in the tone template and in setup-tone", () => {
    const rules = ruleNames("skills/setup-tone/github-text.md", "Shape")
    expect(rules).toEqual(["Summary first.", "Status next.", "Short sections.", "Long detail folded."])
    expect(ruleNames("templates/output-styles/asd-ste100.md", "GitHub text")).toEqual(rules)
  })
})

/** Every file under `dir`, relative to it, without the tests setup leaves out. */
function filesOf(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.endsWith(".test.ts"))
    .map((entry) => join(entry.parentPath, entry.name).slice(join(ROOT, dir).length + 1))
}

describe("this repo's copies of the templates", () => {
  const copies: [string, string][] = [
    ...filesOf("templates/scripts").map((file): [string, string] => [`templates/scripts/${file}`, `scripts/${file}`]),
    ...filesOf("templates/githooks").map((file): [string, string] => [`templates/githooks/${file}`, `.githooks/${file}`]),
    ["templates/workflows/docs.yml", ".github/workflows/docs.yml"],
    ["templates/workflows/pr.yml", ".github/workflows/pr.yml"],
    ["templates/hooks/block-dangerous-git.sh", ".claude/hooks/block-dangerous-git.sh"],
  ]
  for (const [template, copy] of copies) {
    test(`${copy} matches ${template}`, () => {
      expect(readFileSync(join(ROOT, copy), "utf8")).toBe(readFileSync(join(ROOT, template), "utf8"))
    })
  }
})

/** The test paths and globs that a `node --test` script runs. */
function testPaths(script: string): string[] {
  return script.replace(/^node --test /, "").match(/"[^"]+"|\S+/g)?.map((path) => path.replaceAll('"', "")) ?? []
}

describe("this repo's test scripts", () => {
  const scripts = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).scripts
  const all: string[] = testPaths(scripts.test)
  const mutants: string[] = testPaths(scripts["test:mutants"])
  const scriptTests = (path: string) => /^scripts\/[^/]+\.test\.ts$/.test(path)

  test("test:mutants runs every test folder of test, except the one of scripts", () => {
    const folders = all.filter((path) => path !== "scripts/**/*.test.ts")
    expect(folders.length > 0).toBe(true)
    for (const folder of folders) expect(mutants).toContain(folder)
  })

  test("test:mutants adds only single tests of scripts, and leaves out the copy check", () => {
    const added = mutants.filter((path) => !all.includes(path))
    expect(added.every(scriptTests)).toBe(true)
    expect(mutants).not.toContain("scripts/repo.test.ts")
  })
})

describe("this repo's agents.config.json", () => {
  test("holds the plugin version, so drift.ts finds no version gap", () => {
    const config = JSON.parse(readFileSync(join(ROOT, "agents.config.json"), "utf8"))
    const plugin = JSON.parse(readFileSync(join(ROOT, ".claude-plugin/plugin.json"), "utf8"))
    expect(config.version).toBe(plugin.version)
  })
})

describe("the comment-reaper agent", () => {
  test("can write its report file", () => {
    const text = readFileSync(join(ROOT, "agents/comment-reaper.md"), "utf8")
    const tools = text.match(/^tools: (.+)$/m)?.[1].split(", ") ?? []
    expect(tools).toContain("Write")
  })
})

function leadingDocComment(text: string): string {
  return text.replace(/^#!.*\n/, "").match(/^\/\*\*[\s\S]*?\*\//)?.[0] ?? ""
}

function leadingHashComment(text: string): string {
  const lines = text.replace(/^#!.*\n/, "").split("\n")
  const end = lines.findIndex((line) => !line.startsWith("#"))
  return lines.slice(0, end === -1 ? lines.length : end).join("\n")
}

describe("the script usage headers", () => {
  const scriptPaths = ["scripts", "templates/scripts"].flatMap((dir) =>
    readdirSync(join(ROOT, dir))
      .filter((name) => /\.(ts|sh)$/.test(name) && !name.endsWith(".test.ts"))
      .map((name) => `${dir}/${name}`),
  )
  for (const path of scriptPaths) {
    const text = readFileSync(join(ROOT, path), "utf8")
    const name = path.split("/").pop()
    if (path.endsWith(".sh")) {
      test(`${path} opens with a comment that names its usage`, () => {
        expect(leadingHashComment(text)).toContain(`sh scripts/${name}`)
      })
    } else if (path.endsWith(".ts")) {
      const readsArgv = text.includes("process.argv")
      const isEntryPointReadingEnv =
        text.includes("process.env") && text.startsWith("#!")
      if (!readsArgv && !isEntryPointReadingEnv) continue
      test(`${path} opens with a doc comment that names its usage`, () => {
        expect(leadingDocComment(text)).toContain(`node scripts/${name}`)
      })
    }
  }
})

describe("the skill and agent counts", () => {
  const skills = readdirSync(join(ROOT, "skills"), { withFileTypes: true }).filter((entry) =>
    entry.isDirectory(),
  ).length
  const agents = readdirSync(join(ROOT, "agents")).filter((name) => name.endsWith(".md")).length
  const inFolders = `${skills} skills and ${agents} agents`
  for (const file of ["README.md", ".claude-plugin/plugin.json", ".claude-plugin/marketplace.json"]) {
    test(`${file} says ${inFolders}, as skills/ and agents/ hold`, () => {
      const text = readFileSync(join(ROOT, file), "utf8")
      const written = [...text.matchAll(/\d+ skills and \d+ agents/g)].map((match) => match[0])
      expect(written.length > 0).toBe(true)
      for (const count of written) expect(count).toBe(inFolders)
    })
  }
})
