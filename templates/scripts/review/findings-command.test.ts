import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { homedir, tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"

const SCRIPT = join(import.meta.dirname, "..", "review.ts")

let directory: string

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "findings-command-"))
})

afterEach(() => {
  rmSync(directory, { recursive: true, force: true })
})

function finding(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "B-1",
    severity: "yellow",
    file: "src/a.ts",
    lines: [3],
    label: "suggestion",
    subject: "name it",
    body: "The name hides the unit.",
    "found-by": ["Claude Opus 5.5"],
    ...overrides,
  }
}

function validate(findings: Record<string, unknown>[], ...extra: string[]) {
  const file = join(directory, "review-b.json")
  writeFileSync(file, JSON.stringify({ reviewer: "B", findings, status: [] }))
  return spawnSync(process.execPath, [SCRIPT, "findings", "--validate", file, ...extra], {
    cwd: directory,
    encoding: "utf8",
  })
}

describe("review.ts findings --validate", () => {
  test("prints ok for a file with repo-relative paths only", () => {
    const run = validate([finding({ body: "See src/b.ts:4 and `docs/x.md`." })])

    expect(run.status).toBe(0)
    expect(run.stdout.trim()).toBe("ok: 1 findings checked")
  })

  test("rejects a path under the home folder and names the finding, the field and the path", () => {
    const path = join(homedir(), "work", "repo", "src", "a.ts")
    const run = validate([finding({ id: "B-1" }), finding({ id: "B-2", body: `Read ${path} first.` })])

    expect(run.status).toBe(1)
    expect(run.stderr).toContain(`B-2: body: local absolute path ${path}`)
    expect(run.stderr).not.toContain("B-1")
  })

  test("rejects a path under a folder that --local-path names, such as the repo root", () => {
    const root = join(directory, "repo")
    const path = join(root, "src", "a.ts")
    const run = validate([finding({ file: path })], "--local-path", root)

    expect(run.status).toBe(1)
    expect(run.stderr).toContain(`B-1: file: local absolute path ${path}`)
  })

  test("checks the subject, the suggestion and each option", () => {
    const home = homedir()
    const run = validate([
      finding({
        subject: `rename in ${home}/a.ts`,
        suggestion: `// ${home}/b.ts`,
        options: [`fix at ${home}/c.ts`, "second fix"],
      }),
    ])

    expect(run.status).toBe(1)
    expect(run.stderr).toContain(`B-1: subject: local absolute path ${home}/a.ts`)
    expect(run.stderr).toContain(`B-1: suggestion: local absolute path ${home}/b.ts`)
    expect(run.stderr).toContain(`B-1: options[0]: local absolute path ${home}/c.ts`)
  })
})
