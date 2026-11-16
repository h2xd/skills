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

  test("warns when the head is behind the base", () => {
    const warnings = collectWarnings({
      ...CLEAN,
      mergeable: "MERGEABLE",
      mergeStateStatus: "BEHIND",
    })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain("Head behind base")
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
