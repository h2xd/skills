export type LocalState = {
  headRefName: string
  headRefOid: string
  localHead: string
  /** `git status --short` output. Empty when the tree is clean. */
  status: string
  /** Left out by callers that don't care which branch is checked out. */
  currentBranch?: string
}

/** Conditions the review skills stop and ask about. */
export function collectWarnings(state: LocalState): string[] {
  const warnings: string[] = []
  if (state.localHead !== state.headRefOid) {
    warnings.push(
      `Head mismatch: local HEAD is ${state.localHead}, the PR head is ${state.headRefOid}. Line numbers refer to the PR head.`,
    )
  }
  if (state.status.trim() !== "") {
    warnings.push("Dirty tree: the worktree has uncommitted changes.")
  }
  if (
    state.currentBranch !== undefined &&
    state.currentBranch !== state.headRefName
  ) {
    warnings.push(
      `Wrong branch: the worktree is on "${state.currentBranch}", the PR branch is "${state.headRefName}".`,
    )
  }
  return warnings
}

export function formatWarnings(warnings: string[]): string {
  if (warnings.length === 0) return ""
  return `## Warnings\n\n${warnings.map((warning) => `- ${warning}`).join("\n")}\n\n`
}
