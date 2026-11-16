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

function codeLines(text: string): string[] {
  return lf(text)
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== "" && !line.startsWith("#!"))
}

function linesOutside(repoLines: string[], knownLines: string[]): string[] {
  const common: number[][] = Array.from({ length: repoLines.length + 1 }, () =>
    new Array<number>(knownLines.length + 1).fill(0),
  )
  for (let r = repoLines.length - 1; r >= 0; r--) {
    for (let k = knownLines.length - 1; k >= 0; k--) {
      common[r][k] =
        repoLines[r] === knownLines[k]
          ? common[r + 1][k + 1] + 1
          : Math.max(common[r + 1][k], common[r][k + 1])
    }
  }
  const extra: string[] = []
  let r = 0
  let k = 0
  while (r < repoLines.length) {
    if (k < knownLines.length && repoLines[r] === knownLines[k]) {
      r++
      k++
    } else if (k < knownLines.length && common[r][k + 1] > common[r + 1][k]) {
      k++
    } else {
      extra.push(repoLines[r])
      r++
    }
  }
  return extra
}

export function planHook({ repoHook, template, earlier, localExists, parses }: HookInput): HookPlan {
  if (repoHook === null) return { kind: "copy" }
  const repo = lf(repoHook)
  if (repo === lf(template)) return { kind: "same" }
  if (earlier.some((text) => repo === lf(text))) return { kind: "replace-unedited" }

  const repoLines = codeLines(repo)
  const lines = [template, ...earlier]
    .map((text) => linesOutside(repoLines, codeLines(text)))
    .reduce((fewest, extra) => (extra.length < fewest.length ? extra : fewest))
  if (lines.length === 0) return { kind: "replace-unedited" }

  const local = `#!/bin/sh\n${lines.join("\n")}\n`
  if (!parses(local)) return { kind: "manual", lines }
  return localExists ? { kind: "ask", local } : { kind: "move", local }
}
