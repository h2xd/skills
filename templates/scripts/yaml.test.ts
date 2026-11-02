import { describe, test } from "node:test"
import { expect } from "../../scripts/expect.ts"
import { parseYaml } from "./yaml.ts"

describe("parseYaml", () => {
  test("reads a page's frontmatter", () => {
    const yaml = [
      "type: Decision",
      'title: "Rule: no cats on the table"',
      "tags: [naps, snacks]",
      "status: accepted # MADR value",
      "generated: { by: claude-code/claude-opus-5-5, at: 2026-10-31T10:00:00Z }",
      "sources:",
      "  - id: issue-42",
      "    resource: https://example.org/cats/cafe/issues/42",
      "    title: 'Move the naps, don''t wait'",
      'okf_version: "0.2"',
    ].join("\n")
    expect(parseYaml(yaml)).toEqual({
      type: "Decision",
      title: "Rule: no cats on the table",
      tags: ["naps", "snacks"],
      status: "accepted",
      generated: { by: "claude-code/claude-opus-5-5", at: "2026-10-31T10:00:00Z" },
      sources: [
        { id: "issue-42", resource: "https://example.org/cats/cafe/issues/42", title: "Move the naps, don't wait" },
      ],
      okf_version: "0.2",
    })
  })

  test("reads a skill's frontmatter", () => {
    const yaml = [
      "name: review-pr",
      'description: "Review a PR. Use when \\"ready\\"."',
      'argument-hint: "[pr-number]"',
      "disable-model-invocation: true",
      'paths: ["**/*.ts", "**/*.tsx"]',
    ].join("\n")
    expect(parseYaml(yaml)).toEqual({
      name: "review-pr",
      description: 'Review a PR. Use when "ready".',
      "argument-hint": "[pr-number]",
      "disable-model-invocation": true,
      paths: ["**/*.ts", "**/*.tsx"],
    })
  })

  test("reads nested maps, block lists, numbers, null and empty values", () => {
    const yaml = "a:\n  b: 1\n  c: 2.5\nlist:\n- x\n- y\nnothing:\ntilde: ~\nno: false"
    expect(parseYaml(yaml)).toEqual({ a: { b: 1, c: 2.5 }, list: ["x", "y"], nothing: null, tilde: null, no: false })
  })

  test("keeps a # inside a word or a quote", () => {
    expect(parseYaml('a: issue#3\nb: "x # y"')).toEqual({ a: "issue#3", b: "x # y" })
  })

  test("returns null for empty frontmatter", () => {
    expect(parseYaml("\n# only a comment\n")).toBe(null)
  })

  test("rejects a plain value holding ': '", () => {
    expect(() => parseYaml("description: Foo: bar")).toThrow('cannot hold ": "')
  })

  test("rejects bad indentation, duplicate keys and unsupported YAML", () => {
    expect(() => parseYaml("a: 1\n  b: 2")).toThrow("unexpected indentation")
    expect(() => parseYaml("a: 1\na: 2")).toThrow('duplicate key "a"')
    expect(() => parseYaml("a: |\n  text")).toThrow("unsupported YAML")
    expect(() => parseYaml("a: [x, y")).toThrow()
  })
})
