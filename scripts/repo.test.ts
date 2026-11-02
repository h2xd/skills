import { describe, test } from "node:test"
import { expect } from "./expect.ts"
import { readFileSync } from "node:fs"
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
