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

  test("keeps the plugin version that setup wrote, and defaults to none", () => {
    expect(mergeConfig({}).version).toBe(null)
    expect(mergeConfig({ version: "0.16.2" }).version).toBe("0.16.2")
  })

  test("replaces a list whole, never appends to it", () => {
    const merged = mergeConfig({
      docs: { glossaries: [{ path: "GLOSSARY.md", requiredFields: [] }] },
    })
    expect(merged.docs.glossaries).toEqual([
      { path: "GLOSSARY.md", requiredFields: [] },
    ])
  })

  test("keeps a default next to a key the repo sets in the skills section", () => {
    const merged = mergeConfig({ skills: { reviewIntervalDays: 3 } })
    expect(merged.skills).toEqual({ ...DEFAULTS.skills, reviewIntervalDays: 3 })
    expect(DEFAULTS.skills.reviewIntervalDays).toBe(10)
  })

  test("lists no file to link by default, and replaces the list whole", () => {
    expect(mergeConfig({}).worktreeLinks).toEqual([])
    expect(mergeConfig({ worktreeLinks: [".env.local"] }).worktreeLinks).toEqual([".env.local"])
  })

  test("the template agents.config.json spells out every default", () => {
    const template = JSON.parse(
      readFileSync(join(import.meta.dirname, "..", "agents.config.json"), "utf8"),
    )
    expect(template).toEqual(DEFAULTS)
  })
})
