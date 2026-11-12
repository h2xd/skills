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

describe("the comment-reaper agent", () => {
  test("can write its report file", () => {
    const text = readFileSync(join(ROOT, "agents/comment-reaper.md"), "utf8")
    const tools = text.match(/^tools: (.+)$/m)?.[1].split(", ") ?? []
    expect(tools).toContain("Write")
  })
})

/** The doc comment at the top of a file, after an optional shebang. */
function headerOf(text: string): string {
  return text.replace(/^#!.*\n/, "").match(/^\/\*\*[\s\S]*?\*\//)?.[0] ?? ""
}

describe("the script usage headers", () => {
  const scripts = ["scripts", "templates/scripts"].flatMap((dir) =>
    readdirSync(join(ROOT, dir))
      .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
      .map((name) => `${dir}/${name}`),
  )
  for (const path of scripts) {
    const text = readFileSync(join(ROOT, path), "utf8")
    if (!text.includes("process.argv")) continue
    test(`${path} opens with a doc comment that names its usage`, () => {
      const name = path.split("/").pop()
      expect(headerOf(text)).toContain(`node scripts/${name}`)
    })
  }
})
