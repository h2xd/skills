import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { run } from "./shell.ts"

const TWO_MIB = ["node", "-e", "process.stdout.write('x'.repeat(2 * 1024 * 1024))"]

describe("run", () => {
  test("fails on output above the default buffer", () => {
    expect(() => run(TWO_MIB)).toThrow()
  })

  test("reads output above the default buffer with a larger maxBuffer", () => {
    expect(run(TWO_MIB, undefined, 8 * 1024 * 1024)).toHaveLength(2 * 1024 * 1024)
  })
})
