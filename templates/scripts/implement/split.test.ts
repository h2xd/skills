import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { formatSplit, parseFileMap, planSplit } from "./split.ts"

const SETTINGS = { maxWorkers: 3 }

function plan(text: string, criteria: number, settings = SETTINGS) {
  return planSplit(parseFileMap(text, criteria), settings)
}

function criteriaOf(text: string, criteria: number, settings = SETTINGS) {
  return plan(text, criteria, settings).workers.map((worker) => worker.criteria)
}

describe("parseFileMap", () => {
  test("reads files, unsure and needs, and skips headings and blank lines", () => {
    const map = parseFileMap(
      "# Map\n\n1: src/a.ts, `src/a.test.ts`\n2: unsure\n2 needs 1\n",
      2,
    )
    expect(map.files.get(1)).toEqual({
      unsure: false,
      files: ["src/a.ts", "src/a.test.ts"],
    })
    expect(map.files.get(2)).toEqual({ unsure: true })
    expect(map.needs).toEqual([{ criterion: 2, needed: 1 }])
  })

  test("reads one file in two spellings as one file", () => {
    const map = parseFileMap("1: ./src/a.ts, src//b.ts, src/x/../c.ts\n", 1)
    expect(map.files.get(1)).toEqual({
      unsure: false,
      files: ["src/a.ts", "src/b.ts", "src/c.ts"],
    })
  })

  test("rejects a criterion with an empty file list", () => {
    expect(() => parseFileMap("1: ,\n", 1)).toThrow(
      "criterion 1 has no files, write unsure",
    )
  })

  test("rejects a folder", () => {
    expect(() => parseFileMap("1: src/\n", 1)).toThrow(
      'criterion 1: "src/" is a folder, name its files',
    )
  })

  test("rejects a line it cannot read", () => {
    expect(() => parseFileMap("1: a.ts\nsome prose\n", 1)).toThrow(
      'line 2: cannot read "some prose"',
    )
  })

  test("rejects a criterion without a line", () => {
    expect(() => parseFileMap("1: a.ts\n", 2)).toThrow("criterion 2 has no line")
  })

  test("rejects a criterion the ticket does not have", () => {
    expect(() => parseFileMap("1: a.ts\n2: b.ts\n", 1)).toThrow(
      "criterion 2 is not one of the 1 criteria",
    )
    expect(() => parseFileMap("1: a.ts\n1 needs 4\n", 1)).toThrow(
      "criterion 4 is not one of the 1 criteria",
    )
  })

  test("rejects a second line for one criterion", () => {
    expect(() => parseFileMap("1: a.ts\n1: b.ts\n", 1)).toThrow(
      "criterion 1 has two lines",
    )
  })
})

describe("planSplit", () => {
  test("fewer than 3 criteria stay with one build worker", () => {
    const split = plan("1: a.ts\n2: b.ts\n", 2)
    expect(split.verdict).toBe("single")
    expect(split.workers).toEqual([
      { id: 1, criteria: [1, 2], files: ["a.ts", "b.ts"] },
    ])
  })

  test("criteria with no common file get one build worker each", () => {
    const split = plan("1: a.ts\n2: b.ts\n3: c.ts\n", 3)
    expect(split.verdict).toBe("split")
    expect(split.workers).toEqual([
      { id: 1, criteria: [1], files: ["a.ts"] },
      { id: 2, criteria: [2], files: ["b.ts"] },
      { id: 3, criteria: [3], files: ["c.ts"] },
    ])
  })

  test("criteria that share a file join one criteria group", () => {
    expect(criteriaOf("1: a.ts, x.ts\n2: b.ts\n3: x.ts\n", 3)).toEqual([
      [1, 3],
      [2],
    ])
  })

  test("a shared file joins criteria through a third one", () => {
    expect(criteriaOf("1: a.ts\n2: a.ts, b.ts\n3: b.ts\n4: c.ts\n", 4)).toEqual([
      [1, 2, 3],
      [4],
    ])
  })

  test("a criterion joins the criterion it needs", () => {
    expect(criteriaOf("1: a.ts\n2: b.ts\n3: c.ts\n3 needs 1\n", 3)).toEqual([
      [1, 3],
      [2],
    ])
  })

  test("one criteria group is a single build worker", () => {
    const split = plan("1: a.ts\n2: a.ts\n3: a.ts\n", 3)
    expect(split.verdict).toBe("single")
    expect(split.workers).toHaveLength(1)
  })

  test("more groups than the cap join, the two smallest first", () => {
    const text = "1: a.ts\n2: a.ts\n3: b.ts\n4: c.ts\n5: d.ts\n6: d.ts\n"
    expect(criteriaOf(text, 6)).toEqual([[1, 2], [3, 4], [5, 6]])
  })

  test("the cap comes from the settings", () => {
    const text = "1: a.ts\n2: b.ts\n3: c.ts\n"
    expect(criteriaOf(text, 3, { maxWorkers: 2 })).toEqual([[1, 2], [3]])
    expect(plan(text, 3, { maxWorkers: 1 }).verdict).toBe("single")
  })

  test("an unsure criterion makes the verdict ask and joins the largest group", () => {
    const split = plan("1: a.ts\n2: a.ts\n3: b.ts\n4: unsure\n", 4)
    expect(split.verdict).toBe("ask")
    expect(split.workers.map((worker) => worker.criteria)).toEqual([
      [1, 2, 4],
      [3],
    ])
    expect(split.reasons).toContain(
      "criterion 4: the scout is unsure of its files",
    )
  })

  test("an unsure criterion stays with the criterion it needs", () => {
    const text = "1: a.ts\n2: a.ts\n3: b.ts\n4: unsure\n4 needs 3\n"
    expect(criteriaOf(text, 4)).toEqual([[1, 2], [3, 4]])
  })

  test("only unsure criteria are a single build worker", () => {
    expect(plan("1: unsure\n2: unsure\n3: unsure\n", 3).verdict).toBe("single")
  })

  test("two spellings of one file join one criteria group", () => {
    expect(criteriaOf("1: ./src/a.ts\n2: src/a.ts\n3: src/b.ts\n", 3)).toEqual([
      [1, 2],
      [3],
    ])
  })

  test("an unsure criterion in the only group is named, not called a shared file", () => {
    const split = plan("1: a.ts\n2: a.ts\n3: unsure\n", 3)
    expect(split.verdict).toBe("single")
    expect(split.reasons).toEqual([
      "the criteria with known files form one criteria group",
      "criterion 3: the scout is unsure of its files",
    ])
  })
})

describe("formatSplit", () => {
  test("prints the verdict and one section per build worker", () => {
    expect(formatSplit(plan("1: a.ts, x.ts\n2: b.ts\n3: x.ts\n", 3))).toBe(
      [
        "# Split",
        "",
        "- Verdict: split",
        "- Build workers: 2",
        "",
        "## Build worker 1",
        "",
        "- Criteria: 1, 3",
        "- Files: a.ts, x.ts",
        "",
        "## Build worker 2",
        "",
        "- Criteria: 2",
        "- Files: b.ts",
        "",
        "## Why",
        "",
        "- 2 criteria groups share no file and no dependency",
        "",
      ].join("\n"),
    )
  })
})
