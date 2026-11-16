export type DriftFile = {
  path: string
  template: string
  copy: string | null
  mayBeMissing: boolean
}

export type DriftInput = {
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
      .filter((file) => file.copy === null && !file.mayBeMissing)
      .map((file) => file.path),
  }
}

export function hasMissingCopy(report: DriftReport): boolean {
  return report.missing.length > 0
}

export function formatDrift(report: DriftReport): string {
  if (!report.older && report.changed.length === 0 && report.missing.length === 0) {
    return `ok: the copies match plugin ${report.pluginVersion}`
  }
  const versions = `repo ${report.repoVersion ?? "no version"}, plugin ${report.pluginVersion}`
  const lines = [
    report.older
      ? `drift: the copies are older than the plugin (${versions})`
      : `drift: the copies differ from the plugin (${versions})`,
  ]
  if (report.changed.length > 0) lines.push(`changed: ${report.changed.join(", ")}`)
  if (report.missing.length > 0) lines.push(`missing: ${report.missing.join(", ")}`)
  lines.push("run /h2xd:setup")
  return lines.join("\n")
}
