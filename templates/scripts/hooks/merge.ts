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

type Diff = { outside: number[]; allKnownKept: boolean }

function diffAgainst(repoLines: string[], knownLines: string[]): Diff {
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
  const outside: number[] = []
  let r = 0
  let k = 0
  while (r < repoLines.length) {
    if (k < knownLines.length && repoLines[r] === knownLines[k]) {
      r++
      k++
    } else if (k < knownLines.length && common[r][k + 1] > common[r + 1][k]) {
      k++
    } else {
      outside.push(r)
      r++
    }
  }
  return { outside, allKnownKept: repoLines.length - outside.length === knownLines.length }
}

function startsInsideBlock(repoLines: string[], outside: number[]): boolean {
  return outside.some((index, position) => {
    const startsRun = position === 0 || outside[position - 1] !== index - 1
    return startsRun && /^\s/.test(repoLines[index])
  })
}

const fewest = (best: Diff, next: Diff) => (next.outside.length < best.outside.length ? next : best)

export function planHook({ repoHook, template, earlier, localExists, parses }: HookInput): HookPlan {
  if (repoHook === null) return { kind: "copy" }
  const repo = lf(repoHook)
  if (repo === lf(template)) return { kind: "same" }
  if (earlier.some((text) => repo === lf(text))) return { kind: "replace-unedited" }

  const repoLines = codeLines(repo)
  const diffs = [template, ...earlier].map((text) => diffAgainst(repoLines, codeLines(text)))
  const insertionsOnly = diffs.filter((diff) => diff.allKnownKept)
  const closest = (insertionsOnly.length > 0 ? insertionsOnly : diffs).reduce(fewest)
  const lines = closest.outside.map((index) => repoLines[index])
  if (insertionsOnly.length === 0 || startsInsideBlock(repoLines, closest.outside)) {
    return { kind: "manual", lines }
  }
  if (lines.length === 0) return { kind: "replace-unedited" }

  const local = `#!/bin/sh\n${lines.join("\n")}\n`
  if (!parses(local)) return { kind: "manual", lines }
  return localExists ? { kind: "ask", local } : { kind: "move", local }
}
