import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import {
  formatSummaryComment,
  parseReplySections,
  postReplies,
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
      { id: "S1", body: "Fixed in abc1234: moved." },
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
      "S1 https://example.test/comment",
    ])
  })

  test("posts nothing on a dry run", () => {
    const { calls, gateway } = recordingGateway()
    const lines = postReplies(plan, gateway, true)
    expect(calls).toEqual([])
    expect(lines[0]).toContain("T1 would reply to PRRT_a")
    expect(lines[2]).toContain("S1 would comment on the PR")
  })
})

describe("formatSummaryComment", () => {
  test("writes one section per item", () => {
    expect(
      formatSummaryComment([
        { id: "S1", body: "a" },
        { id: "S2", body: "b" },
      ]),
    ).toBe("## S1\n\na\n\n## S2\n\nb")
  })
})
