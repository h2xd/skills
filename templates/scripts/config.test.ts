import { describe, test } from "node:test"
import { expect } from "../../scripts/expect.ts"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { DEFAULTS, mergeConfig } from "./config.ts"

describe("mergeConfig", () => {
  test("returns the defaults for an empty file", () => {
    expect(mergeConfig({})).toEqual(DEFAULTS)
  })

  test("replaces a key and keeps its siblings", () => {
    const merged = mergeConfig({ commits: { scopes: ["game", "design"] } })
    expect(merged.commits).toEqual({ ...DEFAULTS.commits, scopes: ["game", "design"] })
    expect(merged.docs).toEqual(DEFAULTS.docs)
  })

  test("replaces a list whole, never appends to it", () => {
    const merged = mergeConfig({
      docs: { glossaries: [{ path: "GLOSSARY.md", requiredFields: [] }] },
    })
    expect(merged.docs.glossaries).toEqual([
      { path: "GLOSSARY.md", requiredFields: [] },
    ])
  })

  test("the template agents.config.json spells out every default", () => {
    const template = JSON.parse(
      readFileSync(join(import.meta.dirname, "..", "agents.config.json"), "utf8"),
    )
    expect(template).toEqual(DEFAULTS)
  })
})
