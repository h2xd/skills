import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { compareVersions, findDrift, formatDrift } from "./check.ts"

const file = (path: string, template: string, copy: string | null, mayBeMissing = false) => ({
  path,
  template,
  copy,
  mayBeMissing,
})

describe("compareVersions", () => {
  test("compares each part as a number", () => {
    expect(compareVersions("0.9.0", "0.10.0")).toBeLessThan(0)
    expect(compareVersions("1.0.0", "0.99.9")).toBe(1)
    expect(compareVersions("0.16.2", "0.16.2")).toBe(0)
  })
})

describe("findDrift", () => {
  test("names each copied file whose content differs from its template", () => {
    const report = findDrift({
      repoVersion: "0.16.2",
      pluginVersion: "0.16.2",
      files: [
        file("scripts/a.ts", "new\n", "old\n"),
        file("scripts/b.ts", "same\n", "same\n"),
        file("scripts/c.ts", "x\n", "y\n"),
      ],
    })
    expect(report.changed).toEqual(["scripts/a.ts", "scripts/c.ts"])
    expect(report.older).toBe(false)
  })

  test("names a required file that the repo lacks, and skips an optional one", () => {
    const report = findDrift({
      repoVersion: "0.16.2",
      pluginVersion: "0.16.2",
      files: [file("scripts/new.ts", "x", null), file(".github/workflows/docs.yml", "x", null, true)],
    })
    expect(report.missing).toEqual(["scripts/new.ts"])
    expect(report.changed).toEqual([])
  })

  test("says older when the repo version is below the plugin version", () => {
    expect(findDrift({ repoVersion: "0.15.0", pluginVersion: "0.16.2", files: [] }).older).toBe(true)
    expect(findDrift({ repoVersion: "0.17.0", pluginVersion: "0.16.2", files: [] }).older).toBe(false)
  })

  test("says older when setup wrote no version", () => {
    expect(findDrift({ repoVersion: null, pluginVersion: "0.16.2", files: [] }).older).toBe(true)
  })
})

describe("formatDrift", () => {
  test("says ok when nothing differs", () => {
    const report = findDrift({ repoVersion: "0.16.2", pluginVersion: "0.16.2", files: [] })
    expect(formatDrift(report)).toBe("ok: the copies match plugin 0.16.2")
  })

  test("names the versions, the changed files and the missing files", () => {
    const report = findDrift({
      repoVersion: "0.15.0",
      pluginVersion: "0.16.2",
      files: [file("scripts/a.ts", "n", "o"), file("scripts/b.ts", "n", null)],
    })
    expect(formatDrift(report)).toBe(
      [
        "drift: the copies are older than the plugin (repo 0.15.0, plugin 0.16.2)",
        "changed: scripts/a.ts",
        "missing: scripts/b.ts",
        "run /h2xd:setup",
      ].join("\n"),
    )
  })

  test("reports a missing file even when the versions match", () => {
    const report = findDrift({
      repoVersion: "0.16.2",
      pluginVersion: "0.16.2",
      files: [file("scripts/new.ts", "x", null)],
    })
    expect(formatDrift(report)).toBe(
      [
        "drift: the copies are older than the plugin (repo 0.16.2, plugin 0.16.2)",
        "missing: scripts/new.ts",
        "run /h2xd:setup",
      ].join("\n"),
    )
  })

  test("says no version when setup wrote none", () => {
    const report = findDrift({ repoVersion: null, pluginVersion: "0.16.2", files: [] })
    expect(formatDrift(report)).toContain("(repo no version, plugin 0.16.2)")
  })
})
