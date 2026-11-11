import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { type Finding, type FindingsFile, formatPreview, mergeFindings, parseFindings } from "./findings.ts"
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
  reviewerLogin: "reviewer-bot",
  author: "someone-else",
  pickReasons: [] as string[],
}

function finding(overrides: Partial<Finding> = {}): Finding {
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

function file(reviewer: string, findings: Finding[], status: string[] = []): FindingsFile {
  return { reviewer, findings, status }
}

function rawFinding(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...finding(), ...overrides }
}

function rawFile(reviewer: string, findings: unknown[]): Record<string, unknown> {
  return { reviewer, findings, status: [] }
}

function problemsOf(json: unknown): string[] {
  const result = parseFindings(json)
  return result.ok ? [] : result.problems
}

describe("parseFindings", () => {
  test("returns the typed file for a valid one", () => {
    const result = parseFindings(rawFile("B", [rawFinding({ lines: [12] })]))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.file.reviewer).toBe("B")
      expect(result.file.findings[0].lines).toEqual([12])
    }
  })

  test("gives no problems for a valid file", () => {
    const valid = rawFile("B", [
      rawFinding({ suggestion: "const x = 1", options: ["one", "two"] }),
    ])
    expect(problemsOf(valid)).toEqual([])
  })

  test("names the finding and the field of a bad value", () => {
    const bad = rawFile("B", [
      rawFinding({ severity: "orange", lines: [14, 12], subject: "" }),
    ])
    const problems = problemsOf(bad)
    expect(problems).toHaveLength(3)
    expect(problems.some((p) => p.startsWith("B-1: severity"))).toBe(true)
    expect(problems.some((p) => p.startsWith("B-1: lines"))).toBe(true)
    expect(problems.some((p) => p.startsWith("B-1: subject"))).toBe(true)
  })

  test("names a missing field and an unknown field", () => {
    const { body: _body, ...withoutBody } = rawFinding()
    const problems = problemsOf(
      rawFile("B", [{ ...withoutBody, colour: "red" }]),
    )
    expect(problems.some((p) => p.startsWith("B-1: body"))).toBe(true)
    expect(problems.some((p) => p.startsWith("B-1: colour"))).toBe(true)
  })

  test("rejects a label that does not fit the severity, and one option", () => {
    const problems = problemsOf(
      rawFile("B", [rawFinding({ label: "praise", options: ["only"] })]),
    )
    expect(problems.some((p) => p.startsWith("B-1: label"))).toBe(true)
    expect(problems.some((p) => p.startsWith("B-1: options"))).toBe(true)
  })

  test("rejects an id of another reviewer and a repeated id", () => {
    const problems = problemsOf(
      rawFile("B", [rawFinding({ id: "C-1" }), rawFinding(), rawFinding()]),
    )
    expect(problems.some((p) => p.startsWith("C-1: id"))).toBe(true)
    expect(problems.some((p) => p.startsWith("B-1: id"))).toBe(true)
  })

  test("accepts one line and three options", () => {
    const valid = rawFile("B", [
      rawFinding({ lines: [12], options: ["one", "two", "three"] }),
    ])
    expect(problemsOf(valid)).toEqual([])
  })

  test("rejects a file that is not an object", () => {
    expect(problemsOf("nope")).toHaveLength(1)
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

  test("joins findings that share only one line", () => {
    const { review } = mergeFindings(
      [
        file("A", [finding({ id: "A-1", lines: [12, 13] })]),
        file("B", [finding({ lines: [11, 12] })]),
      ],
      DIFF,
      CONTEXT,
    )
    expect(review.comments).toHaveLength(1)
  })

  test("keeps the last line of a hunk inline and moves the next line out", () => {
    const { review, stats } = mergeFindings(
      [
        file("B", [
          finding({ lines: [15] }),
          finding({ id: "B-2", lines: [16], subject: "past the hunk" }),
        ]),
      ],
      DIFF,
      CONTEXT,
    )
    expect(review.comments.map((comment) => comment.line)).toEqual([15])
    expect(stats.outside).toBe(1)
  })

  test("reads a hunk header without a count as one line", () => {
    const oneLine = [
      "diff --git a/src/undo.ts b/src/undo.ts",
      "--- a/src/undo.ts",
      "+++ b/src/undo.ts",
      "@@ -3 +3 @@",
      "-a",
      "+b",
      "",
    ].join("\n")
    const { review } = mergeFindings(
      [file("B", [finding({ lines: [3] })])],
      oneLine,
      CONTEXT,
    )
    expect(review.comments).toHaveLength(1)
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
    const { review, dropped } = mergeFindings(
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
    expect(dropped).toEqual([{ id: "C-1", subject: "kept, protects a lock order" }])
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

  test("matches each reworded bullet to its finding by icon and location", () => {
    const input = [
      file("B", [
        finding({ severity: "red", label: "issue", lines: [13] }),
        finding({ id: "B-2" }),
      ]),
    ]
    const { review } = mergeFindings(input, DIFF, {
      ...CONTEXT,
      rewordedBullets: [
        "- 🟡 `src/undo.ts:11-12`: rename it",
        "- 🔴 `src/undo.ts:13`: fix the undo",
      ],
    })
    const findings = review.body.split("### Findings\n")[1]
    expect(findings.indexOf("fix the undo")).toBeLessThan(
      findings.indexOf("rename it"),
    )
  })

  test("refuses a missing bullet and a bullet for no finding", () => {
    const input = [file("B", [finding()])]
    expect(() =>
      mergeFindings(input, DIFF, { ...CONTEXT, rewordedBullets: [] }),
    ).toThrow("no bullet for - 🟡 `src/undo.ts:11-12`:")
    expect(() =>
      mergeFindings(input, DIFF, {
        ...CONTEXT,
        rewordedBullets: [
          "- 🟡 `src/undo.ts:11-12`: rename it",
          "- 🟡 `src/undo.ts:99`: extra",
        ],
      }),
    ).toThrow("matches no finding: - 🟡 `src/undo.ts:99`: extra")
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

  test("keeps a finding inline after an added line that starts with ++", () => {
    const diff = [
      "diff --git a/f.md b/f.md",
      "--- a/f.md",
      "+++ b/f.md",
      "@@ -1,2 +1,3 @@",
      " a",
      "+++ note",
      " b",
      "@@ -10,1 +11,2 @@",
      " c",
      "+d",
      "",
    ].join("\n")
    const { review, stats } = mergeFindings(
      [file("B", [finding({ file: "f.md", lines: [12] })])],
      diff,
      CONTEXT,
    )
    expect(review.comments).toHaveLength(1)
    expect(stats.outside).toBe(0)
  })

  test("keeps a finding inline after a removed -- line and an added ++ line", () => {
    const diff = [
      "diff --git a/q.sql b/q.sql",
      "--- a/q.sql",
      "+++ b/q.sql",
      "@@ -1,2 +1,2 @@",
      " x",
      "--- old",
      "+++ new",
      "@@ -10,1 +10,2 @@",
      " c",
      "+d",
      "",
    ].join("\n")
    const { review, stats } = mergeFindings(
      [file("B", [finding({ file: "q.sql", lines: [11] })])],
      diff,
      CONTEXT,
    )
    expect(review.comments).toHaveLength(1)
    expect(stats.outside).toBe(0)
  })

  test("leaves the suggestion of a lower finding out of a blocking comment", () => {
    const { review } = mergeFindings(
      [
        file("A", [
          finding({
            id: "A-1",
            severity: "red",
            label: "issue",
            lines: [10, 12],
            subject: "query is built from user input",
          }),
        ]),
        file("C", [
          finding({
            id: "C-1",
            severity: "green",
            label: "nitpick",
            lines: [11],
            subject: "reap the comment",
            suggestion: "",
          }),
        ]),
      ],
      DIFF,
      CONTEXT,
    )
    expect(review.comments).toHaveLength(1)
    expect(review.comments[0].body).toContain("issue (blocking)")
    expect(review.comments[0].body).not.toContain("```suggestion")
    expect(review.comments[0].start_line).toBe(10)
    expect(review.comments[0].line).toBe(12)
  })

  test("keeps an indented suggestion outside the diff intact for review-fix", () => {
    const suggestion = "jobs:\n  test:\n\n    runs-on: x"
    const { review } = mergeFindings(
      [
        file("B", [
          finding({ file: "c.yml", lines: [3, 5], subject: "s", suggestion }),
        ]),
      ],
      DIFF,
      CONTEXT,
    )
    const items = outsideDiffItems(review.body)
    expect(items).toHaveLength(1)
    expect(items[0]).toContain(`\`\`\`\n${suggestion}\n\`\`\``)
  })

  test("takes the suggestion and the options from one reviewer", () => {
    const { review } = mergeFindings(
      [
        file("A", [
          finding({
            id: "A-1",
            severity: "red",
            label: "issue",
            lines: [11],
            options: ["fix one", "fix two"],
          }),
        ]),
        file("B", [finding({ lines: [11, 12], suggestion: "other" })]),
      ],
      DIFF,
      CONTEXT,
    )
    const body = review.comments[0].body
    expect(body).toContain("- Suggestion A (recommended): fix one")
    expect(body).not.toContain("```suggestion")
  })

  test("writes the options of a finding outside the diff", () => {
    const { review } = mergeFindings(
      [
        file("E", [
          finding({ id: "E-1", lines: [40], options: ["fix one", "fix two"] }),
          finding({ id: "E-2", file: "src/b.ts", lines: [3], subject: "second" }),
        ]),
      ],
      DIFF,
      CONTEXT,
    )
    const items = outsideDiffItems(review.body)
    expect(items).toHaveLength(2)
    const item = items.find((text) => text.includes("name it"))
    expect(item).toContain("Suggestion A (recommended): fix one")
    expect(item).toContain("Suggestion B: fix two")
  })

  test("lists a dropped finding in the preview", () => {
    const { review, dropped } = mergeFindings(
      [file("C", [finding({ id: "C-1", subject: "Kept threads are lost" })])],
      DIFF,
      CONTEXT,
    )
    expect(formatPreview(review, dropped)).toContain(
      "## Dropped\n\n- C-1: Kept threads are lost",
    )
  })
})
