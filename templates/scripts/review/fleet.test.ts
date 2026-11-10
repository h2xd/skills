import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import {
  type FileChange,
  formatFleet,
  parseNumstat,
  parseRaw,
  pickFleet,
} from "./fleet.ts"

const SETTINGS = {
  small: { files: 10, lines: 500 },
  middle: { files: 20, lines: 1000 },
  criticalPaths: ["migrations/"],
  mutationEnabled: true,
}

function files(count: number, lines: number): FileChange[] {
  return Array.from({ length: count }, (_, i) => ({
    path: `src/a${i}.ts`,
    lines,
  }))
}

describe("parseNumstat", () => {
  test("adds both columns and counts a binary file as zero", () => {
    expect(parseNumstat("3\t2\tsrc/a.ts\n-\t-\tlogo.png\n")).toEqual([
      { path: "src/a.ts", lines: 5 },
      { path: "logo.png", lines: 0 },
    ])
  })
})

describe("pickFleet", () => {
  test("a small code change gets A and the reaper", () => {
    const fleet = pickFleet(files(9, 55), SETTINGS, false)
    expect(fleet.size).toBe("small")
    expect(fleet.reviewers).toEqual(["A", "C"])
    expect(fleet.effort).toBe("medium")
    expect(fleet.ask).toBe(false)
  })

  test("10 files is no longer small", () => {
    expect(pickFleet(files(10, 1), SETTINGS, false).size).toBe("middle")
  })

  test("500 lines is no longer small", () => {
    expect(pickFleet(files(1, 500), SETTINGS, false).size).toBe("middle")
  })

  test("a small docs change gets B and the reaper", () => {
    const docs = [{ path: "docs/page.md", lines: 20 }]
    expect(pickFleet(docs, SETTINGS, false).reviewers).toEqual(["B", "C"])
  })

  test("a SKILL.md counts as code, not docs", () => {
    const skill = [{ path: "skills/x/SKILL.md", lines: 20 }]
    expect(pickFleet(skill, SETTINGS, false).reviewers).toEqual(["A", "C"])
  })

  test("a middle change adds a lens per kind of file", () => {
    const changes = [
      ...files(8, 50),
      { path: "README.md", lines: 10 },
      { path: ".github/workflows/ci.yml", lines: 10 },
    ]
    const fleet = pickFleet(changes, SETTINGS, false)
    expect(fleet.size).toBe("middle")
    expect(fleet.reviewers).toEqual(["A", "B", "C", "D", "E"])
    expect(fleet.ask).toBe(false)
  })

  test("a middle test-only change skips D", () => {
    const tests = files(12, 10).map((change) => ({
      ...change,
      path: change.path.replace(".ts", ".test.ts"),
    }))
    expect(pickFleet(tests, SETTINGS, false).reviewers).toEqual(["A", "C"])
  })

  test("20 files is large and asks first", () => {
    const fleet = pickFleet(files(20, 1), SETTINGS, false)
    expect(fleet.size).toBe("large")
    expect(fleet.reviewers).toEqual(["A", "B", "C", "D", "E"])
    expect(fleet.ask).toBe(true)
  })

  test("a one-way door gets every reviewer without asking", () => {
    const fleet = pickFleet(files(1, 1), SETTINGS, true)
    expect(fleet.size).toBe("critical")
    expect(fleet.reviewers).toEqual(["A", "B", "C", "D", "E"])
    expect(fleet.ask).toBe(false)
  })

  test("a critical path makes a small change critical", () => {
    const changes = [{ path: "migrations/001.sql", lines: 3 }]
    const fleet = pickFleet(changes, SETTINGS, false)
    expect(fleet.size).toBe("critical")
    expect(fleet.reasons).toEqual(["migrations/001.sql is a critical path"])
  })

  test("lock files do not count", () => {
    const changes = [
      { path: "src/a.ts", lines: 10 },
      { path: "package-lock.json", lines: 5000 },
    ]
    const fleet = pickFleet(changes, SETTINGS, false)
    expect([fleet.size, fleet.files, fleet.lines]).toEqual(["small", 1, 10])
  })

  test("drops D when mutation testing is off", () => {
    const off = { ...SETTINGS, mutationEnabled: false }
    expect(pickFleet(files(20, 1), off, false).reviewers).toEqual([
      "A",
      "B",
      "C",
      "E",
    ])
  })

  test("two changed files with the same content count once", () => {
    const changes = [
      { path: "src/a.ts", lines: 10, hash: "aaa111" },
      { path: "src/copy/a.ts", lines: 10, hash: "aaa111" },
    ]
    const fleet = pickFleet(changes, SETTINGS, false)
    expect([fleet.files, fleet.lines]).toEqual([1, 10])
  })

  test("different hashes and missing hashes count as before", () => {
    const changes = [
      { path: "src/a.ts", lines: 10, hash: "aaa111" },
      { path: "src/b.ts", lines: 10, hash: "bbb222" },
      { path: "src/c.ts", lines: 10 },
      { path: "src/d.ts", lines: 10 },
    ]
    const fleet = pickFleet(changes, SETTINGS, false)
    expect([fleet.files, fleet.lines]).toEqual([4, 40])
    expect(fleet.reasons.some((reason) => reason.includes("cop"))).toBe(false)
  })

  test("deleted files and empty files are never copies of each other", () => {
    const zeros = "0".repeat(40)
    const empty = "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391"
    const changes = [
      { path: "src/a.ts", lines: 5, hash: zeros },
      { path: "src/b.ts", lines: 5, hash: zeros },
      { path: "src/c.ts", lines: 0, hash: empty },
      { path: "src/d.ts", lines: 0, hash: empty },
    ]
    expect(pickFleet(changes, SETTINGS, false).files).toBe(4)
  })

  test("the reasons name the copies that were left out", () => {
    const changes = [
      { path: "src/a.ts", lines: 10, hash: "aaa111" },
      { path: "src/b.ts", lines: 10, hash: "aaa111" },
      { path: "src/c.ts", lines: 10, hash: "aaa111" },
    ]
    const fleet = pickFleet(changes, SETTINGS, false)
    expect(fleet.reasons).toContain(
      "2 copies left out: src/b.ts and src/c.ts repeat src/a.ts",
    )
  })

  test("a copy in a critical path still makes the change critical", () => {
    const changes = [
      { path: "src/a.ts", lines: 3, hash: "aaa111" },
      { path: "migrations/a.ts", lines: 3, hash: "aaa111" },
    ]
    expect(pickFleet(changes, SETTINGS, false).size).toBe("critical")
  })

  test("formatFleet prints the copies line", () => {
    const changes = [
      { path: "src/a.ts", lines: 10, hash: "aaa111" },
      { path: "src/b.ts", lines: 10, hash: "aaa111" },
    ]
    const text = formatFleet(pickFleet(changes, SETTINGS, false))
    expect(text).toContain(
      "- 1 copy left out: src/b.ts repeats src/a.ts",
    )
  })
})

describe("parseRaw", () => {
  test("reads the new hash and the path, and joins the line counts", () => {
    const raw = [
      ":100644 100644 1111111 2222222 M\tsrc/a.ts",
      ":100644 000000 3333333 0000000 D\tsrc/gone.ts",
    ].join("\n")
    const numstat = [
      { path: "src/a.ts", lines: 5 },
      { path: "src/gone.ts", lines: 9 },
    ]
    expect(parseRaw(raw, numstat)).toEqual([
      { path: "src/a.ts", lines: 5, hash: "2222222" },
      { path: "src/gone.ts", lines: 9, hash: "0000000" },
    ])
  })

  test("keeps a file the raw output does not list, without a hash", () => {
    expect(parseRaw("", [{ path: "x.ts", lines: 2 }])).toEqual([
      { path: "x.ts", lines: 2 },
    ])
  })
})
