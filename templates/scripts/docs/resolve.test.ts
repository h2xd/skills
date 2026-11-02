import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import {
  hasConflictMarkers,
  parseConflicts,
  planRenumbering,
  resolveFile,
  rewriteReferences,
  sortDecisionEntries,
} from "./resolve.ts"

function conflict(ours: string[], theirs: string[], base?: string[]): string {
  const baseLines = base ? ["||||||| merged common ancestors", ...base] : []
  return [
    "<<<<<<< HEAD",
    ...ours,
    ...baseLines,
    "=======",
    ...theirs,
    ">>>>>>> origin/main",
  ].join("\n")
}

const OURS_GENERATED =
  "generated: { by: claude-code/claude-opus-5-5, at: 2026-09-29T15:00:00Z }"
const THEIRS_GENERATED =
  "generated: { by: claude-code/claude-opus-5-5, at: 2026-09-28T09:00:00Z }"

describe("parseConflicts", () => {
  test("splits text and a hunk", () => {
    const text = `before\n${conflict(["a"], ["b"])}\nafter`
    const segments = parseConflicts(text)
    expect(segments.map((segment) => segment.kind)).toEqual([
      "text",
      "hunk",
      "text",
    ])
    const hunk = segments[1].kind === "hunk" ? segments[1].hunk : undefined
    expect(hunk?.ours).toEqual(["a"])
    expect(hunk?.theirs).toEqual(["b"])
    expect(hunk?.base).toBeUndefined()
  })

  test("reads the diff3 base section apart from ours", () => {
    const [segment] = parseConflicts(conflict(["a"], ["b"], ["original"]))
    expect(segment.kind === "hunk" && segment.hunk).toMatchObject({
      ours: ["a"],
      base: ["original"],
      theirs: ["b"],
    })
  })

  test("keeps a hunk without an end marker as plain text", () => {
    const text = "<<<<<<< HEAD\na\n=======\nb"
    expect(parseConflicts(text)).toEqual([
      { kind: "text", lines: text.split("\n") },
    ])
  })
})

describe("resolveFile", () => {
  test("keeps the later generated line, whichever side it is on", () => {
    const text = `---\n${conflict([THEIRS_GENERATED], [OURS_GENERATED], ["generated: { by: x, at: 2026-01-01T00:00:00Z }"])}\n---\n`
    const result = resolveFile("docs/product/spec.md", text)
    expect(result.text).toBe(`---\n${OURS_GENERATED}\n---\n`)
    expect(result.resolved["generated line"]).toBe(1)
    expect(result.remainingLines).toEqual([])
  })

  test("resolves generated lines in CONTEXT.md too", () => {
    const text = conflict([OURS_GENERATED], [THEIRS_GENERATED])
    expect(resolveFile("CONTEXT.md", text).text).toBe(OURS_GENERATED)
  })

  test("leaves a prose hunk untouched and reports its line", () => {
    const hunk = conflict(["We ship on Friday."], ["We ship on Monday."])
    const text = `# Plan\n\n${hunk}\n`
    const result = resolveFile("docs/plans/release.md", text)
    expect(result.text).toBe(text)
    expect(result.remainingLines).toEqual([3])
  })

  test("leaves a hunk with a generated line and other lines untouched", () => {
    const text = conflict(
      [OURS_GENERATED, "status: accepted"],
      [THEIRS_GENERATED],
    )
    expect(resolveFile("docs/decisions/0001-x.md", text).text).toBe(text)
  })

  test("writes an unresolved diff3 hunk back with its base section", () => {
    const text = conflict(["a"], ["b"], ["original"])
    expect(resolveFile("docs/plans/x.md", text).text).toBe(text)
  })

  test("keeps both sides of a log hunk, ours first, without duplicates", () => {
    const text = `## 2026-09-29\n${conflict(
      ["* **Update**: ours.", "* **Update**: shared."],
      ["* **Update**: shared.", "* **Update**: theirs."],
    )}\n`
    const result = resolveFile("docs/log.md", text)
    expect(result.text).toBe(
      "## 2026-09-29\n* **Update**: ours.\n* **Update**: shared.\n* **Update**: theirs.\n",
    )
    expect(result.resolved.union).toBe(1)
  })

  test("keeps the blank lines that separate log sections", () => {
    const text = conflict(
      ["* **Update**: ours.", "", "## 2026-09-28"],
      ["* **Update**: theirs.", "", "## 2026-09-27"],
    )
    expect(resolveFile("docs/log.md", text).text).toBe(
      "* **Update**: ours.\n\n## 2026-09-28\n* **Update**: theirs.\n\n## 2026-09-27",
    )
  })

  test("sorts decision entries in an index hunk by number", () => {
    const text = conflict(
      ["* [0012 Ours](/decisions/0012-ours.md) - Ours."],
      [
        "* [0010 Theirs](/decisions/0010-theirs.md) - Theirs.",
        "* [0011 More](/decisions/0011-more.md) - More.",
      ],
    )
    expect(resolveFile("docs/index.md", text).text).toBe(
      [
        "* [0010 Theirs](/decisions/0010-theirs.md) - Theirs.",
        "* [0011 More](/decisions/0011-more.md) - More.",
        "* [0012 Ours](/decisions/0012-ours.md) - Ours.",
      ].join("\n"),
    )
  })

  test("keeps the order of an index hunk that holds more than decision entries", () => {
    const text = conflict(
      ["* [0012 Ours](/decisions/0012-ours.md) - Ours."],
      ["* [Spec](/product/spec.md) - Spec."],
    )
    expect(resolveFile("docs/index.md", text).text).toBe(
      "* [0012 Ours](/decisions/0012-ours.md) - Ours.\n* [Spec](/product/spec.md) - Spec.",
    )
  })

  test("counts each hunk and reports lines in the resolved text", () => {
    const text = [
      conflict([OURS_GENERATED], [THEIRS_GENERATED]),
      "",
      conflict(["a"], ["b"]),
    ].join("\n")
    const result = resolveFile("docs/product/spec.md", text)
    expect(result.resolved["generated line"]).toBe(1)
    expect(result.remainingLines).toEqual([3])
    expect(hasConflictMarkers(result.text)).toBe(true)
  })
})

describe("sortDecisionEntries", () => {
  test("sorts each run of decision entries and leaves other lines alone", () => {
    const text = [
      "# Decisions",
      "* [0013 B](/decisions/0013-b.md) - B.",
      "* [0012 A](/decisions/0012-a.md) - A.",
      "",
      "* [Spec](/product/spec.md) - Spec.",
    ].join("\n")
    expect(sortDecisionEntries(text)).toBe(
      [
        "# Decisions",
        "* [0012 A](/decisions/0012-a.md) - A.",
        "* [0013 B](/decisions/0013-b.md) - B.",
        "",
        "* [Spec](/product/spec.md) - Spec.",
      ].join("\n"),
    )
  })
})

describe("planRenumbering", () => {
  const paths = [
    "docs/decisions/0010-theirs.md",
    "docs/decisions/0010-ours.md",
    "docs/decisions/0011-other.md",
  ]

  test("moves the record the base does not have to the next free number", () => {
    const result = planRenumbering(
      paths,
      (path) => path !== "docs/decisions/0010-ours.md",
    )
    expect(result).toEqual({
      renumberings: [
        {
          from: "docs/decisions/0010-ours.md",
          to: "docs/decisions/0012-ours.md",
        },
      ],
      collisions: [],
    })
  })

  test("reports a collision when both or neither exist at the base", () => {
    for (const existsAtBase of [() => true, () => false]) {
      expect(planRenumbering(paths, existsAtBase)).toEqual({
        renumberings: [],
        collisions: [
          {
            number: "0010",
            paths: [
              "docs/decisions/0010-ours.md",
              "docs/decisions/0010-theirs.md",
            ],
          },
        ],
      })
    }
  })

  test("does nothing without a collision", () => {
    expect(planRenumbering(paths.slice(1), () => true)).toEqual({
      renumberings: [],
      collisions: [],
    })
  })
})

describe("rewriteReferences", () => {
  const rewrite = (text: string) =>
    rewriteReferences(text, "0010-ours.md", "0012-ours.md")

  test("changes the link target and the number in its label", () => {
    expect(rewrite("See [ADR-0010](/decisions/0010-ours.md).")).toBe(
      "See [ADR-0012](/decisions/0012-ours.md).",
    )
    expect(
      rewrite("* [0010 Ours](/decisions/0010-ours.md#context) - Ours."),
    ).toBe("* [0012 Ours](/decisions/0012-ours.md#context) - Ours.")
    expect(rewrite("[decision 0010](../decisions/0010-ours.md)")).toBe(
      "[decision 0012](../decisions/0012-ours.md)",
    )
  })

  test("leaves links to other records alone", () => {
    const text = "[0010 Theirs](/decisions/0010-theirs.md)"
    expect(rewrite(text)).toBe(text)
  })

  test("renames a plain mention of the file name", () => {
    expect(rewrite("Written in `docs/decisions/0010-ours.md`.")).toBe(
      "Written in `docs/decisions/0012-ours.md`.",
    )
  })
})
