import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { formatPage, parsePage, syncRows } from "./page.ts"

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
