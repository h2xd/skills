/** Turns replies.md and threads.md into the posts `node scripts/review.ts reply` makes. */

export type ReplySection = { id: string; body: string }

type ThreadReply = ReplySection & { threadId: string }

export type ReplyPlan = {
  threadReplies: ThreadReply[]
  summaryReplies: ReplySection[]
}

const SHA_PLACEHOLDER = "<sha>"

/** Maps `T1` to the node id from `## T1` / `- Thread id: <id>` in threads.md. */
export function parseThreadIds(threadsMarkdown: string): Map<string, string> {
  const matches = threadsMarkdown.matchAll(/^## (T\d+)\n- Thread id: (\S+)/gm)
  return new Map([...matches].map((match) => [match[1], match[2]]))
}

/** Maps `S1` to the item id from `## S1` / `- Item id: <id>` in threads.md. */
export function parseItemIds(threadsMarkdown: string): Map<string, string> {
  const matches = threadsMarkdown.matchAll(/^## (S\d+)\n- Item id: (\S+)/gm)
  return new Map([...matches].map((match) => [match[1], match[2]]))
}

export function parseReplySections(repliesMarkdown: string): ReplySection[] {
  const matches = repliesMarkdown.matchAll(
    /^## ([TS]\d+)\n([\s\S]*?)(?=^## [TS]\d+\n|(?![\s\S]))/gm,
  )
  return [...matches].map((match) => ({
    id: match[1],
    body: match[2].trim(),
  }))
}

/** Throws with every problem found, so nothing is posted on a partial plan. */
export function planReplies(input: {
  repliesMarkdown: string
  threadsMarkdown: string
  sha?: string
}): ReplyPlan {
  const { sha } = input
  const sections = parseReplySections(input.repliesMarkdown).map((section) => ({
    ...section,
    body: sha ? section.body.replaceAll(SHA_PLACEHOLDER, sha) : section.body,
  }))
  const threadIds = parseThreadIds(input.threadsMarkdown)
  const itemIds = parseItemIds(input.threadsMarkdown)

  const problems: string[] = []
  if (sections.length === 0)
    problems.push("replies file has no T or S sections")
  for (const section of sections) {
    if (section.body.includes(SHA_PLACEHOLDER)) {
      problems.push(
        `${section.id} still contains ${SHA_PLACEHOLDER}, pass --sha`,
      )
    }
    if (section.body === "") problems.push(`${section.id} has an empty body`)
    if (section.id.startsWith("T") && !threadIds.has(section.id)) {
      problems.push(`${section.id} has no thread id in the threads file`)
    }
    if (section.id.startsWith("S") && !itemIds.has(section.id)) {
      problems.push(`${section.id} has no item id in the threads file`)
    }
  }
  if (problems.length > 0) throw new Error(problems.join("\n"))

  return {
    threadReplies: sections
      .filter((section) => section.id.startsWith("T"))
      .map((section) => ({
        ...section,
        threadId: threadIds.get(section.id) as string,
      })),
    summaryReplies: sections
      .filter((section) => section.id.startsWith("S"))
      .map((section) => ({
        ...section,
        id: itemIds.get(section.id) as string,
      })),
  }
}

export type ReplyGateway = {
  replyToThread: (threadId: string, body: string) => string
  commentOnPullRequest: (body: string) => string
}

/** Posts the plan and returns one output line per item. With `dryRun`, posts nothing. */
export function postReplies(
  plan: ReplyPlan,
  gateway: ReplyGateway,
  dryRun: boolean,
): string[] {
  const lines: string[] = []
  for (const reply of plan.threadReplies) {
    if (dryRun) {
      lines.push(
        `${reply.id} would reply to ${reply.threadId}:\n${reply.body}\n`,
      )
    } else {
      lines.push(
        `${reply.id} ${gateway.replyToThread(reply.threadId, reply.body)}`,
      )
    }
  }
  if (plan.summaryReplies.length === 0) return lines

  const comment = formatSummaryComment(plan.summaryReplies)
  const ids = plan.summaryReplies.map((reply) => reply.id)
  if (dryRun) {
    lines.push(`${ids.join(", ")} would comment on the PR:\n${comment}\n`)
  } else {
    const url = gateway.commentOnPullRequest(comment)
    lines.push(...ids.map((id) => `${id} ${url}`))
  }
  return lines
}

/** One PR comment carrying every summary reply, one section per item. */
export function formatSummaryComment(replies: ReplySection[]): string {
  return replies.map((reply) => `## ${reply.id}\n\n${reply.body}`).join("\n\n")
}
