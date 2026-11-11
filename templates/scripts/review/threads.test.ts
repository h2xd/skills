import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import {
  formatThreadsDocument,
  outsideDiffItems,
  type Review,
  type ReviewThread,
  summaryItems,
  threadLocation,
} from "./threads.ts"
import { type FindingsFile, mergeFindings } from "./findings.ts"

function thread(overrides: Partial<ReviewThread> = {}): ReviewThread {
  return {
    id: "PRRT_1",
    isResolved: false,
    isOutdated: false,
    path: "src/a.ts",
    line: 12,
    startLine: null,
    originalLine: null,
    comments: {
      nodes: [
        {
          author: { login: "reviewer" },
          body: "suggestion (non-blocking): rename\n\n```suggestion\nconst x = 1\n```",
          url: "https://github.com/o/r/pull/1#discussion_r1",
          createdAt: "2026-09-29T10:00:00Z",
        },
      ],
    },
    ...overrides,
  }
}

const HEADER = {
  number: 1,
  url: "https://github.com/o/r/pull/1",
  headRefName: "feature",
  headRefOid: "abc123",
  baseRefName: "main",
  owner: "o",
  name: "r",
}

describe("threadLocation", () => {
  test("uses path:line, a range for multi-line comments, and the path alone without a line", () => {
    expect(threadLocation(thread())).toBe("src/a.ts:12")
    expect(threadLocation(thread({ startLine: 10 }))).toBe("src/a.ts:10-12")
    expect(threadLocation(thread({ line: null }))).toBe("src/a.ts")
  })

  test("falls back to the original line of an outdated thread", () => {
    expect(threadLocation(thread({ line: null, originalLine: 23 }))).toBe(
      "src/a.ts:23 (original)",
    )
  })
})

describe("outsideDiffItems", () => {
  test("collects bullets under the heading and stops at the next heading", () => {
    const body = [
      "Verdict: changes requested.",
      "",
      "### Outside the diff",
      "",
      "- `a.ts:3` first finding",
      "  continued here",
      "- `b.ts:9` second finding",
      "",
      "### Other",
      "- not an item",
    ].join("\n")
    expect(outsideDiffItems(body)).toEqual([
      "`a.ts:3` first finding\ncontinued here",
      "`b.ts:9` second finding",
    ])
  })

  test("returns nothing when the section says None", () => {
    expect(outsideDiffItems("## Outside the diff\n\nNone\n")).toEqual([])
    expect(outsideDiffItems("## Outside the diff\n\n- None.\n")).toEqual([])
  })

  test("returns nothing without the heading", () => {
    expect(outsideDiffItems("- a bullet elsewhere")).toEqual([])
  })

  test("accepts a bold heading and stops before Co-Authored-By", () => {
    const body = "**Outside the diff**\n- one\nCo-Authored-By: X <a@b.c>\n- two"
    expect(outsideDiffItems(body)).toEqual(["one"])
  })
})

describe("summaryItems", () => {
  test("skips empty review bodies and attributes items to their review", () => {
    const reviews: Review[] = [
      {
        author: { login: "bot" },
        state: "COMMENTED",
        body: "",
        url: "u0",
        submittedAt: null,
      },
      {
        author: null,
        state: "COMMENTED",
        body: "## Outside the diff\n- item",
        url: "u1",
        submittedAt: null,
      },
    ]
    expect(summaryItems(reviews)).toEqual([
      { reviewUrl: "u1", author: "ghost", text: "item" },
    ])
  })
})

describe("formatThreadsDocument", () => {
  test("numbers unresolved threads, keeps suggestion blocks and lists summary items", () => {
    const output = formatThreadsDocument({
      header: HEADER,
      warningsSection: "## Warnings\n\n- Dirty tree.\n\n",
      threads: [thread({ id: "PRRT_done", isResolved: true }), thread()],
      items: [{ reviewUrl: "u1", author: "reviewer", text: "outside finding" }],
    })
    expect(output).toContain("- headRefOid: abc123")
    expect(output).toContain("- Repository: o/r")
    expect(output).toContain("## Warnings")
    expect(output).toContain(
      "## T1\n- Thread id: PRRT_1\n- Location: src/a.ts:12\n- Outdated: no",
    )
    expect(output).not.toContain("PRRT_done")
    expect(output).toContain(
      "### reviewer (https://github.com/o/r/pull/1#discussion_r1)",
    )
    expect(output).toContain("```suggestion\nconst x = 1\n```")
    expect(output).toContain(
      "## S1\n- Review: u1 (reviewer)\n\noutside finding",
    )
  })

  test("adds Options and Choice lines only for a thread with a choice block", () => {
    const withOptions = thread({
      comments: {
        nodes: [
          {
            author: { login: "reviewer" },
            body: "- Suggestion A (recommended): x\n- Suggestion B: y\n\nNote: Reply with A or B. If you reply with nothing Suggestion A will be used.",
            url: "u",
            createdAt: "2026-09-29T10:00:00Z",
          },
          {
            author: { login: "dev" },
            body: "B",
            url: "u2",
            createdAt: "2026-09-29T11:00:00Z",
          },
        ],
      },
    })
    const output = formatThreadsDocument({
      header: HEADER,
      warningsSection: "",
      threads: [withOptions, thread({ id: "PRRT_2" })],
      items: [],
    })
    expect(output).toContain(
      "- Outdated: no\n- Options: A (recommended), B\n- Choice: B (replied by dev)\n",
    )
    expect(output.match(/- Options:/g)).toHaveLength(1)
  })

  test("says so when nothing is unresolved", () => {
    const output = formatThreadsDocument({
      header: HEADER,
      warningsSection: "",
      threads: [],
      items: [],
    })
    expect(output).toContain("No unresolved items.")
  })
})

describe("outsideDiffItems on a merged review", () => {
  test("keeps every item when a body holds a bold label line", () => {
    const outside = (id: string, body: string) => ({
      id,
      severity: "yellow",
      file: "x.ts",
      lines: [5],
      label: "issue",
      subject: `subject ${id}`,
      body,
      "found-by": ["Claude Opus 5.5"],
    })
    const { review } = mergeFindings(
      [
        {
          reviewer: "E",
          findings: [
            outside("E-1", "The defect.\n**Proof:**\nthe output"),
            { ...outside("E-2", "Second."), lines: [9] },
          ],
        } as FindingsFile,
      ],
      "",
      { headSha: "a", reviewerLogin: "r", author: "o", pickReasons: [] },
    )
    const items = outsideDiffItems(review.body)
    expect(items).toHaveLength(2)
    expect(items[0]).toContain("the output")
    expect(items[1]).toContain("subject E-2")
  })
})
