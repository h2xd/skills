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
    from: null,
    lines,
    hash: null,
  }))
}

describe("parseNumstat", () => {
  test("adds both columns and counts a binary file as zero", () => {
    const text = "3\t2\tsrc/a.ts\0-\t-\tlogo.png\0"
    expect(parseNumstat(text)).toEqual([
      { path: "src/a.ts", from: null, lines: 5, hash: null },
      { path: "logo.png", from: null, lines: 0, hash: null },
    ])
  })

  test("keys a rename on its new path with the lines of the rename", () => {
    const text = "0\t0\t\0big.txt\0moved.txt\0" + "4\t1\tsrc/b.ts\0"
    expect(parseNumstat(text)).toEqual([
      { path: "moved.txt", from: "big.txt", lines: 0, hash: null },
      { path: "src/b.ts", from: null, lines: 5, hash: null },
    ])
  })

  test("keeps the old path of a rename and of a copy", () => {
    const text = "0\t0\t\0old.txt\0new.txt\0" + "0\t0\t\0a.txt\0b.txt\0"
    expect(parseNumstat(text)).toEqual([
      { path: "new.txt", from: "old.txt", lines: 0, hash: null },
      { path: "b.txt", from: "a.txt", lines: 0, hash: null },
    ])
  })

  test("a path that starts with a tab is no rename", () => {
    const text = "1\t0\t\tlead.txt\0" + "1\t0\t.gitmodules\0" + "1\t0\t:colon.txt\0"
    expect(parseNumstat(text)).toEqual([
      { path: "\tlead.txt", from: null, lines: 1, hash: null },
      { path: ".gitmodules", from: null, lines: 1, hash: null },
      { path: ":colon.txt", from: null, lines: 1, hash: null },
    ])
  })

  test("keeps a path with a space and a tab", () => {
    expect(parseNumstat("1\t1\ta b\tc.ts\0")).toEqual([
      { path: "a b\tc.ts", from: null, lines: 2, hash: null },
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
    const docs = [{ path: "docs/page.md", from: null, lines: 20, hash: null }]
    expect(pickFleet(docs, SETTINGS, false).reviewers).toEqual(["B", "C"])
  })

  test("a SKILL.md counts as code, not docs", () => {
    const skill = [{ path: "skills/x/SKILL.md", from: null, lines: 20, hash: null }]
    expect(pickFleet(skill, SETTINGS, false).reviewers).toEqual(["A", "C"])
  })

  test("a middle change adds a lens per kind of file", () => {
    const changes = [
      ...files(8, 50),
      { path: "README.md", from: null, lines: 10, hash: null },
      { path: ".github/workflows/ci.yml", from: null, lines: 10, hash: null },
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
    const changes = [{ path: "migrations/001.sql", from: null, lines: 3, hash: null }]
    const fleet = pickFleet(changes, SETTINGS, false)
    expect(fleet.size).toBe("critical")
    expect(fleet.reasons).toEqual(["migrations/001.sql is a critical path"])
  })

  test("lock files do not count", () => {
    const changes = [
      { path: "src/a.ts", from: null, lines: 10, hash: null },
      { path: "package-lock.json", from: null, lines: 5000, hash: null },
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
      { path: "src/a.ts", from: null, lines: 10, hash: "aaa111" },
      { path: "src/copy/a.ts", from: null, lines: 10, hash: "aaa111" },
    ]
    const fleet = pickFleet(changes, SETTINGS, false)
    expect([fleet.files, fleet.lines]).toEqual([1, 10])
  })

  test("different hashes and missing hashes count as before", () => {
    const changes = [
      { path: "src/a.ts", from: null, lines: 10, hash: "aaa111" },
      { path: "src/b.ts", from: null, lines: 10, hash: "bbb222" },
      { path: "src/c.ts", from: null, lines: 10, hash: null },
      { path: "src/d.ts", from: null, lines: 10, hash: null },
    ]
    const fleet = pickFleet(changes, SETTINGS, false)
    expect([fleet.files, fleet.lines]).toEqual([4, 40])
    expect(fleet.reasons.some((reason) => reason.includes("cop"))).toBe(false)
  })

  test("deleted files and empty files are never copies of each other", () => {
    const zeros = "0".repeat(40)
    const empty = "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391"
    const changes = [
      { path: "src/a.ts", from: null, lines: 5, hash: zeros },
      { path: "src/b.ts", from: null, lines: 5, hash: zeros },
      { path: "src/c.ts", from: null, lines: 0, hash: empty },
      { path: "src/d.ts", from: null, lines: 0, hash: empty },
    ]
    expect(pickFleet(changes, SETTINGS, false).files).toBe(4)
  })

  test("the reasons name the copies that were left out", () => {
    const changes = [
      { path: "src/a.ts", from: null, lines: 10, hash: "aaa111" },
      { path: "src/b.ts", from: null, lines: 10, hash: "aaa111" },
      { path: "src/c.ts", from: null, lines: 10, hash: "aaa111" },
    ]
    const fleet = pickFleet(changes, SETTINGS, false)
    expect(fleet.reasons).toContain(
      "2 copies left out: src/a.ts, src/b.ts and src/c.ts have the same content",
    )
  })

  test("the change with the most lines stays, wherever it sits", () => {
    const changes = [
      { path: "src/tool.sh", from: null, lines: 0, hash: "aaa111" },
      { path: "src/zz.sh", from: null, lines: 10, hash: "aaa111" },
    ]
    const fleet = pickFleet(changes, SETTINGS, false)
    expect([fleet.files, fleet.lines]).toEqual([1, 10])
  })

  test("each group of equal files gets its own clause", () => {
    const changes = [
      { path: "a.ts", from: null, lines: 1, hash: "aaa111" },
      { path: "bin1", from: null, lines: 1, hash: "bbb222" },
      { path: "b.ts", from: null, lines: 1, hash: "aaa111" },
      { path: "bin2", from: null, lines: 1, hash: "bbb222" },
    ]
    expect(pickFleet(changes, SETTINGS, false).reasons).toContain(
      "2 copies left out: a.ts and b.ts have the same content; bin1 and bin2 have the same content",
    )
  })

  test("a copy in a critical path still makes the change critical", () => {
    const changes = [
      { path: "src/a.ts", from: null, lines: 3, hash: "aaa111" },
      { path: "migrations/a.ts", from: null, lines: 3, hash: "aaa111" },
    ]
    expect(pickFleet(changes, SETTINGS, false).size).toBe("critical")
  })

  test("formatFleet prints the copies line", () => {
    const changes = [
      { path: "src/a.ts", from: null, lines: 10, hash: "aaa111" },
      { path: "src/b.ts", from: null, lines: 10, hash: "aaa111" },
    ]
    const text = formatFleet(pickFleet(changes, SETTINGS, false))
    expect(text).toContain(
      "- 1 copy left out: src/a.ts and src/b.ts have the same content",
    )
  })
})

describe("parseRaw", () => {
  test("reads the new hash and the path, and joins the line counts", () => {
    const raw =
      ":100644 100644 1111111 2222222 M\0src/a.ts\0" +
      ":100644 000000 3333333 0000000 D\0src/gone.ts\0"
    const numstat = [
      { path: "src/a.ts", from: null, lines: 5, hash: null },
      { path: "src/gone.ts", from: null, lines: 9, hash: null },
    ]
    expect(parseRaw(raw, numstat)).toEqual([
      { path: "src/a.ts", from: null, lines: 5, hash: "2222222" },
      { path: "src/gone.ts", from: null, lines: 9, hash: "0000000" },
    ])
  })

  test("keys a rename on its new path", () => {
    const raw = ":100644 100644 1111111 2222222 R100\0big.txt\0moved.txt\0"
    expect(
      parseRaw(raw, [{ path: "moved.txt", from: "big.txt", lines: 0, hash: null }]),
    ).toEqual([{ path: "moved.txt", from: "big.txt", lines: 0, hash: "2222222" }])
  })

  test("keeps a path with a space and a tab", () => {
    const raw = ":000000 100644 0000000 4444444 A\0a b\tc.ts\0"
    expect(
      parseRaw(raw, [{ path: "a b\tc.ts", from: null, lines: 2, hash: null }]),
    ).toEqual([{ path: "a b\tc.ts", from: null, lines: 2, hash: "4444444" }])
  })

  test("keeps a file the raw output does not list, without a hash", () => {
    expect(parseRaw("", [{ path: "x.ts", from: null, lines: 2, hash: null }])).toEqual([
      { path: "x.ts", from: null, lines: 2, hash: null },
    ])
  })
})

describe("a pure rename", () => {
  test("counts as one file with the lines of the rename", () => {
    const numstat = parseNumstat("0\t0\t\0big.txt\0moved.txt\0")
    const raw = ":100644 100644 1111111 1111111 R100\0big.txt\0moved.txt\0"
    const fleet = pickFleet(parseRaw(raw, numstat), SETTINGS, false)
    expect([fleet.files, fleet.lines]).toEqual([1, 0])
  })
})

describe("a file renamed out of a critical path", () => {
  test("makes the change critical", () => {
    const numstat = parseNumstat("0\t0\t\0migrations/x.sql\0x.sql\0")
    const raw = ":100644 100644 1111111 1111111 R100\0migrations/x.sql\0x.sql\0"
    const fleet = pickFleet(parseRaw(raw, numstat), SETTINGS, false)
    expect(fleet.size).toBe("critical")
    expect(fleet.reasons).toEqual([
      "migrations/x.sql => x.sql is a critical path",
    ])
  })
})
