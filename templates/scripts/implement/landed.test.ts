import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { unlandedCommits } from "./landed.ts"

describe("unlandedCommits", () => {
  test("names the commits that git cherry marks with a plus", () => {
    expect(unlandedCommits("- 1111111\n+ 2222222\n+ 3333333\n")).toEqual([
      "2222222",
      "3333333",
    ])
  })

  test("is empty when every commit landed or there is none", () => {
    expect(unlandedCommits("- 1111111\n- 2222222\n")).toEqual([])
    expect(unlandedCommits("")).toEqual([])
  })
})
