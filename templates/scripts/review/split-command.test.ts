import { spawnSync } from "node:child_process"
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
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

  test("--out also writes plan-<id>.md next to it for each fixer and names them", () => {
    writeFileSync(
      join(root, "plan.md"),
      [
        "Plan of PR 5",
        "",
        "| id | bucket | where | change | group |",
        "|---|---|---|---|---|",
        ...Array.from({ length: 8 }, (_, i) => `| T${i + 1} | fix | src/f${i}.ts:1 | x | ${i < 4 ? "left" : "right"} |`),
      ].join("\n"),
    )
    mkdirSync(join(root, "out"))
    const result = split(2, "--out", join(root, "out", "split.md"))

    expect(result.status).toBe(0)
    expect(result.out.trim()).toBe(
      `2 fixer workers: wrote ${join(root, "out", "split.md")}, ${join(root, "out", "plan-1.md")}, ${join(root, "out", "plan-2.md")}`,
    )
    const first = readFileSync(join(root, "out", "plan-1.md"), "utf8")
    const second = readFileSync(join(root, "out", "plan-2.md"), "utf8")
    expect(first).toContain("Plan of PR 5")
    expect(first).toContain("| id | bucket |")
    expect(first.match(/^\| T\d/gm)).toHaveLength(4)
    expect(first).toContain("| T1 |")
    expect(first).not.toContain("| T5 |")
    expect(second).toContain("| T5 |")
    expect(second).not.toContain("| T1 |")
  })

  test("without --out it writes no plan file", () => {
    const result = split(2)

    expect(result.status).toBe(0)
    expect(result.out).toContain("## Fixer worker 1")
  })
})
