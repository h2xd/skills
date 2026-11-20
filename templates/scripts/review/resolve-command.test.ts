import { spawnSync } from "node:child_process"
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { envWithoutGit } from "../../../scripts/test-env.ts"

const REVIEW = join(import.meta.dirname, "..", "review.ts")

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "resolve-"))
  writeFileSync(
    join(root, "gh"),
    `#!/usr/bin/env node\nrequire("node:fs").writeFileSync(${JSON.stringify(join(root, "called"))}, process.argv.slice(2).join(" "))\n`,
  )
  chmodSync(join(root, "gh"), 0o755)
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

function resolve(...args: string[]) {
  const result = spawnSync(process.execPath, [REVIEW, "resolve", ...args], {
    encoding: "utf8",
    env: { ...envWithoutGit(), PATH: `${root}:${process.env.PATH}` },
  })
  return { status: result.status, out: result.stdout, err: result.stderr }
}

describe("review.ts resolve", () => {
  test("prints its usage line for a PR number, before any gh call", () => {
    const result = resolve("104")
    expect(result.status).toBe(1)
    expect(result.err).toContain(
      "usage: node scripts/review.ts resolve [--threads <threads.md>]",
    )
    expect(existsSync(join(root, "called"))).toBe(false)
  })

  test("sends a thread id to gh", () => {
    const result = resolve("PRRT_kwDOVdbSc8636k-a")
    expect(result.status).toBe(0)
    expect(result.out).toContain("PRRT_kwDOVdbSc8636k-a resolved")
    expect(existsSync(join(root, "called"))).toBe(true)
  })
})
