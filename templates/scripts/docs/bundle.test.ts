import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { parseIndexEntries, parsePage, resolveLink, toDate } from "./bundle.ts"

describe("resolveLink", () => {
  test("resolves a bundle-root link against docs/", () => {
    expect(resolveLink("product/spec.md", "/decisions/0001-x.md")).toBe(
      "docs/decisions/0001-x.md",
    )
  })

  test("resolves a relative link against the page's directory", () => {
    expect(resolveLink("product/spec.md", "./rules.md")).toBe(
      "docs/product/rules.md",
    )
  })

  test("resolves a link that leaves the bundle to a repo path", () => {
    expect(
      resolveLink("decisions/0002-x.md", "../../kitchen/pantry/src/"),
    ).toBe("kitchen/pantry/src")
  })

  test("drops the anchor", () => {
    expect(resolveLink("index.md", "/product/rules.md#dos")).toBe(
      "docs/product/rules.md",
    )
  })
})

describe("parsePage", () => {
  test("parses frontmatter and separates the body", () => {
    const page = parsePage(
      "product/spec.md",
      "---\ntype: Product Spec\ntags: [a, b]\n---\n\n# Spec\n",
    )
    expect(page.kind).toBe("concept")
    expect(page.frontmatter).toEqual({ type: "Product Spec", tags: ["a", "b"] })
    expect(page.body).toBe("\n# Spec\n")
  })

  test("records invalid YAML instead of throwing", () => {
    const page = parsePage("product/spec.md", "---\ntype: [unclosed\n---\n")
    expect(page.frontmatter).toBeUndefined()
    expect(page.frontmatterError).toBeDefined()
  })

  test("classifies index and log files", () => {
    expect(parsePage("index.md", "").kind).toBe("index")
    expect(parsePage("plans/log.md", "").kind).toBe("log")
  })

  test("extracts links, skipping anchors, footnotes and fenced code", () => {
    const page = parsePage(
      "product/spec.md",
      [
        "See [rules](./rules.md), [top](#top) and [site](https://example.com).",
        "A claim.[^source]",
        "```markdown",
        "[inside a fence](/not/a/link.md)",
        "```",
        "[^source]: A source",
      ].join("\n"),
    )
    expect(page.links.map((link) => link.resolved)).toEqual([
      "docs/product/rules.md",
      "https://example.com",
    ])
    expect(page.links[1].external).toBe(true)
  })
})

describe("parseIndexEntries", () => {
  test("reads title, link and description from each entry line", () => {
    const index = parsePage(
      "index.md",
      "# Product\n\n* [Spec](/product/spec.md) - What the agent does.\nNot an entry.\n",
    )
    const [entry] = parseIndexEntries(index)
    expect(entry.title).toBe("Spec")
    expect(entry.link.resolved).toBe("docs/product/spec.md")
    expect(entry.description).toBe("What the agent does.")
  })
})

describe("toDate", () => {
  test("accepts a Date and an ISO string, rejects anything else", () => {
    const date = new Date("2026-09-28T00:00:00Z")
    expect(toDate(date)).toBe(date)
    expect(toDate("2026-09-28")?.toISOString()).toBe(date.toISOString())
    expect(toDate("next week")).toBeUndefined()
    expect(toDate(42)).toBeUndefined()
  })
})
