/** Pure check behind `node scripts/implement.ts cleanup`. */

/** The commits that `git cherry` marks with `+`: on the worker branch, not on the ticket branch. */
export function unlandedCommits(cherryOutput: string): string[] {
  return cherryOutput
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("+"))
    .map((line) => line.slice(1).trim())
}
