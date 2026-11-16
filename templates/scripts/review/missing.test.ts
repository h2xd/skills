import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { missingReviewFiles } from "./missing.ts"

let directory: string

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "missing-"))
})

afterEach(() => {
  rmSync(directory, { recursive: true, force: true })
})

describe("missingReviewFiles", () => {
  test("lists the reviewers that wrote no review file", () => {
    writeFileSync(join(directory, "review-a.json"), "{}")
    writeFileSync(join(directory, "review-c.md"), "x")
    expect(missingReviewFiles(directory, ["a", "b", "c", "d"])).toEqual([
      "review-b",
      "review-d",
    ])
  })

  test("lists nothing when every reviewer wrote its file", () => {
    writeFileSync(join(directory, "review-a.json"), "{}")
    expect(missingReviewFiles(directory, ["a"])).toEqual([])
  })

  test("counts an empty file as missing", () => {
    writeFileSync(join(directory, "review-a.json"), "")
    expect(missingReviewFiles(directory, ["a"])).toEqual(["review-a"])
  })
})

describe("review.ts missing and options --validate", () => {
  const SCRIPT = join(import.meta.dirname, "..", "review.ts")
  const review = (...args: string[]) =>
    spawnSync(process.execPath, [SCRIPT, ...args], { cwd: directory, encoding: "utf8" })

  test("missing fails and names each missing file", () => {
    writeFileSync(join(directory, "review-a.json"), "{}")
    const run = review("missing", directory, "a", "b")
    expect(run.status).toBe(1)
    expect(run.stderr).toContain("missing review-b.json")
  })

  test("missing passes when every file is there", () => {
    writeFileSync(join(directory, "review-a.json"), "{}")
    expect(review("missing", directory, "a").status).toBe(0)
  })

  test("options --validate fails on a local absolute path in the body", () => {
    const file = join(directory, "review.json")
    writeFileSync(file, JSON.stringify({ body: "see /Users/jo/x.md", comments: [] }))
    const run = review("options", "--validate", file)
    expect(run.status).toBe(1)
    expect(run.stderr).toContain("local absolute path /Users/jo/x.md")
  })
})
