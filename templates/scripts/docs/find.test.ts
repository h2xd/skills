import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { type Page, parsePage, repoPath } from "./bundle.ts"
import { findPages, formatPage, type Query } from "./find.ts"

const NOW = new Date("2026-09-28T12:00:00Z")

const PAGES: Page[] = [
  parsePage("index.md", "* [Spec](/product/spec.md) - Spec.\n"),
  parsePage(
    "product/spec.md",
    "---\ntype: Product Spec\ntitle: Spec\ntags: [product]\n---\nSee [0002](/decisions/0002-biscuit.md).\n",
  ),
  parsePage(
    "decisions/0001-naps.md",
    "---\ntype: Decision\ntitle: Naps\nstatus: superseded by ADR-0002\ntags: [naps]\nstale_after: 2026-09-01T00:00:00Z\n---\n",
  ),
  parsePage(
    "decisions/0002-biscuit.md",
    "---\ntype: Decision\ntitle: Biscuit\nstatus: accepted\n---\nReplaces [0001](/decisions/0001-naps.md). Touches [types](../../kitchen/pantry/recipes.txt).\n",
  ),
  parsePage(
    "architecture/gossip.md",
    "---\ntype: Architecture\ntitle: Chat\n---\nSee [chat](../../kitchen/gossip/index.ts).\n",
  ),
]

function find(query: Query): string[] {
  return findPages(PAGES, query, NOW).map(repoPath)
}

describe("findPages", () => {
  test("matches type case-insensitively", () => {
    expect(find({ type: "decision" })).toEqual([
      "docs/decisions/0001-naps.md",
      "docs/decisions/0002-biscuit.md",
    ])
  })

  test("matches status by prefix and treats a missing status as stable", () => {
    expect(find({ status: "superseded" })).toEqual([
      "docs/decisions/0001-naps.md",
    ])
    expect(find({ status: "stable" })).toEqual([
      "docs/product/spec.md",
      "docs/architecture/gossip.md",
    ])
  })

  test("matches a tag", () => {
    expect(find({ tag: "naps" })).toEqual([
      "docs/decisions/0001-naps.md",
    ])
  })

  test("search needs every word in the title, description or tags", () => {
    expect(find({ type: "decision", search: "NAPS" })).toEqual([
      "docs/decisions/0001-naps.md",
    ])
    expect(find({ search: "naps naps" })).toEqual([
      "docs/decisions/0001-naps.md",
    ])
    expect(find({ search: "naps biscuit" })).toEqual([])
  })

  test("links-to matches a directory by path, not by substring", () => {
    expect(find({ linksTo: "kitchen/pantry" })).toEqual([
      "docs/decisions/0002-biscuit.md",
    ])
    expect(find({ linksTo: "./kitchen/gossip/" })).toEqual([
      "docs/architecture/gossip.md",
    ])
  })

  test("backlinks accepts a page path in any of its three forms", () => {
    const expected = ["docs/decisions/0002-biscuit.md"]
    expect(find({ backlinks: "decisions/0001-naps.md" })).toEqual(expected)
    expect(find({ backlinks: "/decisions/0001-naps.md" })).toEqual(expected)
    expect(find({ backlinks: "docs/decisions/0001-naps.md" })).toEqual(
      expected,
    )
  })

  test("finds pages past stale_after", () => {
    expect(find({ stale: true })).toEqual(["docs/decisions/0001-naps.md"])
  })

  test("finds pages no other concept links to, ignoring the index", () => {
    expect(find({ orphans: true })).toEqual([
      "docs/product/spec.md",
      "docs/architecture/gossip.md",
    ])
  })

  test("combines filters with AND and never returns index or log", () => {
    expect(find({ type: "Decision", status: "accepted" })).toEqual([
      "docs/decisions/0002-biscuit.md",
    ])
    expect(find({})).not.toContain("docs/index.md")
  })
})

describe("formatPage", () => {
  test("prints path, type, status and title", () => {
    expect(formatPage(PAGES[2])).toBe(
      "docs/decisions/0001-naps.md  [Decision, superseded by ADR-0002]  Naps",
    )
  })
})
