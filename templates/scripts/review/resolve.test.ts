import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { resolveThreads, threadNodeIds } from "./resolve.ts"

const THREADS = "## T1\n- Thread id: PRRT_a\n\n## T2\n- Thread id: PRRT_b\n\n## T3\n- Thread id: PRRT_c\n"

describe("threadNodeIds", () => {
  test("maps T labels to node ids and passes node ids through", () => {
    expect(threadNodeIds(["T1", "PRRT_x", "T3"], THREADS)).toEqual([
      "PRRT_a",
      "PRRT_x",
      "PRRT_c",
    ])
  })

  test("refuses a T label that threads.md does not hold", () => {
    expect(() => threadNodeIds(["T9"], THREADS)).toThrow("T9")
  })
})

describe("resolveThreads", () => {
  test("one call resolves T labels through threads.md", () => {
    const resolved: string[] = []
    const outcome = resolveThreads(
      threadNodeIds(["T1", "T3"], THREADS),
      (id) => resolved.push(id),
    )
    expect(resolved).toEqual(["PRRT_a", "PRRT_c"])
    expect(outcome.failed).toBe(false)
  })

  test("reports resolved threads", () => {
    const resolved: string[] = []
    const outcome = resolveThreads(["a", "b"], (id) => resolved.push(id))
    expect(resolved).toEqual(["a", "b"])
    expect(outcome).toEqual({
      lines: ["a resolved", "b resolved"],
      failed: false,
    })
  })

  test("reports an error and carries on with the rest", () => {
    const outcome = resolveThreads(["a", "b"], (id) => {
      if (id === "a") throw new Error("Could not resolve")
    })
    expect(outcome).toEqual({
      lines: ["a error: Could not resolve", "b resolved"],
      failed: true,
    })
  })
})
