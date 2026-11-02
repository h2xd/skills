import { describe, test } from "node:test"
import { expect } from "./expect.ts"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { EXEMPT, MAX_LINES, lintCatalog, lintSkill } from "./lint-skills.ts"

const GOOD = `---
name: demo
description: Do a thing. Use when the thing needs doing.
---

# Demo

### 1. Run

Run \`demo\`.
Done when it exits 0.

## Do

- Run it once.

## Don't

- Don't run it twice. Run it once.
`

describe("lintSkill", () => {
  test("passes a skill that follows the rules", () => {
    expect(lintSkill("demo", GOOD)).toEqual([])
  })

  test("needs the name to match the folder", () => {
    expect(lintSkill("other", GOOD)).toEqual([`name "demo" differs from the folder "other"`])
  })

  test("needs a description that says when to use it", () => {
    const text = GOOD.replace(" Use when the thing needs doing.", "")
    expect(lintSkill("demo", text)).toEqual([`description does not say when to use the skill ("Use when …")`])
  })

  test("needs Do and Don't sections", () => {
    const text = GOOD.replace("## Do\n", "## Notes\n").replace("## Don't\n", "## More\n")
    expect(lintSkill("demo", text)).toEqual([`no "## Do" section`, `no "## Don't" section`])
  })

  test("needs a Done when in every numbered step", () => {
    const text = GOOD.replace("Done when it exits 0.\n", "")
    expect(lintSkill("demo", text)).toEqual([`step "Run" has no "Done when"`])
  })

  test("rejects parentheses and em dashes in prose, not in code or links", () => {
    const aside = GOOD.replace("Run `demo`.", "Run it (twice).")
    expect(lintSkill("demo", aside)).toEqual([
      "line 10: parentheses in prose. Write a sentence or a comma instead (add-soul rule 13)",
    ])
    const dash = GOOD.replace("Run `demo`.", "Run it — once.")
    expect(lintSkill("demo", dash)).toEqual([
      "line 10: em dash in prose. End the sentence or use a comma (add-soul rule 13)",
    ])
    const allowed = GOOD.replace("Run `demo`.", "Run `f(x)`, see [the guide](guide.md) and <placeholder (a)>.")
    expect(lintSkill("demo", allowed)).toEqual([])
  })

  test("ignores headings inside code blocks", () => {
    const text = GOOD.replace("Run `demo`.", "```markdown\n## Body\n```")
    expect(lintSkill("demo", text)).toEqual([])
  })

  test("caps the length", () => {
    const text = GOOD + "\n".repeat(MAX_LINES)
    expect(lintSkill("demo", text)[0]).toStartWith(`${GOOD.split("\n").length - 1 + MAX_LINES} lines`)
  })

  test("accepts a tool or model named as an example only", () => {
    const named = GOOD.replace("Run `demo`.", "Ask with AskUserQuestion.")
    expect(lintSkill("demo", named)).toEqual([
      `line 10: AskUserQuestion named as the only way. Describe the action, then "such as AskUserQuestion"`,
    ])
    const example = GOOD.replace("Run `demo`.", "Ask with the question tool, such as AskUserQuestion.")
    expect(lintSkill("demo", example)).toEqual([])
    const inCode = GOOD.replace("Run `demo`.", "```\nmodel: Opus\n```")
    expect(lintSkill("demo", inCode)).toEqual([])
  })
})

describe("lintCatalog", () => {
  const row = (name: string) => `| Do ${name} | \`h2xd:${name}\` |`

  test("passes when folders and rows match one to one", () => {
    expect(lintCatalog(["a", "b"], [row("a"), row("b")].join("\n"))).toEqual([])
  })

  test("names a missing row, a duplicate row and a row without a folder", () => {
    expect(lintCatalog(["a", "b"], [row("a"), row("a"), row("c")].join("\n"))).toEqual([
      "skills/next/catalog.md: a has 2 rows in the catalog table, needs 1",
      "skills/next/catalog.md: b has 0 rows in the catalog table, needs 1",
      "skills/next/catalog.md: row h2xd:c has no folder in skills/",
    ])
  })
})

describe("the skills in this repo", () => {
  const root = join(import.meta.dirname, "..", "skills")

  test("the catalog of next lists every skill", () => {
    expect(lintCatalog(readdirSync(root).sort(), readFileSync(join(root, "next", "catalog.md"), "utf8"))).toEqual([])
  })

  for (const folder of readdirSync(root).filter((name) => !EXEMPT.has(name))) {
    test(folder, () => {
      const text = readFileSync(join(root, folder, "SKILL.md"), "utf8")
      expect(lintSkill(folder, text)).toEqual([])
    })
  }
})
