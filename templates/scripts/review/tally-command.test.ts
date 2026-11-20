import { spawnSync } from "node:child_process"
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { envWithoutGit } from "../../../scripts/test-env.ts"

const REVIEW = join(import.meta.dirname, "..", "review.ts")
const THREADS = "## T1\n- Thread id: PRRT_one\n\n## T2\n- Thread id: PRRT_two\n"

let root: string
let verdicts: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "tally-"))
  verdicts = join(root, "verdicts")
  mkdirSync(verdicts)
  writeFileSync(join(root, "threads.md"), THREADS)
  writeFileSync(
    join(root, "gh"),
    `#!/usr/bin/env node
const fs = require("node:fs")
const args = process.argv.slice(2)
const bodyArg = args.find((arg) => arg.startsWith("body=@"))
const body = bodyArg ? fs.readFileSync(bodyArg.slice(6), "utf8") : null
fs.appendFileSync(${JSON.stringify(join(root, "calls"))}, JSON.stringify({ args, body }) + "\\n")
console.log("https://github.test/reply")
`,
  )
  chmodSync(join(root, "gh"), 0o755)
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

function verdict(label: string, arbiter: string, kind: string, reason: string) {
  writeFileSync(
    join(verdicts, `${label}-${arbiter}.md`),
    `verdict: ${kind}\nreason: ${reason}\n`,
  )
}

function tally(...labels: string[]) {
  const result = spawnSync(
    process.execPath,
    [REVIEW, "tally", "--threads", join(root, "threads.md"), "--verdicts", verdicts, ...labels],
    {
      encoding: "utf8",
      env: { ...envWithoutGit(), PATH: `${root}:${process.env.PATH}` },
    },
  )
  return { status: result.status, out: result.stdout, err: result.stderr }
}

function calls(): { args: string[]; body: string | null }[] {
  const file = join(root, "calls")
  if (!existsSync(file)) return []
  return readFileSync(file, "utf8").trim().split("\n").map((line) => JSON.parse(line))
}

describe("review.ts tally", () => {
  test("replies with the count and the reasons, then resolves a keep majority", () => {
    verdict("T1", "sonnet", "keep", "the guard is needed")
    verdict("T1", "haiku-1", "keep", "the caller checks it")
    verdict("T1", "haiku-2", "change", "rename it")
    const result = tally("T1")
    expect(result.status).toBe(0)
    expect(result.out).toContain("T1 keep 2/3 https://github.test/reply resolved")
    const [reply, resolve] = calls()
    expect(reply.args).toContain("threadId=PRRT_one")
    expect(reply.body).toContain("2 of 3 arbiters")
    expect(reply.body).toContain("sonnet: the guard is needed")
    expect(reply.body).toContain("haiku-1: the caller checks it")
    expect(reply.body).not.toContain("rename it")
    expect(resolve.args).toContain("threadId=PRRT_one")
    expect(resolve.args.join(" ")).toContain("resolveReviewThread")
  })

  test("prints a change majority for the fixer and posts nothing", () => {
    verdict("T2", "sonnet", "change", "extract the helper")
    verdict("T2", "haiku-1", "change", "same")
    verdict("T2", "haiku-2", "keep", "fine as is")
    const result = tally("T2")
    expect(result.status).toBe(0)
    expect(result.out).toContain("T2 change 2/3 sonnet: extract the helper | haiku-1: same")
    expect(calls()).toEqual([])
  })

  test("leaves a thread with a missing verdict file open and exits 1", () => {
    verdict("T1", "sonnet", "keep", "ok")
    verdict("T1", "haiku-1", "keep", "ok")
    const result = tally("T1")
    expect(result.status).toBe(1)
    expect(result.out).toContain("T1 error: missing verdict file")
    expect(result.out).toContain("T1-haiku-2.md")
    expect(calls()).toEqual([])
  })

  test("reports each thread on its own line", () => {
    verdict("T2", "sonnet", "change", "a")
    verdict("T2", "haiku-1", "change", "b")
    verdict("T2", "haiku-2", "change", "c")
    const result = tally("T1", "T2")
    expect(result.status).toBe(1)
    expect(result.out).toContain("T1 error:")
    expect(result.out).toContain("T2 change 3/3")
  })

  test("refuses a verdict file without a verdict line", () => {
    writeFileSync(join(verdicts, "T1-sonnet.md"), "keep it\n")
    verdict("T1", "haiku-1", "keep", "ok")
    verdict("T1", "haiku-2", "keep", "ok")
    const result = tally("T1")
    expect(result.status).toBe(1)
    expect(result.out).toContain("needs a `verdict: keep|change` line")
  })
})
