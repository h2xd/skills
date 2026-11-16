/** The review files a `review-pr` run expects, and which of them are not there. */

import { existsSync, statSync } from "node:fs"
import { join } from "node:path"

const EXTENSIONS = ["json", "md"]

function written(path: string): boolean {
  return existsSync(path) && statSync(path).size > 0
}

/** The `review-<x>` names, for each reviewer letter, that have no non-empty `.json` or `.md` file in `directory`. */
export function missingReviewFiles(directory: string, letters: string[]): string[] {
  return letters
    .map((letter) => `review-${letter.toLowerCase()}`)
    .filter((name) => !EXTENSIONS.some((ext) => written(join(directory, `${name}.${ext}`))))
}
