export type LocalState = {
  headRefName: string
  headRefOid: string
  localHead: string
  status: string
  currentBranch?: string
  mergeable?: string
  mergeStateStatus?: string
}

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
  if (state.mergeable === "CONFLICTING" || state.mergeStateStatus === "DIRTY") {
    warnings.push(
      "Conflicting: the PR has merge conflicts with the base. Findings may sit on lines the merge changes.",
    )
  } else if (state.mergeStateStatus === "BEHIND") {
    warnings.push(
      "Head behind base: the base has commits the PR head lacks. Findings may be stale after an update.",
    )
  }
  return warnings
}

export function formatWarnings(warnings: string[]): string {
  if (warnings.length === 0) return ""
  return `## Warnings\n\n${warnings.map((warning) => `- ${warning}`).join("\n")}\n\n`
}
