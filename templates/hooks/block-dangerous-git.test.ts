import { spawnSync } from "node:child_process"
import { mkdtempSync, symlinkSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { beforeEach, describe, test } from "node:test"
import { expect } from "../../scripts/expect.ts"

const HOOK = join(import.meta.dirname, "block-dangerous-git.sh")

/** A PATH with the tools the hook needs, and no jq, so the fallback runs. */
function pathWithoutJq(): string {
  const dir = mkdtempSync(join(tmpdir(), "no-jq-"))
  for (const tool of ["cat", "sed", "grep"]) {
    const found = spawnSync("sh", ["-c", `command -v ${tool}`], { encoding: "utf8" }).stdout.trim()
    symlinkSync(found, join(dir, tool))
  }
  return dir
}

const NO_JQ = pathWithoutJq()
let path = process.env.PATH ?? ""

/** The hook's exit code for one shell command: 0 lets it run, 2 blocks it. */
function verdict(command: string, ...flags: string[]): number {
  const input = JSON.stringify({ tool_input: { command } })
  const sh = spawnSync("sh", ["-c", "command -v sh"], { encoding: "utf8" }).stdout.trim()
  return spawnSync(sh, [HOOK, ...flags], { input, encoding: "utf8", env: { ...process.env, PATH: path } }).status ?? -1
}

for (const [mode, modePath] of [["with jq on PATH", process.env.PATH ?? ""], ["without jq", NO_JQ]] as const) {
  describe(`block-dangerous-git.sh ${mode}`, () => {
    beforeEach(() => {
      path = modePath
    })

    test("blocks the commands that lose work", () => {
      for (const command of [
        "git reset --hard",
        "git clean -fd",
        "git branch -D old-idea",
        "git checkout .",
        "git restore .",
        "git -C ../snack-drawer push",
      ]) {
        expect(`${command}: ${verdict(command)}`).toBe(`${command}: 2`)
      }
    })

    test("lets safe commands through", () => {
      for (const command of [
        "git status",
        "git commit -m nap",
        "git branch -d merged-idea",
        "git clean -n",
        "git restore --staged cat.txt",
        "git status; echo --hard",
      ]) {
        expect(`${command}: ${verdict(command)}`).toBe(`${command}: 0`)
      }
    })

    test("allows a plain push with --allow-push, never a force push", () => {
      expect(verdict("git push", "--allow-push")).toBe(0)
      expect(verdict("git push --force", "--allow-push")).toBe(2)
      expect(verdict("git push origin +main", "--allow-push")).toBe(2)
    })
  })
}
