import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { type FindingsFile, mergeFindings, validateFindings } from "./findings.ts"
import { validateDraftComments } from "./options.ts"
import { outsideDiffItems } from "./threads.ts"

const DIFF = [
  "diff --git a/src/undo.ts b/src/undo.ts",
  "--- a/src/undo.ts",
  "+++ b/src/undo.ts",
  "@@ -10,3 +10,6 @@ function undo() {",
  " a",
  "+b",
  "+c",
  "+d",
  " e",
  " f",
  "",
].join("\n")

const CONTEXT = {
  headSha: "abc123",
  login: "reviewer-bot",
  author: "someone-else",
  pickReasons: [] as string[],
}

function finding(overrides: Record<string, unknown> = {}) {
  return {
    id: "B-1",
    severity: "yellow",
    file: "src/undo.ts",
    lines: [11, 12],
    label: "suggestion",
    subject: "name it",
    body: "The name hides the unit.",
    "found-by": ["Claude Opus 5.5"],
    ...overrides,
  }
}

function file(reviewer: string, findings: unknown[], status: string[] = []) {
  return { reviewer, findings, status } as FindingsFile
}

describe("validateFindings", () => {
  test("gives no problems for a valid file", () => {
    const valid = file("B", [
      finding({ suggestion: "const x = 1", options: ["one", "two"] }),
    ])
    expect(validateFindings(valid)).toEqual([])
  })

  test("names the finding and the field of a bad value", () => {
    const bad = file("B", [
      finding({ severity: "orange", lines: [14, 12], subject: "" }),
    ])
    const problems = validateFindings(bad)
    expect(problems).toHaveLength(3)
    expect(problems.some((p) => p.startsWith("B-1: severity"))).toBe(true)
    expect(problems.some((p) => p.startsWith("B-1: lines"))).toBe(true)
    expect(problems.some((p) => p.startsWith("B-1: subject"))).toBe(true)
  })

  test("names a missing field and an unknown field", () => {
    const { body: _body, ...withoutBody } = finding()
    const problems = validateFindings(
      file("B", [{ ...withoutBody, colour: "red" }]),
    )
    expect(problems.some((p) => p.startsWith("B-1: body"))).toBe(true)
    expect(problems.some((p) => p.startsWith("B-1: colour"))).toBe(true)
  })

  test("rejects a label that does not fit the severity, and one option", () => {
    const problems = validateFindings(
      file("B", [finding({ label: "praise", options: ["only"] })]),
    )
    expect(problems.some((p) => p.startsWith("B-1: label"))).toBe(true)
    expect(problems.some((p) => p.startsWith("B-1: options"))).toBe(true)
  })

  test("rejects an id of another reviewer and a repeated id", () => {
    const problems = validateFindings(
      file("B", [finding({ id: "C-1" }), finding(), finding()]),
    )
    expect(problems.some((p) => p.startsWith("C-1: id"))).toBe(true)
    expect(problems.some((p) => p.startsWith("B-1: id"))).toBe(true)
  })

  test("rejects a file that is not an object", () => {
    expect(validateFindings("nope")).toHaveLength(1)
  })
})

describe("mergeFindings", () => {
  test("joins findings of two reviewers on overlapping lines", () => {
    const { review, stats } = mergeFindings(
      [
        file("B", [finding({ severity: "yellow", body: "from B" })]),
        file("A", [
          finding({
            id: "A-1",
            severity: "red",
            label: "issue",
            lines: [12, 13],
            subject: "breaks undo",
            body: "from A",
            "found-by": ["Claude Sonnet 5.5"],
          }),
        ]),
      ],
      DIFF,
      CONTEXT,
    )
    expect(review.comments).toHaveLength(1)
    const [comment] = review.comments
    expect(comment.body).toStartWith("issue (blocking): breaks undo")
    expect(comment.body).toContain("from A")
    expect(comment.body).toContain("from B")
    expect(comment.body).toContain(
      "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>",
    )
    expect(comment.body).toContain(
      "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>",
    )
    expect(stats.merged).toBe(1)
  })

  test("keeps two findings of one reviewer on the same lines apart", () => {
    const { review } = mergeFindings(
      [file("B", [finding(), finding({ id: "B-2", subject: "other" })])],
      DIFF,
      CONTEXT,
    )
    expect(review.comments).toHaveLength(2)
  })

  test("does not join findings on different files or distant lines", () => {
    const { review } = mergeFindings(
      [
        file("B", [finding()]),
        file("C", [
          finding({ id: "C-1", lines: [15, 15] }),
          finding({ id: "C-2", file: "src/other.ts", lines: [11, 12] }),
        ]),
      ],
      DIFF,
      CONTEXT,
    )
    expect(review.comments).toHaveLength(2)
    expect(review.body).toContain("src/other.ts:11-12")
  })

  test("moves a line outside the diff to the body", () => {
    const { review, stats } = mergeFindings(
      [
        file("E", [
          finding({
            id: "E-1",
            lines: [40, 40],
            subject: "caller breaks",
            body: "proof output",
          }),
        ]),
      ],
      DIFF,
      CONTEXT,
    )
    expect(review.comments).toHaveLength(0)
    expect(stats.outside).toBe(1)
    const section = review.body.split("### Outside the diff\n")[1]
    expect(section).toContain("- 🟡 `src/undo.ts:40`: caller breaks")
    expect(section).toContain("proof output")
  })

  test("moves a range that crosses out of the hunk", () => {
    const { review } = mergeFindings(
      [file("B", [finding({ lines: [14, 20] })])],
      DIFF,
      CONTEXT,
    )
    expect(review.comments).toHaveLength(0)
  })

  test("drops a kept note", () => {
    const { review, stats } = mergeFindings(
      [
        file("C", [
          finding({
            id: "C-1",
            severity: "green",
            label: "note",
            subject: "kept, protects a lock order",
          }),
        ]),
      ],
      DIFF,
      CONTEXT,
    )
    expect(review.comments).toHaveLength(0)
    expect(stats.dropped).toBe(1)
  })

  test("sorts the comments worst first", () => {
    const { review } = mergeFindings(
      [
        file("B", [
          finding({ id: "B-1", severity: "green", label: "nitpick", lines: [11, 11], subject: "nit" }),
          finding({ id: "B-2", severity: "red", label: "issue", lines: [13, 13], subject: "bug" }),
          finding({ id: "B-3", severity: "yellow", lines: [12, 12], subject: "meh" }),
        ]),
      ],
      DIFF,
      CONTEXT,
    )
    expect(review.comments.map((c) => c.line)).toEqual([13, 12, 11])
  })

  test("sets REQUEST_CHANGES with a red, APPROVE without one", () => {
    const red = mergeFindings(
      [file("B", [finding({ severity: "red", label: "issue" })])],
      DIFF,
      CONTEXT,
    )
    expect(red.review.event).toBe("REQUEST_CHANGES")
    const none = mergeFindings([file("B", [finding()])], DIFF, CONTEXT)
    expect(none.review.event).toBe("APPROVE")
  })

  test("sets COMMENT on the own PR and states the verdict", () => {
    const own = mergeFindings(
      [file("B", [finding({ severity: "red", label: "issue" })])],
      DIFF,
      { ...CONTEXT, author: "reviewer-bot" },
    )
    expect(own.review.event).toBe("COMMENT")
    expect(own.review.body.split("\n")[0]).toContain("request changes")
  })

  test("sets the commit and a one-line range for a single line", () => {
    const { review } = mergeFindings(
      [file("B", [finding({ lines: [11, 12] }), finding({ id: "B-2", lines: [13, 13] })])],
      DIFF,
      CONTEXT,
    )
    expect(review.commit_id).toBe("abc123")
    expect(review.comments[0]).toMatchObject({
      path: "src/undo.ts",
      line: 12,
      start_line: 11,
      side: "RIGHT",
      start_side: "RIGHT",
    })
    expect(review.comments[1].start_line).toBeUndefined()
  })

  test("writes a suggestion block and a choice block that options --validate accepts", () => {
    const { review } = mergeFindings(
      [
        file("B", [
          finding({
            suggestion: "const count = 1",
            options: ["rename to count", "rename to total", "leave it"],
          }),
        ]),
      ],
      DIFF,
      CONTEXT,
    )
    const body = review.comments[0].body
    expect(body).toContain("```suggestion\nconst count = 1\n```")
    expect(body).toContain("- Suggestion A (recommended): rename to count")
    expect(body).toContain(
      "Note: Reply with A, B, or C. If you reply with nothing Suggestion A will be used.",
    )
    expect(validateDraftComments(review.comments)).toEqual([])
  })

  test("writes an empty suggestion as a block that deletes the lines", () => {
    const { review } = mergeFindings(
      [file("C", [finding({ id: "C-1", suggestion: "" })])],
      DIFF,
      CONTEXT,
    )
    expect(review.comments[0].body).toContain("```suggestion\n```")
  })

  test("writes the six parts of the body in order", () => {
    const { review } = mergeFindings(
      [
        file("B", [finding()]),
        file("D", [], ["🟢 3 killed, 0 equivalent, 0 invalid"]),
      ],
      DIFF,
      { ...CONTEXT, pickReasons: ["Reviewer E left out: small diff"] },
    )
    const positions = [
      review.body.indexOf("Approve"),
      review.body.indexOf("🟡 1"),
      review.body.indexOf("### Findings"),
      review.body.indexOf("### Outside the diff"),
      review.body.indexOf("### Reviewers"),
      review.body.indexOf("Co-Authored-By:"),
    ]
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
    expect(positions.every((p) => p >= 0)).toBe(true)
    expect(review.body).toContain("3 killed")
    expect(review.body).toContain("Reviewer E left out: small diff")
    expect(review.body).toContain("Ran: B, D")
  })

  test("uses the reworded bullets when given, and refuses a wrong count", () => {
    const input = [file("B", [finding()])]
    const { review } = mergeFindings(input, DIFF, {
      ...CONTEXT,
      bullets: ["- 🟡 `src/undo.ts:11-12`: rename it"],
    })
    expect(review.body).toContain("rename it")
    expect(() =>
      mergeFindings(input, DIFF, { ...CONTEXT, bullets: [] }),
    ).toThrow("bullets")
  })

  test("writes the Outside the diff part in the shape review threads reads", () => {
    const { review } = mergeFindings(
      [
        file("E", [
          finding({ id: "E-1", lines: [40, 40], subject: "caller breaks", body: "line one\n- not a bullet\nline two" }),
          finding({ id: "E-2", file: "src/b.ts", lines: [3, 3], subject: "second" }),
        ]),
      ],
      DIFF,
      CONTEXT,
    )
    const items = outsideDiffItems(review.body)
    expect(items).toHaveLength(2)
    expect(items[1]).toContain("caller breaks")
    expect(items[1]).toContain("- not a bullet")
  })
})
