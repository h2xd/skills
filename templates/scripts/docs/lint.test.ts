import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { DEFAULTS } from "../config.ts"
import { type Page, parsePage } from "./bundle.ts"
import { lintBundle } from "./lint.ts"

const NOW = new Date("2026-09-28T12:00:00Z")

const SPEC = `---
type: Product Spec
title: Spec
description: What the agent does.
generated: { by: "human:test", at: "2026-09-28" }
---

# Spec
`

const DECISION = `---
type: Decision
title: Naps on the fruit bowl
description: Why the cat naps in the fruit bowl.
generated: { by: "human:test", at: "2026-09-28" }
status: accepted
date: 2026-02-19
sources:
  - id: issue-12
    resource: https://example.org/cats/cafe/issues/12
    title: Pick a nap spot
---

Touches [the config](../../kitchen/shelf/jars.txt).
`

const INDEX = `---
okf_version: "0.2"
---

* [Spec](/product/spec.md) - What the agent does.
* [0001](/decisions/0001-naps.md) - Why the cat naps in the fruit bowl.
`

const GLOSSARY = [
  "---",
  "type: Glossary",
  "title: Words",
  "description: Product words.",
  'generated: { by: "human:test", at: "2026-09-28" }',
  "---",
  "",
  "# Words",
  "",
  "## Limits",
  "",
  "### Treat Limit",
  "",
  "- **Meaning:** A cap.",
  "",
].join("\n")

type Files = Record<string, string>

const VALID_BUNDLE: Files = {
  "index.md": INDEX,
  "log.md": "# Log\n\n## 2026-09-28\n* **Creation**: Started.\n",
  "product/spec.md": SPEC,
  "decisions/0001-naps.md": DECISION,
}

function lint(
  files: Files,
  existing: string[] = ["kitchen/shelf/jars.txt"],
  decisionIssueRequiredFrom: number | null = 1,
) {
  const pages: Page[] = Object.entries(files).map(([path, text]) =>
    parsePage(path, text),
  )
  return lintBundle(pages, {
    exists: (path) => existing.includes(path),
    now: NOW,
    decisionIssueRequiredFrom,
    glossaries: DEFAULTS.docs.glossaries,
  })
}

describe("lintBundle", () => {
  test("accepts a valid bundle with no errors and no notes", () => {
    expect(lint(VALID_BUNDLE)).toEqual({ errors: [], notes: [] })
  })

  test("rejects a concept without frontmatter or without a type", () => {
    const { errors } = lint({
      ...VALID_BUNDLE,
      "product/spec.md": "# Spec\n",
      "product/rules.md": "---\ndescription: Rules.\n---\n",
    })
    expect(errors).toContain(
      "product/spec.md: no frontmatter block, every concept needs one",
    )
    expect(errors).toContain(
      "product/rules.md: frontmatter has no non-empty `type`",
    )
  })

  test("reports a broken glossary link through checkGlossary", () => {
    const { errors } = lint({
      ...VALID_BUNDLE,
      "index.md": `${INDEX}* [Words](/glossary/project.md) - Product words.\n`,
      "glossary/project.md": GLOSSARY,
      "product/spec.md": `${SPEC}\nSee [it](/glossary/project.md#no-such-term).\n`,
    })
    expect(errors).toEqual([
      "product/spec.md: links to #no-such-term in docs/glossary/project.md, which has no such entry",
    ])
  })

  test("rejects a log heading that is not a date", () => {
    const { errors } = lint({ ...VALID_BUNDLE, "log.md": "## Last week\n" })
    expect(errors).toEqual([
      'log.md: log heading "## Last week" is not a YYYY-MM-DD date',
    ])
  })

  test("notes a log entry longer than one short line", () => {
    const long = `* **Update**: ${"x".repeat(300)}`
    const { errors, notes } = lint({ ...VALID_BUNDLE, "log.md": `## 2026-11-02\n${long}\n` })
    expect(errors).toEqual([])
    expect(notes).toContain(
      `log.md: entry on line 2 has ${long.length} characters, over 300. Keep one line, and put the details in the page and the commit`,
    )
  })

  test("rejects frontmatter in a nested index", () => {
    const { errors } = lint({
      ...VALID_BUNDLE,
      "product/index.md": "---\ntitle: Product\n---\n",
    })
    expect(errors).toEqual([
      "product/index.md: index files carry no frontmatter, except okf_version in the root index",
    ])
  })

  test("rejects leftover conflict markers on any page, index and log included", () => {
    const { errors } = lint({
      ...VALID_BUNDLE,
      "index.md": `${INDEX}>>>>>>> origin/main\n`,
      "log.md": "# Log\n\n<<<<<<<\n## 2026-09-28\n>>>>>>>\n",
      "product/spec.md": SPEC.replace("# Spec", "<<<<<<< HEAD\n# Spec"),
    })
    expect(errors).toEqual([
      "index.md: leftover conflict marker on line 7",
      "log.md: leftover conflict marker on line 3",
      "log.md: leftover conflict marker on line 5",
      "product/spec.md: leftover conflict marker on line 8",
    ])
  })

  test("accepts a setext heading underline that looks like a conflict separator", () => {
    const { errors } = lint({
      ...VALID_BUNDLE,
      "product/spec.md": `${SPEC}\nUsage\n=======\n`,
    })
    expect(errors).toEqual([])
  })

  test("rejects two decision records with the same number", () => {
    const { errors } = lint({
      ...VALID_BUNDLE,
      "decisions/0001-other.md": DECISION,
      "index.md": `${INDEX}* [0001](/decisions/0001-other.md) - Why the cat naps in the fruit bowl.\n`,
    })
    expect(errors).toEqual([
      "decision number 0001 is used by more than one record: decisions/0001-naps.md, decisions/0001-other.md",
    ])
  })

  describe("index", () => {
    test("rejects a page without title, description or generated", () => {
      const { errors } = lint({
        ...VALID_BUNDLE,
        "product/spec.md": "---\ntype: Product Spec\n---\n\n# Spec\n",
      })
      expect(errors).toContain("product/spec.md: frontmatter has no non-empty `title`")
      expect(errors).toContain("product/spec.md: frontmatter has no non-empty `description`")
      expect(errors).toContain("product/spec.md: frontmatter has no `generated: { by, at }`")
    })

    test("rejects a page the index does not list", () => {
      const { errors } = lint({
        ...VALID_BUNDLE,
        "product/rules.md": `---\ntype: Ruleset\ntitle: Rules\ndescription: The rules.\ngenerated: { by: "human:test", at: "2026-09-28" }\n---\n`,
      })
      expect(errors).toEqual(["product/rules.md: not listed in index.md"])
    })

    test("rejects an entry for a page that does not exist", () => {
      const { errors } = lint({
        ...VALID_BUNDLE,
        "index.md": `${INDEX}* [Gone](/plans/gone.md) - Gone.\n`,
      })
      expect(errors).toEqual([
        "index.md: lists /plans/gone.md, which does not exist",
      ])
    })

    test("rejects an entry whose description drifted from the page", () => {
      const { errors } = lint({
        ...VALID_BUNDLE,
        "index.md": INDEX.replace("What the agent does.", "Old text."),
      })
      expect(errors).toEqual([
        "index.md: the entry for product/spec.md does not end with the page's description",
      ])
    })

    test("allows a status in front of the description", () => {
      const { errors } = lint({
        ...VALID_BUNDLE,
        "index.md": INDEX.replace(
          "- What the agent does.",
          "- Deprecated. What the agent does.",
        ),
      })
      expect(errors).toEqual([])
    })
  })

  describe("decision records", () => {
    test("rejects a non-MADR status, a bad date and a bad filename", () => {
      const { errors } = lint({
        ...VALID_BUNDLE,
        "decisions/0001-naps.md": DECISION.replace(
          "status: accepted",
          "status: stable",
        ).replace("date: 2026-02-19", "date: soon"),
        "decisions/naps.md": DECISION,
        "index.md": `${INDEX}* [Naps](/decisions/naps.md) - Why the cat naps in the fruit bowl.\n`,
      })
      expect(errors).toContain(
        'decisions/0001-naps.md: status "stable" is not a MADR status (proposed, rejected, accepted, deprecated, superseded by ADR-NNNN)',
      )
      expect(errors).toContain(
        'decisions/0001-naps.md: date "soon" is not YYYY-MM-DD',
      )
      expect(errors).toContain(
        "decisions/naps.md: decision records are named NNNN-slug.md",
      )
    })

    test("rejects a supersede pointing at a record that does not exist", () => {
      const { errors } = lint({
        ...VALID_BUNDLE,
        "decisions/0001-naps.md": DECISION.replace(
          "status: accepted",
          "status: superseded by ADR-0002",
        ),
      })
      expect(errors).toEqual([
        "decisions/0001-naps.md: superseded by ADR-0002, which does not exist",
      ])
    })

    test("rejects a successor that does not link back", () => {
      const { errors } = lint({
        ...VALID_BUNDLE,
        "decisions/0001-naps.md": DECISION.replace(
          "status: accepted",
          "status: superseded by ADR-0002",
        ),
        "decisions/0002-naps.md": DECISION,
        "index.md": `${INDEX}* [0002](/decisions/0002-naps.md) - Why the cat naps in the fruit bowl.\n`,
      })
      expect(errors).toEqual([
        "decisions/0002-naps.md: supersedes decisions/0001-naps.md but does not link to it",
      ])
    })

    test("rejects a record that cites no tracker issue", () => {
      const withoutIssue = DECISION.replace(/sources:\n(  .*\n)+/, "")
      const { errors } = lint({
        ...VALID_BUNDLE,
        "decisions/0001-naps.md": withoutIssue,
      })
      expect(errors).toEqual([
        "decisions/0001-naps.md: cites no tracker issue. Add a `sources` entry with id `issue-<n>` for the issue this record was opened under (the adr skill creates it)",
      ])
    })

    test("exempts records numbered below decisionIssueRequiredFrom", () => {
      const withoutIssue = DECISION.replace(/sources:\n(  .*\n)+/, "")
      const files = { ...VALID_BUNDLE, "decisions/0001-naps.md": withoutIssue }
      expect(lint(files, undefined, 2).errors).toEqual([])
      expect(lint(files, undefined, null).errors).toEqual([])
    })

    test("notes an accepted decision that links no code", () => {
      const { notes } = lint({
        ...VALID_BUNDLE,
        "decisions/0001-naps.md": DECISION.replace(
          "Touches [the config](../../kitchen/shelf/jars.txt).",
          "Touches nothing.",
        ),
      })
      expect(notes).toEqual([
        "decisions/0001-naps.md: links no code or config the decision affects",
      ])
    })
  })

  describe("notes", () => {
    test("notes a link to a page not written yet", () => {
      const { errors, notes } = lint({
        ...VALID_BUNDLE,
        "product/spec.md": `${SPEC}\nSee [later](/plans/later.md).\n`,
      })
      expect(errors).toEqual([])
      expect(notes).toEqual([
        "product/spec.md: links to /plans/later.md, not written yet",
      ])
    })

    test("notes a page past its stale_after", () => {
      const { notes } = lint({
        ...VALID_BUNDLE,
        "product/spec.md": SPEC.replace(
          "type: Product Spec",
          "type: Product Spec\nstale_after: 2026-09-01T00:00:00Z",
        ),
      })
      expect(notes).toEqual(["product/spec.md: stale since 2026-09-01"])
    })

    test("notes a non-decision page that links a superseded record", () => {
      const { notes } = lint({
        ...VALID_BUNDLE,
        "product/spec.md": `${SPEC}\nSee [naps](/decisions/0001-naps.md).\n`,
        "decisions/0001-naps.md": DECISION.replace(
          "status: accepted",
          "status: superseded by ADR-0002",
        ),
        "decisions/0002-naps.md": `${DECISION}\nReplaces [0001](/decisions/0001-naps.md).\n`,
        "index.md": `${INDEX}* [0002](/decisions/0002-naps.md) - Why the cat naps in the fruit bowl.\n`,
      })
      expect(notes).toEqual([
        "product/spec.md: links decisions/0001-naps.md, which is superseded by ADR-0002",
      ])
    })
  })
})
