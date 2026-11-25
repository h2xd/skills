import { spawnSync } from "node:child_process"
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { homedir, tmpdir } from "node:os"
import { join, sep } from "node:path"
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
    writeFileSync(join(directory, "review-c.json"), "{}")
    expect(missingReviewFiles(directory, ["a", "b", "c", "d"])).toEqual([
      "review-b",
      "review-d",
    ])
  })

  test("does not count a markdown file, because merge reads only json", () => {
    writeFileSync(join(directory, "review-a.md"), "x")
    expect(missingReviewFiles(directory, ["a"])).toEqual(["review-a"])
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
    const run = review("missing", directory, "a")
    expect(run.status).toBe(0)
    expect(run.stdout.trim()).toBe("ok: 1 reviewer file(s) found")
  })

  test("options --validate fails on a local absolute path in the body", () => {
    const file = join(directory, "review.json")
    const quoted = join(homedir(), "x.md")
    writeFileSync(file, JSON.stringify({ body: `see ${quoted}`, comments: [] }))
    const run = review("options", "--validate", file)
    expect(run.status).toBe(1)
    expect(run.stderr).toContain(`local absolute path ${quoted}`)
  })

  test("options --validate fails on a path under the system temp folder with no --local-path", () => {
    const file = join(directory, "review.json")
    const quoted = join(realpathSync(tmpdir()), "round", "probe.json")
    writeFileSync(file, JSON.stringify({ body: `see ${quoted}`, comments: [] }))
    const run = review("options", "--validate", file)
    expect(run.status).toBe(1)
    expect(run.stderr).toContain(`local absolute path ${quoted}`)
  })

  test("options --validate takes extra local folders with --local-path", () => {
    const file = join(directory, "review.json")
    const scratch = join(sep, "srv", "scratch")
    writeFileSync(file, JSON.stringify({ body: `see ${scratch}/out.md`, comments: [] }))
    expect(review("options", "--validate", file).status).toBe(0)
    const run = review("options", "--validate", file, "--local-path", scratch)
    expect(run.status).toBe(1)
    expect(run.stderr).toContain(`local absolute path ${scratch}/out.md`)
  })

  test("options --validate passes and counts the comments", () => {
    const file = join(directory, "review.json")
    writeFileSync(file, JSON.stringify({ body: "ok", comments: [] }))
    const run = review("options", "--validate", file)
    expect(run.stdout.trim()).toBe("ok: 0 comments checked")
  })
})
