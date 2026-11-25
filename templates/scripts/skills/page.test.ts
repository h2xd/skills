import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { dueSkills, formatPage, markReviewed, parsePage, syncRows } from "./page.ts"

const TODAY = "2026-11-25"

describe("syncRows", () => {
  test("gives a repo with no page one row per repo-local skill", () => {
    const rows = syncRows([], ["release", "next"], TODAY, 10)
    expect(rows).toEqual([
      { skill: "next", technology: "-", updated: TODAY, due: "2026-12-05" },
      { skill: "release", technology: "-", updated: TODAY, due: "2026-12-05" },
    ])
  })

  test("keeps the row of a known skill and drops the row of a deleted one", () => {
    const old = { skill: "old", technology: "-", updated: "2026-01-01", due: "2026-01-11" }
    const kept = { skill: "kept", technology: "Node", updated: "2026-02-01", due: "2026-02-11" }
    expect(syncRows([old, kept], ["kept"], TODAY, 10)).toEqual([kept])
  })
})

describe("the page text", () => {
  test("round-trips the rows through the table", () => {
    const rows = syncRows([], ["a", "b"], TODAY, 10)
    expect(parsePage(formatPage(rows, TODAY, null))).toEqual(rows)
  })

  test("opens with the frontmatter an OKF page needs", () => {
    const text = formatPage([], TODAY, null)
    expect(text).toStartWith("---\ntype: Agent Config\ntitle: Skills\n")
    expect(text).toContain(`generated: { by: "scripts/skills.ts", at: "${TODAY}" }`)
  })

  test("keeps the text a person wrote around the table", () => {
    const first = formatPage(syncRows([], ["a"], TODAY, 10), TODAY, null)
    const edited = first.replace("# Skills", "# Skills\n\nA note from a person.")
    const again = formatPage(syncRows([], ["a", "b"], TODAY, 10), TODAY, edited)
    expect(again).toContain("A note from a person.")
    expect(parsePage(again).map((row) => row.skill)).toEqual(["a", "b"])
  })
})

describe("a table a formatter padded", () => {
  const padded = [
    "# Skills",
    "",
    "| Skill   | Technology | Updated    | Review due |",
    "| ------- | ---------- | ---------- | ---------- |",
    "| nitro   | Node       | 2026-10-01 | 2026-10-11 |",
    "",
    "After the table.",
  ].join("\n")

  test("reads each cell without its padding", () => {
    expect(parsePage(padded)).toEqual([
      { skill: "nitro", technology: "Node", updated: "2026-10-01", due: "2026-10-11" },
    ])
  })

  test("is rewritten in place, with one table and the text after it", () => {
    const rows = syncRows(parsePage(padded), ["nitro"], TODAY, 10)
    const again = formatPage(rows, TODAY, padded)
    expect(again.split("\n").filter((line) => line.includes("Review due"))).toHaveLength(1)
    expect(again).toContain("| nitro | Node | 2026-10-01 | 2026-10-11 |")
    expect(again).toContain("After the table.")
  })
})

describe("dueSkills", () => {
  const row = (skill: string, due: string) => ({
    skill,
    technology: "-",
    updated: "2026-01-01",
    due,
  })

  test("lists the skills due on or before today, oldest first", () => {
    const rows = [row("c", "2026-11-25"), row("a", "2026-10-01"), row("future", "2026-11-26"), row("b", "2026-10-01")]
    expect(dueSkills(rows, TODAY).map((due) => due.skill)).toEqual(["a", "b", "c"])
  })

  test("lists none when every review lies ahead", () => {
    expect(dueSkills([row("a", "2026-12-01")], TODAY)).toEqual([])
  })
})

describe("markReviewed", () => {
  const rows = [
    { skill: "a", technology: "-", updated: "2026-01-01", due: "2026-01-11" },
    { skill: "b", technology: "-", updated: "2026-02-01", due: "2026-02-11" },
  ]

  test("sets the review date to today and the due date one interval later", () => {
    expect(markReviewed(rows, "a", TODAY, 10)).toEqual([
      { skill: "a", technology: "-", updated: TODAY, due: "2026-12-05" },
      rows[1],
    ])
  })

  test("keeps the technology of the row", () => {
    const technology = [{ ...rows[0], technology: "Node" }]
    expect(markReviewed(technology, "a", TODAY, 10)[0].technology).toBe("Node")
  })

  test("refuses a skill that has no row", () => {
    expect(() => markReviewed(rows, "missing", TODAY, 10)).toThrow("no row for missing")
  })
})
