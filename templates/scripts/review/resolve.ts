import { parseThreadIds } from "./reply.ts"

export type ResolveOutcome = { lines: string[]; failed: boolean }

const THREAD_LABEL = /^T\d+$/
const THREAD_NODE_ID = /^PRRT_\w+$/

export function threadNodeIds(
  idsOrLabels: string[],
  threadsMarkdown: string,
): string[] {
  const labels = parseThreadIds(threadsMarkdown)
  return idsOrLabels.map((argument) => {
    if (THREAD_NODE_ID.test(argument)) return argument
    if (!THREAD_LABEL.test(argument)) {
      throw new Error(`${argument} is neither a thread id (PRRT_...) nor a T label`)
    }
    const id = labels.get(argument)
    if (id === undefined) {
      throw new Error(`${argument} has no thread id in the threads file`)
    }
    return id
  })
}

/** Resolves each thread and reports `<id> resolved` or `<id> error: <message>`. */
export function resolveThreads(
  threadIds: string[],
  resolveThread: (threadId: string) => void,
): ResolveOutcome {
  let failed = false
  const lines = threadIds.map((threadId) => {
    try {
      resolveThread(threadId)
      return `${threadId} resolved`
    } catch (error) {
      failed = true
      const message = error instanceof Error ? error.message : String(error)
      return `${threadId} error: ${message}`
    }
  })
  return { lines, failed }
}
