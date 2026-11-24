import { spawnSync } from "node:child_process"
import { chmodSync, cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { envWithoutGit } from "../../../scripts/test-env.ts"

const SCRIPTS = join(import.meta.dirname, "..")

const FAKE_GH = `#!/usr/bin/env node
const args = process.argv.slice(2).join(" ")
const page = { pageInfo: { hasNextPage: false, endCursor: null } }
if (args.startsWith("pr view")) {
  console.log(JSON.stringify({ number: 7, title: "T", body: "", author: { login: "a" }, url: "https://x/7",
    baseRefName: "main", headRefName: "feat", headRefOid: "abc", closingIssuesReferences: [],
    mergeable: "MERGEABLE", mergeStateStatus: "CLEAN" }))
} else if (args.startsWith("repo view")) {
  console.log(JSON.stringify({ owner: { login: "o" }, name: "r" }))
} else if (args.startsWith("api graphql")) {
  const threads = JSON.parse(process.env.FAKE_THREADS)
  console.log(JSON.stringify({ data: { repository: { pullRequest: {
    reviewThreads: { ...page, nodes: threads.map((bodies, index) => ({
      id: "T" + index, isResolved: false, isOutdated: false, path: "a.ts", diffSide: "RIGHT", line: 1,
      startLine: null, originalLine: 1,
      comments: { ...page, nodes: bodies.map((body) => ({ author: { login: "x" }, body, url: "u", createdAt: "" })) },
    })) },
    reviews: { ...page, nodes: [] },
    comments: { ...page, nodes: [] },
  } } } }))
} else {
  console.error("fake gh: " + args)
  process.exit(1)
}
`

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "share-"))
  writeFileSync(join(root, "gh"), FAKE_GH)
  chmodSync(join(root, "gh"), 0o755)
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

function share(threads: string[][], scripts = SCRIPTS) {
  const result = spawnSync(process.execPath, [join(scripts, "review.ts"), "share"], {
    encoding: "utf8",
    env: {
      ...envWithoutGit(),
      PATH: `${root}:${process.env.PATH}`,
      FAKE_THREADS: JSON.stringify(threads),
    },
  })
  return { status: result.status, out: result.stdout.trimEnd(), err: result.stderr.trimEnd() }
}

describe("review.ts share", () => {
  test("counts a review with no thread as 100% and reaches the goal", () => {
    const result = share([])

    expect(result.status).toBe(0)
    expect(result.out).toContain("share: 100%")
    expect(result.out).toContain("reached: yes")
  })

  test("rates each thread by its last marker and leaves ⚪ out", () => {
    const result = share([
      ["🔴 bug", "🟢 Fixed in abc"],
      ["🟡 hmm", "🟢 Kept: 2 of 3"],
      ["⚪ nit"],
    ])

    expect(result.out.split("\n")).toEqual([
      "threads: 3",
      "🟢 2",
      "🟡 0",
      "🔴 0",
      "⚪ 1",
      "share: 100%",
      "goal: 90%",
      "reached: yes",
    ])
  })

  test("misses the goal while one thread is 🔴", () => {
    const result = share([["🔴 bug"], ["🟢 ok"]])

    expect(result.out).toContain("🔴 1")
    expect(result.out).toContain("reached: no")
  })

  test("reads the goal from agents.config.json", () => {
    const scripts = join(root, "repo", "scripts")
    cpSync(SCRIPTS, scripts, { recursive: true, filter: (source) => !source.endsWith(".test.ts") })
    writeFileSync(join(root, "repo", "package.json"), '{"type":"module"}\n')
    writeFileSync(
      join(root, "repo", "agents.config.json"),
      JSON.stringify({ nitro: { goalShare: 0.5 } }),
    )
    const threads = Array.from({ length: 10 }, (_, index) => [index < 5 ? "🟢 ok" : "🟡 open"])

    expect(share(threads, scripts).out).toContain("goal: 50%")
    expect(share(threads, scripts).out).toContain("reached: yes")
    expect(share(threads).out).toContain("reached: no")
  })
})
