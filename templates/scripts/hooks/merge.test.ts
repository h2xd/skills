import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { type HookInput, planHook } from "./merge.ts"

const TEMPLATES = join(import.meta.dirname, "..", "..", "githooks")
const EARLIER = join(import.meta.dirname, "..", "..", "githooks-earlier")

function shParses(script: string): boolean {
  const directory = mkdtempSync(join(tmpdir(), "merge-"))
  try {
    writeFileSync(join(directory, "s"), script)
    return spawnSync("sh", ["-n", join(directory, "s")]).status === 0
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

const plan = (input: Partial<HookInput>) =>
  planHook({ repoHook: "x\n", template: "#!/bin/sh\nnew\n", earlier: [], localExists: false, parses: () => true, ...input })

describe("planHook", () => {
  test("copy when the repo has no hook", () => {
    expect(plan({ repoHook: null })).toEqual({ kind: "copy" })
  })

  test("same when the repo hook equals the template, CRLF included", () => {
    expect(plan({ repoHook: "#!/bin/sh\r\nnew\r\n" })).toEqual({ kind: "same" })
  })

  test("replace-unedited when the repo hook equals an earlier template", () => {
    expect(plan({ repoHook: "#!/bin/sh\nold\n", earlier: ["#!/bin/sh\nold\n"] })).toEqual({ kind: "replace-unedited" })
  })

  test("replace-unedited when no line is extra", () => {
    expect(plan({ repoHook: "#!/bin/sh\n\nnew   \n" })).toEqual({ kind: "replace-unedited" })
  })

  test("move writes the extra lines in order, without blank lines or the shebang", () => {
    const result = plan({ repoHook: "#!/bin/sh\nb\n\nnew\na\n" })
    expect(result).toEqual({ kind: "move", local: "#!/bin/sh\nb\na\n" })
  })

  test("ask when 50-local exists", () => {
    expect(plan({ localExists: true })).toEqual({ kind: "ask", local: "#!/bin/sh\nx\n" })
  })

  test("manual when the extra lines do not parse alone", () => {
    expect(plan({ repoHook: "if true; then\n", parses: shParses })).toEqual({ kind: "manual", lines: ["if true; then"] })
  })
})

describe("the shipped hooks", () => {
  for (const hook of ["commit-msg", "pre-commit"]) {
    const template = readFileSync(join(TEMPLATES, hook), "utf8")
    const earlier = readFileSync(join(EARLIER, hook), "utf8")

    test(`the 0.16 ${hook} is unedited`, () => {
      const result = planHook({ repoHook: earlier, template, earlier: [earlier], localExists: false, parses: shParses })
      expect(result).toEqual({ kind: "replace-unedited" })
    })
  }

  test("an edited 0.16 commit-msg moves its one added line", () => {
    const template = readFileSync(join(TEMPLATES, "commit-msg"), "utf8")
    const earlier = readFileSync(join(EARLIER, "commit-msg"), "utf8")
    const result = planHook({
      repoHook: `${earlier}npm run lint:extra\n`,
      template,
      earlier: [earlier],
      localExists: false,
      parses: shParses,
    })
    expect(result).toEqual({ kind: "move", local: "#!/bin/sh\nnpm run lint:extra\n" })
    if (result.kind === "move") expect(shParses(result.local)).toBe(true)
  })

  test("extra lines with an unclosed if need a hand merge", () => {
    const template = readFileSync(join(TEMPLATES, "commit-msg"), "utf8")
    const earlier = readFileSync(join(EARLIER, "commit-msg"), "utf8")
    const result = planHook({
      repoHook: `${earlier}if [ -f x ]; then\n`,
      template,
      earlier: [earlier],
      localExists: false,
      parses: shParses,
    })
    expect(result).toEqual({ kind: "manual", lines: ["if [ -f x ]; then"] })
  })
})
