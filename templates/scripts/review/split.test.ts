import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { DEFAULTS } from "../config.ts"
import { fixerPlans, formatFixSplit, parseFixItems, planFixSplit } from "./split.ts"

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

function groupedPlan(rows: [file: string, group: string][]): string {
  return [
    "| id | bucket | where | change | group |",
    "|---|---|---|---|---|",
    ...rows.map(([file, group], i) => `| T${i + 1} | fix | ${file}:${i + 1} | change | ${group} |`),
  ].join("\n")
}

function groupedWorkers(rows: [string, string][], settings = SETTINGS): string[][] {
  const items = parseFixItems(groupedPlan(rows), threadsFor(rows.length))
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

  test("a fixMaxWorkers that is not a whole number fails with its name", () => {
    for (const bad of [Number.NaN, 2.5]) {
      expect(() => groupsOf(distinct(3), { fixMaxWorkers: bad })).toThrow(
        "review.fixMaxWorkers must be a whole number",
      )
    }
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

  test("a review without fix items says why", () => {
    expect(planFixSplit([], SETTINGS).reasons).toEqual(["no fix items"])
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

  test("items inside a worker keep plan order", () => {
    expect(groupsOf(["src/b.ts", "src/a.ts", "src/a.ts"], { fixMaxWorkers: 1 })).toEqual([
      ["T1", "T2", "T3"],
    ])
  })

  test("workers are numbered by their first item", () => {
    const files = ["src/x.ts", ...Array.from({ length: 6 }, () => "src/y.ts")]
    const items = parseFixItems(planFor(files), threadsFor(7))
    const workers = planFixSplit(items, { fixMaxWorkers: 2 }).workers
    expect(workers[0].items[0]).toBe("T1")
    expect(workers[1].id).toBe(2)
  })

  test("the files of a worker are sorted", () => {
    const items = parseFixItems(planFor(["src/b.ts", "src/a.ts"]), threadsFor(2))
    expect(planFixSplit(items, SETTINGS).workers[0].files).toEqual(["src/a.ts", "src/b.ts"])
  })

  test("the default cap on workers is 3", () => {
    expect(DEFAULTS.review.fixMaxWorkers).toBe(3)
  })
})

describe("planFixSplit with a group cell", () => {
  test("rows of one group go to one fixer, whatever files they name", () => {
    const rows = Array.from({ length: 8 }, (_, i): [string, string] => [
      `src/f${i}.ts`,
      i % 2 === 0 ? "catchup" : "other",
    ])

    expect(groupedWorkers(rows, { fixMaxWorkers: 2 })).toEqual([
      ["T1", "T3", "T5", "T7"],
      ["T2", "T4", "T6", "T8"],
    ])
  })

  test("a group never splits, even above 5 rows", () => {
    const rows = Array.from({ length: 7 }, (_, i): [string, string] => [`src/f${i}.ts`, "one"])

    expect(groupedWorkers(rows)).toEqual([["T1", "T2", "T3", "T4", "T5", "T6", "T7"]])
  })

  test("the cap joins the smallest groups and keeps each group whole", () => {
    const rows: [string, string][] = [
      ["a.ts", "g1"], ["b.ts", "g1"], ["c.ts", "g1"],
      ["d.ts", "g2"], ["e.ts", "g2"],
      ["f.ts", "g3"], ["g.ts", "g3"],
      ["h.ts", "g4"],
    ]

    expect(groupedWorkers(rows, { fixMaxWorkers: 2 })).toEqual([
      ["T1", "T2", "T3", "T8"],
      ["T4", "T5", "T6", "T7"],
    ])
  })

  test("a row with no group follows the rows that name its file", () => {
    const plan = [
      "| T1 | fix | src/a.ts:1 | x | topic |",
      "| T2 | fix | src/b.ts:2 | x |",
      "| T3 | fix | src/c.ts:3 | x | topic |",
      "| T4 | fix | src/b.ts:9 | x | - |",
      "| T5 | fix | src/e.ts:3 | x | topic |",
      "| T6 | fix | src/b.ts:4 | x |",
    ].join("\n")
    const split = planFixSplit(parseFixItems(plan, threadsFor(6)), { fixMaxWorkers: 2 })

    expect(split.workers.map((worker) => worker.items)).toEqual([["T1", "T3", "T5"], ["T2", "T4", "T6"]])
  })

  test("a group name never joins a row that names a file of the same text", () => {
    const plan = [
      "| T1 | fix | src/x.ts:1 | x | src/a.ts |",
      "| T2 | fix | src/a.ts:2 | x |",
      ...[3, 4, 5, 6].map((n) => `| T${n} | fix | src/f${n}.ts:1 | x |`),
    ].join("\n")
    const workers = planFixSplit(parseFixItems(plan, threadsFor(6)), { fixMaxWorkers: 2 }).workers

    expect(workers.map((worker) => worker.items.includes("T1") === worker.items.includes("T2"))).toEqual([false, false])
  })
})

describe("fixerPlans", () => {
  const plan = [
    "Plan of PR 12",
    "",
    "Choices are final.",
    "",
    "| id | bucket | where | change | group |",
    "|---|---|---|---|---|",
    "| T1 | fix | src/a.ts:1 | first | one |",
    "| T2 | decline | src/b.ts:2 | no | |",
    "| T3 | fix | src/c.ts:3 | third | two |",
    "| T4 | fix | src/d.ts:4 | fourth | one |",
    "| T5 | fix | src/e.ts:5 | fifth | two |",
    "| T6 | fix | src/f.ts:6 | sixth | one |",
    "| T7 | fix | src/g.ts:7 | seventh | two |",
  ].join("\n")

  const plans = () => {
    const split = planFixSplit(parseFixItems(plan, threadsFor(7)), { fixMaxWorkers: 2 })
    return fixerPlans(plan, split)
  }

  test("writes one plan for each fixer, named plan-<id>.md", () => {
    expect(plans().map((file) => file.name)).toEqual(["plan-1.md", "plan-2.md"])
  })

  test("holds the lines above the table, the table header and the rows of that fixer", () => {
    expect(plans()[0].text).toBe(
      [
        "Plan of PR 12",
        "",
        "Choices are final.",
        "",
        "| id | bucket | where | change | group |",
        "|---|---|---|---|---|",
        "| T1 | fix | src/a.ts:1 | first | one |",
        "| T4 | fix | src/d.ts:4 | fourth | one |",
        "| T6 | fix | src/f.ts:6 | sixth | one |",
        "",
      ].join("\n"),
    )
  })

  test("holds no row of another fixer and no decline row", () => {
    const [first, second] = plans()

    expect(second.text).toContain("| T3 |")
    expect(second.text).not.toContain("| T1 |")
    expect(first.text).not.toContain("| T3 |")
    expect(first.text).not.toContain("| T2 |")
    expect(second.text).not.toContain("| T2 |")
  })

  test("writes a plan with no table header when the plan has none", () => {
    const bare = "| T1 | fix | src/a.ts:1 | x |"
    const split = planFixSplit(parseFixItems(bare, threadsFor(1)), SETTINGS)

    expect(fixerPlans(bare, split)[0].text).toBe("| T1 | fix | src/a.ts:1 | x |\n")
  })
})

describe("parseFixItems", () => {
  test("reads a group from the fifth cell and treats an empty cell or - as none", () => {
    const plan = [
      "| T1 | fix | a.ts:1 | x | topic |",
      "| T2 | fix | b.ts:1 | x | - |",
      "| T3 | fix | c.ts:1 | x |  |",
      "| T4 | fix | d.ts:1 | x |",
    ].join("\n")

    expect(parseFixItems(plan, threadsFor(4))).toEqual([
      { id: "T1", file: "a.ts", group: "topic" },
      { id: "T2", file: "b.ts" },
      { id: "T3", file: "c.ts" },
      { id: "T4", file: "d.ts" },
    ])
  })

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

  test("skips a line outside a table", () => {
    expect(parseFixItems("T1 | fix | a.ts:1 | x", threadsFor(1))).toEqual([])
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

  test("names the files of a worker without a location unknown", () => {
    const text = formatFixSplit({ workers: [{ id: 1, items: ["T1"], files: [] }], reasons: [] })
    expect(text).toContain("- Files: unknown")
  })
})
