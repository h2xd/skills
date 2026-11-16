import { existsSync, statSync } from "node:fs"
import { join } from "node:path"

const EXTENSIONS = ["json"]

function written(path: string): boolean {
  return existsSync(path) && statSync(path).size > 0
}

export function missingReviewFiles(directory: string, letters: string[]): string[] {
  return letters
    .map((letter) => `review-${letter.toLowerCase()}`)
    .filter((name) => !EXTENSIONS.some((ext) => written(join(directory, `${name}.${ext}`))))
}
