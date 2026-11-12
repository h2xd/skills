import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import {
  formatSummaryComment,
  parseReplySections,
  postReplies,
  parseItemIds,
  parseThreadIds,
  planReplies,
} from "./reply.ts"

const THREADS = `# Review items for PR #1

- Number: 1

## T1
- Thread id: PRRT_a
- Location: a.ts:1

### reviewer (u)

body

## T2
- Thread id: PRRT_b
- Location: b.ts:2

## S1
- Item id: out-1a2b3c4d
- Review: u (reviewer)

outside
`

const REPLIES = `## T1
Fixed in <sha>: renamed.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>

## T2
Not changed: covered by ADR-0007.

## S1
Fixed in <sha>: moved.
`

describe("parseThreadIds", () => {
  test("maps T ids to thread node ids and ignores S items", () => {
    expect([...parseThreadIds(THREADS)]).toEqual([
      ["T1", "PRRT_a"],
      ["T2", "PRRT_b"],
    ])
  })
})

describe("parseItemIds", () => {
  test("maps S labels to item ids", () => {
    expect([...parseItemIds(THREADS)]).toEqual([["S1", "out-1a2b3c4d"]])
  })
})

describe("parseReplySections", () => {
  test("splits on T and S headings and trims bodies", () => {
    const sections = parseReplySections(REPLIES)
    expect(sections.map((section) => section.id)).toEqual(["T1", "T2", "S1"])
    expect(sections[0].body).toBe(
      "Fixed in <sha>: renamed.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>",
    )
    expect(sections[2].body).toBe("Fixed in <sha>: moved.")
  })
})

describe("planReplies", () => {
  test("rejects a heading that is not a T or S label, so its text never joins the reply above", () => {
    const misnamed = `${REPLIES}\n## out-1a2b3c4d\nFixed in <sha>: moved.\n`
    expect(() =>
      planReplies({ repliesMarkdown: misnamed, threadsMarkdown: THREADS, sha: "abc1234" }),
    ).toThrow("## out-1a2b3c4d is not a T or S label. Head each reply with the label from the threads file, such as ## S1")
  })

  for (const [name, text, heading] of [
    ["a heading with a space", "## T1\nFixed in <sha>.\n\n## Why this way\nlost text\n## S1\nok\n", "## Why this way"],
    ["a heading inside a fenced block", "## T1\nFixed:\n```md\n## Usage notes\nmore\n```\nend\n", "## Usage notes"],
  ] as const) {
    test(`rejects ${name} instead of dropping its text`, () => {
      const label = heading.trimEnd().slice(3)
      expect(() =>
        planReplies({ repliesMarkdown: text, threadsMarkdown: THREADS, sha: "abc1234" }),
      ).toThrow(`## ${label} is not a T or S label`)
    })
  }

  test("starts a section at a heading with a trailing space", () => {
    const sections = parseReplySections("## T1\nok\n## S1 \nmore\n")
    expect(sections.map((section) => section.id)).toEqual(["T1", "S1"])
    expect(sections[1].body).toBe("more")
  })

  test("parses a file with CRLF line endings", () => {
    const sections = parseReplySections("## T1\r\nok\r\n## S1\r\nok\r\n")
    expect(sections.map((section) => section.id)).toEqual(["T1", "S1"])
    expect(sections.map((section) => section.body)).toEqual(["ok", "ok"])
  })

  test("rejects a mistyped first heading, so its text is not dropped", () => {
    expect(() =>
      planReplies({ repliesMarkdown: "##T1\nFixed.\n## S1\nok\n", threadsMarkdown: THREADS, sha: "abc1234" }),
    ).toThrow("Open the replies file with ## T<n> or ## S<n>")
  })

  test("rejects text before the first heading", () => {
    expect(() =>
      planReplies({ repliesMarkdown: "intro\n## T1\nok\n", threadsMarkdown: THREADS, sha: "abc1234" }),
    ).toThrow("Open the replies file with ## T<n> or ## S<n>")
  })

  test("tells the writer a reply body uses ### for its own headings", () => {
    expect(() =>
      planReplies({ repliesMarkdown: "## T1\nok\n## Details\nx\n", threadsMarkdown: THREADS, sha: "abc1234" }),
    ).toThrow("A reply body uses ### or lower for its own headings")
  })

  test("fills the sha and pairs each T reply with its thread id", () => {
    const plan = planReplies({
      repliesMarkdown: REPLIES,
      threadsMarkdown: THREADS,
      sha: "abc1234",
    })
    expect(plan.threadReplies.map((reply) => reply.threadId)).toEqual([
      "PRRT_a",
      "PRRT_b",
    ])
    expect(plan.threadReplies[0].body).toContain("Fixed in abc1234:")
    expect(plan.summaryReplies).toEqual([
      { id: "out-1a2b3c4d", body: "Fixed in abc1234: moved." },
    ])
  })

  test("refuses when a sha placeholder would remain", () => {
    expect(() =>
      planReplies({ repliesMarkdown: REPLIES, threadsMarkdown: THREADS }),
    ).toThrow("T1 still contains <sha>")
  })

  test("accepts replies without a placeholder and no sha", () => {
    const plan = planReplies({
      repliesMarkdown: "## T2\nNot changed: reason.\n",
      threadsMarkdown: THREADS,
    })
    expect(plan.threadReplies).toHaveLength(1)
  })

  test("refuses a T id with no thread id, naming every problem", () => {
    const error = (() => {
      try {
        planReplies({
          repliesMarkdown: "## T9\nNot changed: x.\n\n## T1\n\n",
          threadsMarkdown: THREADS,
        })
      } catch (thrown) {
        return String(thrown)
      }
      return ""
    })()
    expect(error).toContain("T9 has no thread id")
    expect(error).toContain("T1 has an empty body")
  })

  test("refuses an S label with no item id", () => {
    expect(() =>
      planReplies({
        repliesMarkdown: "## S4\nFixed.\n",
        threadsMarkdown: THREADS,
      }),
    ).toThrow("S4 has no item id")
  })

  test("refuses a file without sections", () => {
    expect(() =>
      planReplies({ repliesMarkdown: "nothing", threadsMarkdown: THREADS }),
    ).toThrow("no T or S sections")
  })
})

describe("postReplies", () => {
  const plan = planReplies({
    repliesMarkdown: REPLIES,
    threadsMarkdown: THREADS,
    sha: "abc1234",
  })

  function recordingGateway() {
    const calls: string[] = []
    return {
      calls,
      gateway: {
        replyToThread: (threadId: string) => {
          calls.push(`thread ${threadId}`)
          return `https://example.test/${threadId}`
        },
        commentOnPullRequest: () => {
          calls.push("comment")
          return "https://example.test/comment"
        },
      },
    }
  }

  test("posts each thread reply and one summary comment, printing a url per item", () => {
    const { calls, gateway } = recordingGateway()
    const lines = postReplies(plan, gateway, false)
    expect(calls).toEqual(["thread PRRT_a", "thread PRRT_b", "comment"])
    expect(lines).toEqual([
      "T1 https://example.test/PRRT_a",
      "T2 https://example.test/PRRT_b",
      "out-1a2b3c4d https://example.test/comment",
    ])
  })

  test("posts nothing on a dry run", () => {
    const { calls, gateway } = recordingGateway()
    const lines = postReplies(plan, gateway, true)
    expect(calls).toEqual([])
    expect(lines[0]).toContain("T1 would reply to PRRT_a")
    expect(lines[2]).toContain("out-1a2b3c4d would comment on the PR")
  })
})

describe("formatSummaryComment", () => {
  test("writes one section per item", () => {
    expect(
      formatSummaryComment([
        { id: "out-1a2b3c4d", body: "a" },
        { id: "out-5e6f7a8b", body: "b" },
      ]),
    ).toBe("## out-1a2b3c4d\n\na\n\n## out-5e6f7a8b\n\nb")
  })
})
