import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { DEFAULTS } from "../config.ts"
import { formatFixSplit, parseFixItems, planFixSplit } from "./split.ts"

const SETTINGS = { fixMaxWorkers: 3 }

function threadsFor(count: number): string {
  return Array.from({ length: count }, (_, i) => `## T${i + 1}\n- Thread id: x${i}\n`).join("\n")
}

function planFor(files: string[]): string {
  return [
    "| id | bucket | where | change |",
    "|---|---|---|---|",
    ...files.map((file, i) => `| T${i + 1} | fix | ${file}:${i + 1} | change |`),
  ].join("\n")
}

function groupsOf(files: string[], settings = SETTINGS): string[][] {
  const items = parseFixItems(planFor(files), threadsFor(files.length))
  return planFixSplit(items, settings).workers.map((worker) => worker.items)
}

const distinct = (count: number) => Array.from({ length: count }, (_, i) => `src/f${i}.ts`)

describe("planFixSplit", () => {
  test("a review with 5 or fewer fix items starts one worker", () => {
    expect(groupsOf(distinct(5))).toEqual([["T1", "T2", "T3", "T4", "T5"]])
    expect(groupsOf(distinct(1))).toEqual([["T1"]])
  })

  test("a review with 8 fix items starts two workers of at most 5", () => {
    const groups = groupsOf(distinct(8))
    expect(groups.length).toBe(2)
    expect(groups.every((group) => group.length <= 5)).toBe(true)
    expect(groups.flat().sort()).toEqual(["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"])
  })

  test("two items on the same file are never in different groups", () => {
    const files = [
      "src/a.ts", "src/b.ts", "src/c.ts", "src/d.ts", "src/e.ts",
      "src/f.ts", "src/a.ts", "src/b.ts", "src/c.ts",
    ]
    const groups = groupsOf(files)
    const groupOf = (id: string) => groups.findIndex((group) => group.includes(id))
    expect(groupOf("T1")).toBe(groupOf("T7"))
    expect(groupOf("T2")).toBe(groupOf("T8"))
    expect(groupOf("T3")).toBe(groupOf("T9"))
  })

  test("the same file wins over the cap of 5 items", () => {
    const groups = groupsOf(Array.from({ length: 7 }, () => "src/a.ts"))
    expect(groups).toEqual([["T1", "T2", "T3", "T4", "T5", "T6", "T7"]])
  })

  test("the cap on workers wins over the cap of 5 items", () => {
    const groups = groupsOf(distinct(20), { fixMaxWorkers: 2 })
    expect(groups.length).toBe(2)
    expect(groups.flat().length).toBe(20)
  })

  test("8 items on different files split into two groups of 4", () => {
    expect(groupsOf(distinct(8)).map((group) => group.length)).toEqual([4, 4])
  })

  test("fixMaxWorkers 0 still starts one worker with every item", () => {
    expect(groupsOf(distinct(3), { fixMaxWorkers: 0 })).toEqual([["T1", "T2", "T3"]])
  })

  test("fixMaxWorkers 1 starts one worker", () => {
    expect(groupsOf(distinct(12), { fixMaxWorkers: 1 }).length).toBe(1)
  })

  test("a review without fix items starts no worker", () => {
    expect(planFixSplit([], SETTINGS).workers).toEqual([])
  })

  test("a group over 5 items adds a worker while the cap allows one", () => {
    const files = [..."aaaabbbbcc"].map((letter) => `src/${letter}.ts`)
    expect(groupsOf(files).map((group) => group.length)).toEqual([4, 4, 2])
  })

  test("largest groups are packed first", () => {
    const files = [..."aaaabbbcc"].map((letter) => `src/${letter}.ts`)
    const groups = groupsOf(files, { fixMaxWorkers: 2 })
    expect(groups.map((group) => group.length)).toEqual([4, 5])
  })

  test("reasons name no oversize group when every worker holds 5 or fewer", () => {
    const items = parseFixItems(planFor(distinct(5)), threadsFor(5))
    expect(planFixSplit(items, SETTINGS).reasons.length).toBe(1)
  })

  test("items with a - location are independent and stay within 5", () => {
    const plan = Array.from({ length: 6 }, (_, i) => `| T${i + 1} | fix | - | x |`).join("\n")
    const split = planFixSplit(parseFixItems(plan, threadsFor(6)), SETTINGS)
    expect(split.workers.map((worker) => worker.items.length)).toEqual([3, 3])
    expect(split.workers.every((worker) => worker.files.length === 0)).toBe(true)
  })

  test("the default cap on workers is 3", () => {
    expect(DEFAULTS.review.fixMaxWorkers).toBe(3)
  })
})

describe("parseFixItems", () => {
  test("keeps only fix rows and strips the line number", () => {
    const plan = [
      "| T1 | fix | `src/a.ts:12` | x |",
      "| T2 | decline | src/b.ts:3 | y |",
      "| S1 | **fix** | src/c.ts:4-9 | z |",
    ].join("\n")
    expect(parseFixItems(plan, threadsFor(2) + "\n## S1\n- Item id: out-00000000\n")).toEqual([
      { id: "T1", file: "src/a.ts" },
      { id: "S1", file: "src/c.ts" },
    ])
  })

  test("reads a bucket in any letter case", () => {
    const items = parseFixItems("| T1 | Fix | a.ts:1 | x |", threadsFor(1))
    expect(items.map((item) => item.id)).toEqual(["T1"])
  })

  test("fails when one item has two rows", () => {
    const plan = "| T1 | fix | a.ts:1 | x |\n| T1 | fix | b.ts:2 | y |"
    expect(() => parseFixItems(plan, threadsFor(1))).toThrow('T1 has two rows')
  })

  test("strips a leading ./ so both spellings share a file", () => {
    const plan = "| T1 | fix | ./src/a.ts:3 | x |\n| T2 | fix | src/a.ts:9 | y |"
    const files = parseFixItems(plan, threadsFor(2)).map((item) => item.file)
    expect(files).toEqual(["src/a.ts", "src/a.ts"])
  })

  test("fails on a fix row that threads.md does not list", () => {
    expect(() => parseFixItems("| T9 | fix | a.ts:1 | x |", threadsFor(1))).toThrow("T9")
  })
})

describe("formatFixSplit", () => {
  test("lists each worker with its items and files", () => {
    const text = formatFixSplit(
      planFixSplit(parseFixItems(planFor(distinct(6)), threadsFor(6)), SETTINGS),
    )
    expect(text).toContain("- Fixer workers: 2")
    expect(text).toContain("## Fixer worker 2")
  })
})
