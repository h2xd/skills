import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { commentMarker, formatShare, type Marker, reviewShare, threadMarker } from "./share.ts"

const many = (green: number, yellow = 0, red = 0, white = 0): Marker[] => [
  ...Array(green).fill("🟢"),
  ...Array(yellow).fill("🟡"),
  ...Array(red).fill("🔴"),
  ...Array(white).fill("⚪"),
]

describe("commentMarker", () => {
  test("reads the status marker that opens a comment", () => {
    expect(commentMarker("🟢 Fixed in abc1234")).toBe("🟢")
    expect(commentMarker("  🔴 **issue**: wrong")).toBe("🔴")
    expect(commentMarker("⚪ nit")).toBe("⚪")
  })

  test("is null for a comment with no marker, or one that is not at the start", () => {
    expect(commentMarker("plain words")).toBe(null)
    expect(commentMarker("see 🟢 later")).toBe(null)
  })
})

describe("threadMarker", () => {
  test("takes the marker of the last comment that has one", () => {
    expect(threadMarker(["🔴 bug", "🟢 Fixed in abc"])).toBe("🟢")
    expect(threadMarker(["🟡 hmm", "thanks", "🔴 still broken"])).toBe("🔴")
  })

  test("skips a last comment with no marker", () => {
    expect(threadMarker(["🟢 done", "thanks"])).toBe("🟢")
  })

  test("counts a thread with no marker as 🟡", () => {
    expect(threadMarker(["plain", "plain"])).toBe("🟡")
  })
})

describe("reviewShare", () => {
  test("a review with no thread counts as 100% and reaches the goal", () => {
    expect(reviewShare([], 0.9)).toEqual({
      green: 0, yellow: 0, red: 0, white: 0, counted: 0, percent: 100, reached: true,
    })
  })

  test("leaves ⚪ threads out of the count", () => {
    const share = reviewShare(many(3, 0, 0, 5), 0.9)
    expect(share.counted).toBe(3)
    expect(share.white).toBe(5)
    expect(share.percent).toBe(100)
    expect(share.reached).toBe(true)
  })

  test("with fewer than 10 threads, all must be 🟢", () => {
    expect(reviewShare(many(8, 1), 0.9).reached).toBe(false)
    expect(reviewShare(many(9), 0.9).reached).toBe(true)
  })

  test("with 10 or more threads, the goal share of them must be 🟢", () => {
    expect(reviewShare(many(9, 1), 0.9).reached).toBe(true)
    expect(reviewShare(many(8, 2), 0.9).reached).toBe(false)
    expect(reviewShare(many(27, 3), 0.9).reached).toBe(true)
    expect(reviewShare(many(26, 4), 0.9).reached).toBe(false)
  })

  test("a single 🔴 thread misses the goal, even at 99%", () => {
    const share = reviewShare(many(99, 0, 1), 0.9)
    expect(share.percent).toBe(99)
    expect(share.reached).toBe(false)
  })

  test("follows the goal that the caller passes", () => {
    expect(reviewShare(many(5, 5), 0.5).reached).toBe(true)
    expect(reviewShare(many(5, 5), 0.6).reached).toBe(false)
  })

  test("rounds the percent down", () => {
    expect(reviewShare(many(2, 1), 0.9).percent).toBe(66)
  })
})

describe("formatShare", () => {
  test("prints each count, the share and whether the goal is reached", () => {
    expect(formatShare(reviewShare(many(9, 1, 0, 2), 0.9), 0.9)).toBe(
      ["threads: 12", "🟢 9", "🟡 1", "🔴 0", "⚪ 2", "share: 90%", "goal: 90%", "reached: yes"].join("\n"),
    )
  })

  test("says no when the goal is missed", () => {
    expect(formatShare(reviewShare(many(1, 0, 1), 0.9), 0.9)).toContain("reached: no")
  })
})
