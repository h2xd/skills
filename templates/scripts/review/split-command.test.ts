import { spawnSync } from "node:child_process"
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { envWithoutGit } from "../../../scripts/test-env.ts"

const SCRIPTS = join(import.meta.dirname, "..")

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "split-"))
  cpSync(SCRIPTS, join(root, "scripts"), {
    recursive: true,
    filter: (source) => !source.endsWith(".test.ts"),
  })
  writeFileSync(join(root, "package.json"), '{"type":"module"}\n')
  const ids = Array.from({ length: 8 }, (_, i) => `T${i + 1}`)
  writeFileSync(
    join(root, "threads.md"),
    ids.map((id) => `## ${id}\n- Thread id: x\n`).join("\n"),
  )
  writeFileSync(
    join(root, "plan.md"),
    ids.map((id, i) => `| ${id} | fix | src/f${i}.ts:1 | x |`).join("\n"),
  )
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

function split(fixMaxWorkers: number, ...extra: string[]) {
  writeFileSync(
    join(root, "agents.config.json"),
    `${JSON.stringify({ review: { fixMaxWorkers } })}\n`,
  )
  const result = spawnSync(
    process.execPath,
    [join(root, "scripts", "review.ts"), "split", "threads.md", "plan.md", ...extra],
    { cwd: root, encoding: "utf8", env: envWithoutGit() },
  )
  return { status: result.status, out: result.stdout }
}

describe("review.ts split", () => {
  test("review.fixMaxWorkers 1 gives one worker for 8 items", () => {
    const result = split(1)
    expect(result.status).toBe(0)
    expect(result.out).toContain("- Fixer workers: 1")
  })

  test("review.fixMaxWorkers 8 gives two workers for 8 items", () => {
    expect(split(8).out).toContain("- Fixer workers: 2")
  })

  test("--out writes the split to the file", () => {
    const result = split(3, "--out", "split.md")
    expect(result.status).toBe(0)
    expect(readFileSync(join(root, "split.md"), "utf8")).toContain("- Fixer workers:")
  })
})
