import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import {
  branchTicket,
  commitsPerWeek,
  newestHandoff,
  parseLog,
  topLevelCounts,
  weekStart,
} from "./facts.ts"

describe("weekStart", () => {
  test("is the Monday of the week", () => {
    expect(weekStart("2026-11-25")).toBe("2026-11-23")
    expect(weekStart("2026-11-23")).toBe("2026-11-23")
    expect(weekStart("2026-11-29")).toBe("2026-11-23")
  })

  test("crosses a month and a year", () => {
    expect(weekStart("2026-01-01")).toBe("2025-12-29")
  })
})

describe("commitsPerWeek", () => {
  test("counts the commits of each week and fills the weeks with none", () => {
    expect(commitsPerWeek(["2026-11-02", "2026-11-04", "2026-11-18"])).toEqual([
      { week: "2026-11-02", count: 2 },
      { week: "2026-11-09", count: 0 },
      { week: "2026-11-16", count: 1 },
    ])
  })

  test("gives no weeks for no commits", () => {
    expect(commitsPerWeek([])).toEqual([])
  })
})

describe("parseLog", () => {
  test("reads one commit per line, tab separated", () => {
    const text = "aaaaaaa\t2026-11-20\tAda\tada@example.com\tfeat: a\tb\n"
    expect(parseLog(text)).toEqual([
      {
        hash: "aaaaaaa",
        date: "2026-11-20",
        author: "Ada",
        email: "ada@example.com",
        subject: "feat: a\tb",
      },
    ])
  })

  test("reads an empty log as no commits", () => {
    expect(parseLog("")).toEqual([])
  })
})

describe("branchTicket", () => {
  test("reads the number after the type", () => {
    expect(branchTicket("feat/116-technology-skills")).toBe("116")
    expect(branchTicket("fix/7-x")).toBe("7")
  })

  test("is null for a branch with no ticket number", () => {
    expect(branchTicket("main")).toBe(null)
    expect(branchTicket("feat/add-2fa")).toBe(null)
  })
})

describe("topLevelCounts", () => {
  test("counts tracked files per top-level folder, root files together", () => {
    expect(topLevelCounts(["a/x", "a/y/z", "b/q", "README.md", "LICENSE"])).toEqual([
      { name: "a/", files: 2 },
      { name: "b/", files: 1 },
      { name: "(root)", files: 2 },
    ])
  })
})

describe("newestHandoff", () => {
  test("picks the handoff of this repo with the newest stamp", () => {
    const names = [
      "handoff-skills-20261120-0900.md",
      "handoff-skills-20261124-1530.md",
      "handoff-other-20261125-1000.md",
      "notes.md",
    ]
    expect(newestHandoff(names, "skills")).toBe("handoff-skills-20261124-1530.md")
  })

  test("is null when the repo has no handoff", () => {
    expect(newestHandoff(["handoff-other-20261125-1000.md"], "skills")).toBe(null)
  })

  test("does not take a repo whose name only starts the same", () => {
    expect(newestHandoff(["handoff-skills-extra-20261125-1000.md"], "skills")).toBe(null)
  })
})
