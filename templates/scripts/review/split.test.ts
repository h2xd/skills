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
      "| id | bucket | where | change | group |",
      "|---|---|---|---|---|",
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
      "| id | bucket | where | change | group |",
      "|---|---|---|---|---|",
      "| T1 | fix | src/x.ts:1 | x | src/a.ts |",
      "| T2 | fix | src/a.ts:2 | x |",
      ...[3, 4, 5, 6].map((n) => `| T${n} | fix | src/f${n}.ts:1 | x |`),
    ].join("\n")
    const workers = planFixSplit(parseFixItems(plan, threadsFor(6)), { fixMaxWorkers: 2 }).workers

    expect(workers.map((worker) => worker.items.includes("T1") === worker.items.includes("T2"))).toEqual([false, false])
  })
})

describe("planFixSplit with a group and a file in common", () => {
  test("a row with a group and a row with none on one file go to one fixer", () => {
    const plan = [
      "| id | bucket | where | change | group |",
      "|---|---|---|---|---|",
      "| T1 | fix | src/a.ts:1 | x | topic |",
      "| T2 | fix | src/a.ts:2 | x |  |",
      ...[3, 4, 5, 6, 7].map((n) => `| T${n} | fix | src/f${n}.ts:1 | x |  |`),
    ].join("\n")
    const split = planFixSplit(parseFixItems(plan, threadsFor(7)), { fixMaxWorkers: 4 })
    const holders = split.workers.filter((worker) => worker.files.includes("src/a.ts"))

    expect(holders.length).toBe(1)
    expect(holders[0].items.includes("T1") && holders[0].items.includes("T2")).toBe(true)
  })

  test("two groups that share a file go to one fixer", () => {
    const rows: [string, string][] = [
      ["src/a.ts", "one"], ["src/b.ts", "one"], ["src/a.ts", "two"], ["src/c.ts", "two"],
      ["src/d.ts", "three"], ["src/e.ts", "three"], ["src/f.ts", "four"], ["src/g.ts", "four"],
    ]
    const workers = groupedWorkers(rows, { fixMaxWorkers: 4 })

    const holder = workers.filter((items) => items.includes("T1"))
    expect(holder.length).toBe(1)
    expect(["T1", "T2", "T3", "T4"].every((id) => holder[0].includes(id))).toBe(true)
  })
})

describe("planFixSplit with a row that bridges two units", () => {
  test("a row that names the group of one unit and the file of another joins all three", () => {
    const rows: [string, string][] = [
      ["src/a.ts", "one"], ["src/b.ts", "two"], ["src/a.ts", "two"],
      ["src/d.ts", "x4"], ["src/e.ts", "x5"], ["src/f.ts", "x6"], ["src/g.ts", "x7"], ["src/h.ts", "x8"],
    ]
    const workers = groupedWorkers(rows, { fixMaxWorkers: 4 })

    const holders = workers.filter((items) => items.some((id) => ["T1", "T2", "T3"].includes(id)))
    expect(holders.length).toBe(1)
    expect(["T1", "T2", "T3"].every((id) => holders[0].includes(id))).toBe(true)
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

  test("keeps the lines below the table in every plan", () => {
    const noted = `${plan}\n\nNotes: T1 must keep the public API of src/a.ts.\n`
    const split = planFixSplit(parseFixItems(noted, threadsFor(7)), { fixMaxWorkers: 2 })

    for (const file of fixerPlans(noted, split)) {
      expect(file.text.endsWith("\n\nNotes: T1 must keep the public API of src/a.ts.\n")).toBe(true)
    }
  })

  test("keeps the lines below the table in the order of the plan", () => {
    const noted = `${plan}\nfirst note\n\nsecond note`
    const split = planFixSplit(parseFixItems(noted, threadsFor(7)), { fixMaxWorkers: 2 })

    expect(fixerPlans(noted, split)[1].text.endsWith("| T7 | fix | src/g.ts:7 | seventh | two |\nfirst note\n\nsecond note\n")).toBe(true)
  })

  test("leaves out a row of a later table that holds the id of a row of its fixer", () => {
    const later = `${plan}\n\n| id | answer |\n|---|---|\n| T1 | keep the API |\n`
    const split = planFixSplit(parseFixItems(later, threadsFor(7)), { fixMaxWorkers: 2 })

    expect(fixerPlans(later, split)[0].text).not.toContain("keep the API")
  })

  test("leaves out the later table as a whole, header and separator too", () => {
    const later = `${plan}\n\n| id | answer |\n|---|---|\n| T1 | keep the API |\n\nend\n`
    const split = planFixSplit(parseFixItems(later, threadsFor(7)), { fixMaxWorkers: 2 })

    expect(fixerPlans(later, split)[0].text).not.toContain("| answer |")
    expect(fixerPlans(later, split)[0].text.endsWith("\n\n\nend\n")).toBe(true)
  })

  test("gives each fixer only its rows when the plan has no table header", () => {
    const rows = Array.from({ length: 6 }, (_, i) => `| T${i + 1} | fix | src/f${i}.ts:1 | x |`)
    const bare = rows.join("\n")
    const split = planFixSplit(parseFixItems(bare, threadsFor(6)), { fixMaxWorkers: 2 })

    expect(split.workers.length).toBe(2)
    expect(fixerPlans(bare, split).map((file) => file.text)).toEqual(
      split.workers.map((worker) => `${worker.items.map((id) => rows[Number(id.slice(1)) - 1]).join("\n")}\n`),
    )
  })

  test("writes a plan with no table header when the plan has none", () => {
    const bare = "| T1 | fix | src/a.ts:1 | x |"
    const split = planFixSplit(parseFixItems(bare, threadsFor(1)), SETTINGS)

    expect(fixerPlans(bare, split)[0].text).toBe("| T1 | fix | src/a.ts:1 | x |\n")
  })
})

describe("parseFixItems with a table header", () => {
  const header = ["| id | bucket | where | change |", "|---|---|---|---|"]

  test("reads the group of a header written in bold or in backticks", () => {
    for (const cell of ["**Group**", "`Group`", "**`Group`**"]) {
      const plan = [
        `| Id | Bucket | Where | Change | ${cell} |`,
        "|---|---|---|---|---|",
        "| T1 | fix | src/a.ts:1 | x | topic |",
      ].join("\n")

      expect(parseFixItems(plan, threadsFor(1))).toEqual([
        { id: "T1", file: "src/a.ts", group: "topic" },
      ])
    }
  })

  test("reads a group in bold and the same group without asterisks as one group", () => {
    const plan = [
      "| id | bucket | where | change | group |",
      "|---|---|---|---|---|",
      "| T1 | fix | src/a.ts:1 | x | **Cat** |",
      "| T2 | fix | src/b.ts:1 | x | cat |",
      "| T3 | fix | src/c.ts:1 | x | **`CAT`** |",
    ].join("\n")

    expect(parseFixItems(plan, threadsFor(3)).map((item) => item.group)).toEqual(["cat", "cat", "cat"])
  })

  test("a group column at the fourth cell does not reach a headerless table below a text line", () => {
    const plan = [
      "| Id | Bucket | Location | Group |",
      "|---|---|---|---|",
      "| T1 | fix | a.ts:1 | alpha |",
      "",
      "text",
      "",
      "| T2 | fix | b.ts:2 | shared reason |",
    ].join("\n")

    expect(parseFixItems(plan, threadsFor(2))).toEqual([
      { id: "T1", file: "a.ts", group: "alpha" },
      { id: "T2", file: "b.ts" },
    ])
  })

  test("a group column at the fourth cell does not reach a headerless table below a blank line", () => {
    const plan = [
      "| Id | Bucket | Location | Group |",
      "|---|---|---|---|",
      "| T1 | fix | a.ts:1 | alpha |",
      "",
      "| T2 | fix | b.ts:2 | shared reason |",
    ].join("\n")

    expect(parseFixItems(plan, threadsFor(2)).map((item) => item.group)).toEqual(["alpha", undefined])
  })

  test("reads a logical or in backticks as text and keeps the group after it", () => {
    const plan = [
      "| id | bucket | where | change | group |",
      "|---|---|---|---|---|",
      "| T1 | fix | src/a.ts:1 | `a || b` to `a && b` | topic |",
    ].join("\n")

    expect(parseFixItems(plan, threadsFor(1))).toEqual([
      { id: "T1", file: "src/a.ts", group: "topic" },
    ])
  })

  test("reads a union type in backticks as text in a table with no header", () => {
    const plan = "| T1 | fix | src/a.ts:1 | make it `string | null` |"

    expect(parseFixItems(plan, threadsFor(1))).toEqual([{ id: "T1", file: "src/a.ts" }])
  })

  test("reads a pipe in each of two code spans of one cell as text", () => {
    const plan = [
      "| id | bucket | where | change | group |",
      "|---|---|---|---|---|",
      "| T1 | fix | src/a.ts:1 | `a | b` then `c | d` | topic |",
    ].join("\n")

    expect(parseFixItems(plan, threadsFor(1))[0].group).toBe("topic")
  })

  test("keeps the pipe of a code span in the text of a group cell", () => {
    const plan = [
      "| id | bucket | where | change | group |",
      "|---|---|---|---|---|",
      "| T1 | fix | src/a.ts:1 | x | `a | b` |",
    ].join("\n")

    expect(parseFixItems(plan, threadsFor(1))[0].group).toBe("a | b")
  })

  test("a code span with a pipe in one cell leaves the cells after it apart", () => {
    const plan = [
      "| id | bucket | where | change | group |",
      "|---|---|---|---|---|",
      "| T1 | fix | src/a.ts:1 | `a | b` | one |",
      "| T2 | fix | src/b.ts:1 | `c` | two |",
    ].join("\n")

    expect(parseFixItems(plan, threadsFor(2)).map((item) => item.group)).toEqual(["one", "two"])
  })

  test("an odd backtick in a cell with no closing one keeps the split of the pipes", () => {
    const plan = [
      "| id | bucket | where | change | group |",
      "|---|---|---|---|---|",
      "| T1 | fix | src/a.ts:1 | a ` b | topic |",
    ].join("\n")

    expect(parseFixItems(plan, threadsFor(1))[0].group).toBe("topic")
  })

  test("an odd backtick with no closing one does not hide a pipe that is too many", () => {
    const plan = [
      "| id | bucket | where | change | group |",
      "|---|---|---|---|---|",
      "| T1 | fix | src/a.ts:1 | a ` b | c | topic |",
    ].join("\n")

    expect(() => parseFixItems(plan, threadsFor(1))).toThrow("T1 has 6 cells, the header has 5")
  })

  test("a change text with an escaped pipe gives no group", () => {
    const plan = [
      ...header.map((line) => line.replace(/\|$/, "| group |")),
      "| T1 | fix | src/d.ts:1 | use `a \\| b` here |",
    ].join("\n")

    expect(parseFixItems(plan, threadsFor(1))).toEqual([{ id: "T1", file: "src/d.ts" }])
  })

  test("a fifth column with another header gives no group", () => {
    const plan = [
      "| id | bucket | where | change | Choice |",
      "|---|---|---|---|---|",
      "| T1 | fix | src/a.ts:1 | x | B |",
    ].join("\n")

    expect(parseFixItems(plan, threadsFor(1))).toEqual([{ id: "T1", file: "src/a.ts" }])
  })

  test("rows with the same Choice letter on different files stay apart", () => {
    const plan = [
      "| id | bucket | where | change | Choice |",
      "|---|---|---|---|---|",
      ...Array.from({ length: 7 }, (_, i) => `| T${i + 1} | fix | src/f${i}.ts:1 | x | B |`),
    ].join("\n")
    const split = planFixSplit(parseFixItems(plan, threadsFor(7)), { fixMaxWorkers: 4 })

    expect(split.workers.length).toBe(2)
  })

  test("reads the group from the column that the header names Group", () => {
    const plan = [
      "| Id | Bucket | Where | Group | Change |",
      "|---|---|---|---|---|",
      "| T1 | fix | src/a.ts:1 | topic | x |",
    ].join("\n")

    expect(parseFixItems(plan, threadsFor(1))).toEqual([
      { id: "T1", file: "src/a.ts", group: "topic" },
    ])
  })

  test("reads a pipe after a backslash inside a group column as part of the cell", () => {
    const plan = [
      "| id | bucket | where | change | group |",
      "|---|---|---|---|---|",
      "| T1 | fix | src/a.ts:1 | a \\| b | topic |",
    ].join("\n")

    expect(parseFixItems(plan, threadsFor(1))).toEqual([
      { id: "T1", file: "src/a.ts", group: "topic" },
    ])
  })
})

describe("parseFixItems", () => {
  test("reads a group from the fifth cell and treats an empty cell or - as none", () => {
    const plan = [
      "| id | bucket | where | change | group |",
      "|---|---|---|---|---|",
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

  test("reads a group under a separator row with alignment colons", () => {
    const plan = [
      "| id | bucket | where | change | group |",
      "|:---|:---:|---:|---|:---|",
      "| T1 | fix | src/a.ts:1 | x | one |",
    ].join("\n")

    expect(parseFixItems(plan, threadsFor(1))).toEqual([{ id: "T1", file: "src/a.ts", group: "one" }])
  })

  test("a stray row inside the table keeps the group column for the rows after it", () => {
    const plan = [
      "| ID | Bucket | Location | Change | Group |",
      "|---|---|---|---|---|",
      "| T1 | fix | a.ts:1 | x | cat |",
      "| T2 | fix | b.ts:1 | y | |",
      "|  |  |  | and also z | |",
      "| **T9** | fix | d.ts:1 | note | |",
      "| T3 | fix | c.ts:1 | z | cat |",
    ].join("\n")

    expect(parseFixItems(plan, threadsFor(3))).toEqual([
      { id: "T1", file: "a.ts", group: "cat" },
      { id: "T2", file: "b.ts" },
      { id: "T3", file: "c.ts", group: "cat" },
    ])
  })

  test("a second table with its own header does not inherit the group column", () => {
    const plan = [
      "| id | bucket | where | change | group |",
      "|---|---|---|---|---|",
      "| T1 | fix | src/a.ts:1 | x | one |",
      "",
      "| id | bucket | where | change | note |",
      "|---|---|---|---|---|",
      "| T2 | fix | src/b.ts:1 | x | one |",
      "| T3 | fix | src/c.ts:1 | x | one |",
    ].join("\n")

    expect(parseFixItems(plan, threadsFor(3))).toEqual([
      { id: "T1", file: "src/a.ts", group: "one" },
      { id: "T2", file: "src/b.ts" },
      { id: "T3", file: "src/c.ts" },
    ])
  })

  test("a header row right under a table replaces its group column", () => {
    const plan = [
      "| id | bucket | where | change | group |",
      "|---|---|---|---|---|",
      "| T1 | fix | src/a.ts:1 | x | one |",
      "| id | bucket | where | change | note |",
      "|---|---|---|---|---|",
      "| T2 | fix | src/b.ts:1 | x | one |",
      "| T3 | fix | src/c.ts:1 | x | one |",
    ].join("\n")

    expect(parseFixItems(plan, threadsFor(3)).map((item) => item.group)).toEqual(["one", undefined, undefined])
  })

  test("a second table with a Group header after a table without one reads its groups", () => {
    const plan = [
      "| id | bucket | where | change |",
      "|---|---|---|---|",
      "| T1 | fix | src/a.ts:1 | x |",
      "",
      "| id | bucket | where | change | group |",
      "|---|---|---|---|---|",
      "| T2 | fix | src/b.ts:1 | x | one |",
    ].join("\n")

    expect(parseFixItems(plan, threadsFor(2))).toEqual([
      { id: "T1", file: "src/a.ts" },
      { id: "T2", file: "src/b.ts", group: "one" },
    ])
  })

  test("fails on a fix row with more cells than its header and names the row", () => {
    const plan = [
      "| id | bucket | where | change | group |",
      "|---|---|---|---|---|",
      "| T1 | fix | src/a.ts:1 | x | topic |",
      "| T2 | fix | src/b.ts:1 | a || b | topic |",
    ].join("\n")

    expect(() => parseFixItems(plan, threadsFor(2))).toThrow(
      "T2 has 7 cells, the header has 5: write a pipe inside a cell as \\|",
    )
  })

  test("fails on a fifth cell with text when the table has no header", () => {
    const plan = "| T1 | fix | src/a.ts:1 | x | topic |"

    expect(() => parseFixItems(plan, threadsFor(1))).toThrow(
      "T1 has a fifth cell and the table has no header: add a header row with a Group column",
    )
  })

  test("fails on a fifth cell in a table without a header after a table with one", () => {
    const plan = [
      "| id | bucket | where | change | group |",
      "|---|---|---|---|---|",
      "| T1 | fix | src/a.ts:1 | x | topic |",
      "",
      "| T2 | fix | src/b.ts:1 | x | topic |",
    ].join("\n")

    expect(() => parseFixItems(plan, threadsFor(2))).toThrow("T2 has a fifth cell")
  })

  test("reads a group in backticks and the same group without them as one group", () => {
    const plan = [
      "| id | bucket | where | change | group |",
      "|---|---|---|---|---|",
      "| T1 | fix | src/a.ts:1 | x | `Cat` |",
      "| T2 | fix | src/b.ts:1 | x | cat |",
      "| T3 | fix | src/c.ts:1 | x | CAT |",
    ].join("\n")

    expect(parseFixItems(plan, threadsFor(3)).map((item) => item.group)).toEqual(["cat", "cat", "cat"])
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
