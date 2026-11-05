export type ResolveOutcome = { lines: string[]; failed: boolean }

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
