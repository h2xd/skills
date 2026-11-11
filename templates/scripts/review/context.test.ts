import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { type ContextData, filesByRecord, formatContext } from "./context.ts"

const DATA: ContextData = {
  pullRequest: {
    number: 7,
    title: "Add biscuit",
    body: "Closes #3",
    url: "https://github.com/o/r/pull/7",
    author: { login: "author" },
    baseRefName: "main",
    headRefName: "feat/biscuit",
    headRefOid: "abc",
    closingIssuesReferences: [{ number: 3 }],
  },
  repository: "o/r",
  login: "me",
  worktree: "/work/snack-drawer.feat-biscuit",
  localHead: "abc",
  currentBranch: "feat/biscuit",
  status: "",
  diffStat: " a.ts | 2 +-\n 1 file changed",
  changedFiles: ["a.ts", "b.ts"],
  issues: [{ number: 3, title: "Biscuit", body: "Make a biscuit." }],
  recordsByFile: new Map([
    ["a.ts", ["docs/decisions/0001.md  [Decision, accepted]  One"]],
    ["b.ts", ["docs/decisions/0001.md  [Decision, accepted]  One"]],
  ]),
  threads: [
    {
      id: "PRRT_1",
      isResolved: true,
      isOutdated: false,
      diffSide: "RIGHT",
      path: "a.ts",
      line: 4,
      startLine: null,
      originalLine: 4,
      comments: {
        nodes: [
          {
            author: { login: "reviewer" },
            body: "line one\nline two",
            url: "u",
            createdAt: "2026-09-29T10:00:00Z",
          },
        ],
      },
    },
  ],
}

describe("filesByRecord", () => {
  test("lists each record once with every file that links to it", () => {
    const byRecord = filesByRecord(DATA.recordsByFile)
    expect([...byRecord]).toEqual([
      ["docs/decisions/0001.md  [Decision, accepted]  One", ["a.ts", "b.ts"]],
    ])
  })
})

describe("formatContext", () => {
  test("covers every field the review-pr skill needs", () => {
    const output = formatContext(DATA, "")
    expect(output).toContain("- PR: #7 Add biscuit")
    expect(output).toContain("- Repository: o/r")
    expect(output).toContain("- gh login: me")
    expect(output).toContain("- Local HEAD: abc (equals the pushed head)")
    expect(output).toContain("- Working tree: clean")
    expect(output).toContain("### #3 Biscuit\n\nMake a biscuit.")
    expect(output).toContain("- a.ts\n- b.ts")
    expect(output).toContain("  - linked from: a.ts, b.ts")
    expect(output).toContain("- a.ts:4 (resolved, current, reviewer)")
    expect(output).toContain("  > line one\n  > line two")
  })

  test("puts the warnings section before the overview", () => {
    const output = formatContext(DATA, "## Warnings\n\n- Dirty tree.\n\n")
    expect(output.indexOf("## Warnings")).toBeLessThan(
      output.indexOf("## Overview"),
    )
  })

  test("writes None. for empty sections", () => {
    const output = formatContext(
      { ...DATA, issues: [], threads: [], recordsByFile: new Map() },
      "",
    )
    expect(output).toContain("## Linked issues\n\nNone.")
    expect(output).toContain("## Decision records\n\nNone.")
    expect(output).toContain("## Existing review threads\n\nNone.")
  })
})
