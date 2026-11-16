/** The drift check: which copies in a repo are older than the plugin's templates. */

export type DriftFile = {
  /** The path in the repo, such as `scripts/review.ts`. */
  path: string
  template: string
  /** `null` when the repo has no such file. */
  copy: string | null
  /** An optional file counts as drift only when the repo has it and it differs. */
  optional: boolean
}

export type DriftInput = {
  /** The version `h2xd:setup` wrote into `agents.config.json`, or `null`. */
  repoVersion: string | null
  pluginVersion: string
  files: DriftFile[]
}

export type DriftReport = {
  repoVersion: string | null
  pluginVersion: string
  older: boolean
  changed: string[]
  missing: string[]
}

/** A negative number, 0 or a positive number, as for `a - b`. Parts are numbers, such as `0.16.2`. */
export function compareVersions(a: string, b: string): number {
  const left = a.split(".").map(Number)
  const right = b.split(".").map(Number)
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0)
    if (difference !== 0) return Math.sign(difference)
  }
  return 0
}

export function findDrift(input: DriftInput): DriftReport {
  const { repoVersion, pluginVersion, files } = input
  return {
    repoVersion,
    pluginVersion,
    older: repoVersion === null || compareVersions(repoVersion, pluginVersion) < 0,
    changed: files
      .filter((file) => file.copy !== null && file.copy !== file.template)
      .map((file) => file.path),
    missing: files
      .filter((file) => file.copy === null && !file.optional)
      .map((file) => file.path),
  }
}

export function hasDrift(report: DriftReport): boolean {
  return report.older || report.changed.length > 0 || report.missing.length > 0
}

export function formatDrift(report: DriftReport): string {
  if (!hasDrift(report)) {
    return `ok: the copies match plugin ${report.pluginVersion}`
  }
  const lines = [
    `drift: the copies are older than the plugin (repo ${report.repoVersion ?? "no version"}, plugin ${report.pluginVersion})`,
  ]
  if (report.changed.length > 0) lines.push(`changed: ${report.changed.join(", ")}`)
  if (report.missing.length > 0) lines.push(`missing: ${report.missing.join(", ")}`)
  lines.push("run /h2xd:setup")
  return lines.join("\n")
}
