import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import type { GlossaryConfig } from "../config.ts"
import { parsePage } from "./bundle.ts"
import { checkGlossaries, checkGlossary, headingAnchor } from "./glossary.ts"

const PROJECT: GlossaryConfig = {
  path: "glossary/project.md",
  requiredFields: ["Meaning"],
}
const TECHNICAL: GlossaryConfig = {
  path: "glossary/technical.md",
  requiredFields: ["Meaning", "Code"],
}

const TREAT_LIMIT = `### Treat Limit

- **Meaning:** Caps how many treats a cat gets per [Limit Interval](#limit-interval).
- **Avoid:** Snack cap
`

const LIMIT_INTERVAL = `### Limit Interval

- **Meaning:** The period a limit applies to.
`

const SNACK_DRAWER = `### Snack Drawer

- **Meaning:** Where the treats hide between meals.
- **Code:** \`kitchen/snack-drawer.txt\`
`

function glossary(...entries: string[]): string {
  return `---\ntype: Glossary\n---\n\n# Words\n\n## Limits\n\n${entries.join("\n")}`
}

function pagesOf(files: Record<string, string>) {
  return Object.entries(files).map(([path, text]) => parsePage(path, text))
}

function check(glossaryText: string, otherPages: Record<string, string> = {}) {
  return checkGlossary(
    pagesOf({ [PROJECT.path]: glossaryText, ...otherPages }),
    PROJECT,
  )
}

describe("headingAnchor", () => {
  test("follows GitHub's rule and keeps Unicode letters", () => {
    expect(headingAnchor("Treat Limit")).toBe("treat-limit")
    expect(headingAnchor("Add-on Game")).toBe("add-on-game")
    expect(headingAnchor("GlücksSpirale")).toBe("glücksspirale")
    expect(headingAnchor("NAPS 9to5")).toBe("naps-9to5")
  })
})

describe("checkGlossary", () => {
  test("accepts valid entries and valid glossary links", () => {
    const errors = check(glossary(TREAT_LIMIT, LIMIT_INTERVAL), {
      "product/spec.md":
        "See [Treat Limits](/glossary/project.md#treat-limit).\n",
      "decisions/0001-x.md":
        "See [it](../glossary/project.md#limit-interval).\n",
    })
    expect(errors).toEqual([])
  })

  test("rejects an entry without a required field", () => {
    const errors = check(
      glossary(TREAT_LIMIT, LIMIT_INTERVAL.replace(/- \*\*Meaning:\*\*.*\n/, "")),
    )
    expect(errors).toEqual([
      `${PROJECT.path}: entry "Limit Interval" has no **Meaning:** line`,
    ])
  })

  test("checks each glossary against its own required fields", () => {
    const errors = checkGlossary(
      pagesOf({
        [TECHNICAL.path]: glossary(SNACK_DRAWER, LIMIT_INTERVAL),
      }),
      TECHNICAL,
    )
    expect(errors).toEqual([
      `${TECHNICAL.path}: entry "Limit Interval" has no **Code:** line`,
    ])
  })

  test("rejects links to a glossary that is missing", () => {
    const pages = pagesOf({
      "product/spec.md": "See [it](/glossary/project.md#treat-limit).\n",
    })
    expect(checkGlossary(pages, PROJECT)).toEqual([
      `docs/${PROJECT.path}: missing, but pages link to it`,
    ])
  })

  test("accepts a missing glossary that nothing links to", () => {
    const pages = pagesOf({ "product/spec.md": "No glossary links.\n" })
    expect(checkGlossary(pages, PROJECT)).toEqual([])
  })

  test("rejects a duplicate heading", () => {
    const errors = check(glossary(TREAT_LIMIT, LIMIT_INTERVAL, LIMIT_INTERVAL))
    expect(errors).toEqual([
      `${PROJECT.path}: entry "Limit Interval" appears more than once`,
    ])
  })

  test("rejects a link to a glossary entry that does not exist", () => {
    const errors = check(glossary(TREAT_LIMIT, LIMIT_INTERVAL), {
      "product/spec.md": "See [Abo](/glossary/project.md#subscription).\n",
    })
    expect(errors).toEqual([
      `product/spec.md: links to #subscription in docs/${PROJECT.path}, which has no such entry`,
    ])
  })

  test("rejects an in-page link to an entry that does not exist", () => {
    const errors = check(glossary(TREAT_LIMIT))
    expect(errors).toEqual([
      `${PROJECT.path}: links to #limit-interval in docs/${PROJECT.path}, which has no such entry`,
    ])
  })

  test("ignores headings inside fenced code", () => {
    const errors = check(
      glossary(TREAT_LIMIT, LIMIT_INTERVAL, "```\n### Not An Entry\n```\n"),
    )
    expect(errors).toEqual([])
  })
})

describe("checkGlossaries", () => {
  test("rejects a term defined in both glossaries", () => {
    const errors = checkGlossaries(
      pagesOf({
        [PROJECT.path]: glossary(TREAT_LIMIT, LIMIT_INTERVAL),
        [TECHNICAL.path]: glossary(
          SNACK_DRAWER,
          `${LIMIT_INTERVAL}- **Code:** \`src/limits.ts\`\n`,
        ),
      }),
      [PROJECT, TECHNICAL],
    )
    expect(errors).toEqual([
      `glossary term "limit interval" is defined in ${PROJECT.path} and ${TECHNICAL.path}, give it one home`,
    ])
  })
})
