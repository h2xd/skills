/** Counts the arbiters' verdict files of the review gate and acts on the majority. */

import { join } from "node:path"
import { parseThreadIds } from "./reply.ts"

export const ARBITERS = ["sonnet", "haiku-1", "haiku-2"] as const

export type Verdict = {
  arbiter: string
  verdict: "keep" | "change"
  reason: string
}

export type TallyOutcome = { lines: string[]; failed: boolean }

export type TallyGateway = {
  readVerdictFile: (path: string) => string | undefined
  replyToThread: (threadId: string, body: string) => string
  resolveThread: (threadId: string) => void
}

export function verdictPath(
  directory: string,
  label: string,
  arbiter: string,
): string {
  return join(directory, `${label}-${arbiter}.md`)
}

/** A verdict file is `verdict: keep|change` on line 1 and `reason: <text>` on line 2. */
export function parseVerdict(arbiter: string, text: string): Verdict {
  const verdict = text.match(/^verdict:[ \t]*(keep|change)[ \t]*$/m)?.[1]
  const reason = text.match(/^reason:[ \t]*(\S.*?)[ \t]*$/m)?.[1]
  if (verdict === undefined || reason === undefined) {
    throw new Error("needs a `verdict: keep|change` line and a `reason:` line")
  }
  return { arbiter, verdict: verdict as Verdict["verdict"], reason }
}

function keepReply(keeps: Verdict[], total: number): string {
  const reasons = keeps.map((v) => `- ${v.arbiter}: ${v.reason}`).join("\n")
  return `🟢 Kept: ${keeps.length} of ${total} arbiters keep the code as it is.\n\n${reasons}`
}

function tallyThread(
  label: string,
  threadId: string,
  directory: string,
  gateway: TallyGateway,
): string {
  const verdicts = ARBITERS.map((arbiter) => {
    const path = verdictPath(directory, label, arbiter)
    const text = gateway.readVerdictFile(path)
    if (text === undefined) throw new Error(`missing verdict file ${path}`)
    try {
      return parseVerdict(arbiter, text)
    } catch (error) {
      throw new Error(`${path} ${(error as Error).message}`)
    }
  })
  const keeps = verdicts.filter((v) => v.verdict === "keep")
  if (keeps.length * 2 > verdicts.length) {
    const url = gateway.replyToThread(threadId, keepReply(keeps, verdicts.length))
    gateway.resolveThread(threadId)
    return `${label} keep ${keeps.length}/${verdicts.length} ${url} resolved`
  }
  const changes = verdicts.filter((v) => v.verdict === "change")
  const reasons = changes.map((v) => `${v.arbiter}: ${v.reason}`).join(" | ")
  return `${label} change ${changes.length}/${verdicts.length} ${reasons}`
}

/**
 * A `keep` majority gets a reply with the count and the reasons, then is
 * resolved. A `change` majority is only printed, for the fixer. A thread with
 * a missing or malformed verdict file stays open and reports an error.
 */
export function tallyThreads(
  labels: string[],
  threadsMarkdown: string,
  directory: string,
  gateway: TallyGateway,
): TallyOutcome {
  const threadIds = parseThreadIds(threadsMarkdown)
  let failed = false
  const lines = labels.map((label) => {
    try {
      const threadId = threadIds.get(label)
      if (threadId === undefined) {
        throw new Error(`${label} has no thread id in the threads file`)
      }
      return tallyThread(label, threadId, directory, gateway)
    } catch (error) {
      failed = true
      return `${label} error: ${error instanceof Error ? error.message : error}`
    }
  })
  return { lines, failed }
}
