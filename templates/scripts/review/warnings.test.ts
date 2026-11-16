import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { collectWarnings, formatWarnings } from "./warnings.ts"

const CLEAN = {
  headRefName: "feature",
  headRefOid: "abc",
  localHead: "abc",
  status: "",
  currentBranch: "feature",
}

describe("collectWarnings", () => {
  test("is empty when everything matches", () => {
    expect(collectWarnings(CLEAN)).toEqual([])
  })

  test("reports head mismatch, dirty tree and wrong branch", () => {
    const warnings = collectWarnings({
      ...CLEAN,
      localHead: "def",
      status: " M file.ts",
      currentBranch: "other",
    })
    expect(warnings).toHaveLength(3)
    expect(warnings[0]).toContain("Head mismatch")
    expect(warnings[1]).toContain("Dirty tree")
    expect(warnings[2]).toContain("Wrong branch")
  })

  test("skips the branch check when no current branch is given", () => {
    expect(collectWarnings({ ...CLEAN, currentBranch: undefined })).toEqual([])
  })

  test("warns with the count when the base has commits the head lacks", () => {
    const warnings = collectWarnings({ ...CLEAN, behindBase: 3 })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain("Head behind base: the base has 3 commit(s)")
  })

  test("stays quiet when no base commit is missing, whatever GitHub says", () => {
    expect(collectWarnings({ ...CLEAN, behindBase: 0 })).toEqual([])
    expect(collectWarnings({ ...CLEAN, mergeStateStatus: "BEHIND" })).toEqual([])
  })

  test("reports a conflict and a missing base commit together", () => {
    const warnings = collectWarnings({ ...CLEAN, mergeable: "CONFLICTING", behindBase: 1 })
    expect(warnings).toHaveLength(2)
  })

  test("warns when the PR conflicts with the base", () => {
    for (const state of [
      { mergeable: "CONFLICTING", mergeStateStatus: "DIRTY" },
      { mergeable: "CONFLICTING" },
      { mergeStateStatus: "DIRTY" },
    ]) {
      const warnings = collectWarnings({ ...CLEAN, ...state })
      expect(warnings).toHaveLength(1)
      expect(warnings[0]).toContain("Conflicting")
    }
  })

  test("stays quiet for a clean, blocked or unknown merge state", () => {
    for (const mergeStateStatus of ["CLEAN", "BLOCKED", "UNKNOWN", "UNSTABLE"]) {
      expect(collectWarnings({ ...CLEAN, mergeable: "MERGEABLE", mergeStateStatus })).toEqual([])
    }
  })
})

describe("formatWarnings", () => {
  test("prints nothing without warnings", () => {
    expect(formatWarnings([])).toBe("")
  })

  test("prints a section with one bullet per warning", () => {
    expect(formatWarnings(["a", "b"])).toBe("## Warnings\n\n- a\n- b\n\n")
  })
})
