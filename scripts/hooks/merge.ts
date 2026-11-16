export type HookPlan =
  | { kind: "copy" }
  | { kind: "same" }
  | { kind: "replace-unedited" }
  | { kind: "move"; local: string }
  | { kind: "ask"; local: string }
  | { kind: "manual"; lines: string[] }

export type HookInput = {
  repoHook: string | null
  template: string
  earlier: string[]
  localExists: boolean
  parses: (script: string) => boolean
}

const lf = (text: string) => text.replace(/\r\n?/g, "\n")

function linesOf(text: string): string[] {
  return lf(text)
    .split("\n")
    .map((line) => line.trimEnd())
}

export function planHook({ repoHook, template, earlier, localExists, parses }: HookInput): HookPlan {
  if (repoHook === null) return { kind: "copy" }
  const repo = lf(repoHook)
  if (repo === lf(template)) return { kind: "same" }
  if (earlier.some((text) => repo === lf(text))) return { kind: "replace-unedited" }

  const known = new Set([template, ...earlier].flatMap(linesOf))
  const lines = linesOf(repo).filter(
    (line) => line.trim() !== "" && !line.startsWith("#!") && !known.has(line),
  )
  if (lines.length === 0) return { kind: "replace-unedited" }

  const local = `#!/bin/sh\n${lines.join("\n")}\n`
  if (!parses(local)) return { kind: "manual", lines }
  return localExists ? { kind: "ask", local } : { kind: "move", local }
}
