import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { progressBar, timeline, weekGraph } from "./drawings.ts"

describe("progressBar", () => {
  test("fills the share of the bar and prints the count and the percent", () => {
    expect(progressBar("Loop", 5, 10)).toBe("Loop [##########----------] 5/10 50%")
  })

  test("shows an empty and a full bar", () => {
    expect(progressBar("Criteria", 0, 4)).toBe("Criteria [--------------------] 0/4 0%")
    expect(progressBar("Criteria", 4, 4)).toBe("Criteria [####################] 4/4 100%")
  })

  test("rounds the percent down, so a bar never claims more than it holds", () => {
    expect(progressBar("x", 2, 3)).toBe("x [#############-------] 2/3 66%")
  })

  test("refuses a total below 1, a count above the total and a count below 0", () => {
    expect(() => progressBar("x", 0, 0)).toThrow("total")
    expect(() => progressBar("x", 5, 4)).toThrow("done")
    expect(() => progressBar("x", -1, 4)).toThrow("done")
  })

  test("refuses a count that is not a number or not whole", () => {
    expect(() => progressBar("x", Number.NaN, 3)).toThrow("done")
    expect(() => progressBar("x", 1.5, 3)).toThrow("done")
  })

  test("uses only ASCII characters", () => {
    expect(/^[\x20-\x7e]+$/.test(progressBar("Loop", 3, 7))).toBe(true)
  })
})

describe("weekGraph", () => {
  test("draws one bar per week, scaled to the busiest week", () => {
    const graph = weekGraph([
      { week: "2026-11-16", count: 8 },
      { week: "2026-11-23", count: 2 },
    ])
    expect(graph).toBe(
      ["2026-11-16 | #################### 8", "2026-11-23 | ##### 2"].join("\n"),
    )
  })

  test("gives a week with commits at least one mark, and a week with none no mark", () => {
    const graph = weekGraph([
      { week: "2026-11-02", count: 1 },
      { week: "2026-11-09", count: 0 },
      { week: "2026-11-16", count: 100 },
    ])
    expect(graph.split("\n")[0]).toBe("2026-11-02 | # 1")
    expect(graph.split("\n")[1]).toBe("2026-11-09 |  0")
  })

  test("prints nothing for no weeks", () => {
    expect(weekGraph([])).toBe("")
  })
})

describe("timeline", () => {
  test("lists the commits oldest first on one spine", () => {
    const text = timeline([
      { hash: "bbbbbbb", date: "2026-11-22", subject: "fix: second" },
      { hash: "aaaaaaa", date: "2026-11-20", subject: "feat: first" },
    ])
    expect(text).toBe(
      [
        "o 2026-11-20 aaaaaaa feat: first",
        "|",
        "o 2026-11-22 bbbbbbb fix: second",
      ].join("\n"),
    )
  })

  test("keeps the commits of one day in the order they were made", () => {
    const text = timeline([
      { hash: "bbbbbbb", date: "2026-11-25", subject: "fix: newer" },
      { hash: "aaaaaaa", date: "2026-11-25", subject: "feat: older" },
    ])
    expect(text).toBe(
      [
        "o 2026-11-25 aaaaaaa feat: older",
        "|",
        "o 2026-11-25 bbbbbbb fix: newer",
      ].join("\n"),
    )
  })

  test("prints nothing for no commits", () => {
    expect(timeline([])).toBe("")
  })
})
