import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { formatShare, type Marker, reviewShare, threadMarker } from "./share.ts"

const many = (green: number, yellow = 0, red = 0, white = 0): Marker[] => [
  ...Array(green).fill("🟢"),
  ...Array(yellow).fill("🟡"),
  ...Array(red).fill("🔴"),
  ...Array(white).fill("⚪"),
]

const thread = (isResolved: boolean, ...bodies: string[]) => ({
  isResolved,
  comments: { nodes: bodies.map((body) => ({ body })) },
})

describe("threadMarker", () => {
  test("a resolved thread is 🟢, whatever its comments say", () => {
    expect(threadMarker(thread(true, "issue (blocking): bug", "Fixed in abc1234: guard added."))).toBe("🟢")
    expect(threadMarker(thread(true, "suggestion (non-blocking): rename"))).toBe("🟢")
  })

  test("an open thread whose first comment is blocking is 🔴", () => {
    expect(threadMarker(thread(false, "issue (blocking): bug in x", "Not changed: by design."))).toBe("🔴")
    expect(threadMarker(thread(false, "  question (blocking): why?"))).toBe("🔴")
  })

  test("an open thread whose first comment is non-blocking is 🟡", () => {
    expect(threadMarker(thread(false, "suggestion (non-blocking): rename"))).toBe("🟡")
  })

  test("an open thread whose first comment is praise or a note is 🟢", () => {
    expect(threadMarker(thread(false, "praise: nice"))).toBe("🟢")
    expect(threadMarker(thread(false, "note: for the record"))).toBe("🟢")
  })

  test("praise later in the first comment does not make it 🟢", () => {
    expect(threadMarker(thread(false, "suggestion (non-blocking): x\n\npraise: y"))).toBe("🟡")
  })

  test("a (blocking) label on a later line of the first comment is not blocking", () => {
    expect(threadMarker(thread(false, "suggestion: x\n\nsee issue (blocking): y"))).toBe("🟡")
  })

  test("white space before the first comment does not hide its label", () => {
    expect(threadMarker(thread(false, "\nissue (blocking): y"))).toBe("🔴")
    expect(threadMarker(thread(false, " ⚪ nit"))).toBe("⚪")
  })

  test("an open thread whose first comment starts with ⚪ is not counted", () => {
    expect(threadMarker(thread(false, "⚪ nitpick (non-blocking): spacing"))).toBe("⚪")
  })

  test("reads the label of the first comment, not a later reply", () => {
    expect(threadMarker(thread(false, "suggestion (non-blocking): rename", "issue (blocking): worse"))).toBe("🟡")
  })

  test("a (blocking) later in the first comment does not make it blocking", () => {
    expect(threadMarker(thread(false, "suggestion (non-blocking): a (blocking): mention"))).toBe("🟡")
  })

  test("a thread with no comment is 🟡", () => {
    expect(threadMarker(thread(false))).toBe("🟡")
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

  test("rounds the goal to the nearest percent, so 0.57 is 57%", () => {
    expect(reviewShare(many(56, 44), 0.57).reached).toBe(false)
    expect(reviewShare(many(57, 43), 0.57).reached).toBe(true)
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
