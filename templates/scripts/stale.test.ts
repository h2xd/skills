import { spawnSync } from "node:child_process"
import { describe, test } from "node:test"
import { join } from "node:path"
import { expect } from "../../scripts/expect.ts"

const STALE = "re-run setup, this copy is older than the skill"

function runScript(script: string, ...args: string[]) {
  const file = join(import.meta.dirname, script)
  const command = script.endsWith(".sh") ? "sh" : process.execPath
  return spawnSync(command, [file, ...args], { encoding: "utf8" })
}

describe("an unknown subcommand or option", () => {
  const cases: [string, string[]][] = [
    ["review.ts", ["no-such-subcommand"]],
    ["review.ts", ["context", "--no-such-option"]],
    ["implement.ts", ["no-such-subcommand"]],
    ["implement.ts", ["worktree", "--no-such-option"]],
    ["find-docs.ts", ["--no-such-option"]],
    ["resolve-docs.ts", ["--no-such-option"]],
    ["lint-commit-message.ts", ["--no-such-option"]],
    ["prove-tests.sh", ["--no-such-option", "x"]],
  ]
  for (const [script, args] of cases) {
    test(`makes ${script} ${args.join(" ")} print the re-run setup line`, () => {
      const run = runScript(script, ...args)
      expect(run.status === 0).toBe(false)
      expect(run.stderr).toContain(STALE)
    })
  }

  test("does not flag the --base option of resolve-docs.ts", () => {
    const run = runScript("resolve-docs.ts", "--base", "main")
    expect(run.stderr).not.toContain(STALE)
  })

  test("leaves the usage line in place for the subcommand check", () => {
    const run = runScript("review.ts")
    expect(run.status).toBe(1)
    expect(run.stderr).toContain("usage: node scripts/review.ts <")
    expect(run.stderr).not.toContain(STALE)
  })
})
