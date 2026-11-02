import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { resolveThreads } from "./resolve.ts"

describe("resolveThreads", () => {
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
