import { spawnSync } from "node:child_process"
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { envWithoutGit } from "../../../scripts/test-env.ts"

const SCRIPTS = join(import.meta.dirname, "..")

const FAKE_GH = `#!/usr/bin/env node
const { appendFileSync } = require("node:fs")
const args = process.argv.slice(2).join(" ")
appendFileSync(process.env.FAKE_LOG, JSON.stringify({ args, cwd: process.cwd() }) + "\\n")
const page = { pageInfo: { hasNextPage: false, endCursor: null } }
if (args.startsWith("pr view")) {
  const asked = Number(process.argv[4])
  console.log(JSON.stringify({ number: asked || 7, title: "T", body: "", author: { login: "a" }, url: "https://x/7",
    baseRefName: "main", headRefName: "feat", headRefOid: "abc", closingIssuesReferences: [],
    mergeable: "MERGEABLE", mergeStateStatus: "CLEAN" }))
} else if (args.startsWith("repo view")) {
  console.log(JSON.stringify({ owner: { login: "o" }, name: "r" }))
} else if (args.startsWith("api user")) {
  console.log("me")
} else if (args.startsWith("api graphql")) {
  const threads = JSON.parse(process.env.FAKE_THREADS)
  console.log(JSON.stringify({ data: { repository: { pullRequest: {
    reviewThreads: { ...page, nodes: threads.map(({ bodies, resolved }, index) => ({
      id: "T" + index, isResolved: resolved, isOutdated: false, path: "a.ts", diffSide: "RIGHT", line: 1,
      startLine: null, originalLine: 1,
      comments: { ...page, nodes: bodies.map((body) => ({ author: { login: "x" }, body, url: "u", createdAt: "" })) },
    })) },
    reviews: { ...page, nodes: JSON.parse(process.env.FAKE_REVIEWS).map(({ login, body }) => ({
      author: { login }, state: "COMMENTED", body, url: "u", submittedAt: "" })) },
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

type FakeThread = { bodies: string[]; resolved: boolean }

const open = (...bodies: string[]): FakeThread => ({ bodies, resolved: false })

const resolved = (...bodies: string[]): FakeThread => ({ bodies, resolved: true })

type FakeReview = { login: string; body: string }

function share(threads: FakeThread[], scripts = SCRIPTS, args: string[] = [], reviews: FakeReview[] = []) {
  const result = spawnSync(process.execPath, [join(scripts, "review.ts"), "share", ...args], {
    encoding: "utf8",
    env: {
      ...envWithoutGit(),
      PATH: `${root}:${process.env.PATH}`,
      FAKE_THREADS: JSON.stringify(threads),
      FAKE_REVIEWS: JSON.stringify(reviews),
      FAKE_LOG: join(root, "gh.log"),
    },
  })
  return { status: result.status, out: result.stdout.trimEnd(), err: result.stderr.trimEnd() }
}

function ghCalls(): { args: string; cwd: string }[] {
  return readFileSync(join(root, "gh.log"), "utf8").trim().split("\n").map((line) => JSON.parse(line))
}

describe("review.ts share", () => {
  test("counts a review with no thread as 100% and reaches the goal", () => {
    const result = share([])

    expect(result.status).toBe(0)
    expect(result.out).toContain("share: 100%")
    expect(result.out).toContain("reached: yes")
  })

  test("rates a thread by its state and its first comment, as the skills write them", () => {
    const result = share([
      resolved("issue (blocking): bug in x", "Fixed in abc1234: guard added."),
      open("suggestion (non-blocking): rename", "Not changed: the name is fine."),
      open("⚪ nitpick (non-blocking): spacing"),
    ])

    expect(result.out.split("\n")).toEqual([
      "threads: 3",
      "🟢 1",
      "🟡 1",
      "🔴 0",
      "⚪ 1",
      "share: 50%",
      "goal: 90%",
      "rounds: 0",
      "round limit: 3",
      "reached: no",
    ])
  })

  test("counts an open thread with a blocking label as 🔴 and misses the goal", () => {
    const result = share([open("issue (blocking): bug"), resolved("praise: nice")])

    expect(result.out).toContain("🔴 1")
    expect(result.out).toContain("reached: no")
  })

  test("reaches the goal when every thread of earlier rounds is resolved", () => {
    const result = share([
      resolved("issue (blocking): bug", "Fixed in abc1234: guard added."),
      resolved("suggestion (non-blocking): rename", "Fixed in abc1234: renamed."),
      open("⚪ nitpick (non-blocking): spacing"),
    ])

    expect(result.out).toContain("share: 100%")
    expect(result.out).toContain("reached: yes")
  })

  test("reads the pull request that the argument names", () => {
    share([], SCRIPTS, ["12"])

    const calls = ghCalls().map((call) => call.args)
    expect(calls.some((args) => args.startsWith("pr view 12 "))).toBe(true)
    expect(calls.find((args) => args.startsWith("api graphql"))).toContain("number=12")
  })

  test("runs gh in the directory that --worktree names", () => {
    const worktree = join(root, "other")
    mkdirSync(worktree)
    share([], SCRIPTS, ["--worktree", worktree])

    const calls = ghCalls()
    expect(calls.length > 2).toBe(true)
    for (const call of calls) expect(realpathSync(call.cwd)).toBe(realpathSync(worktree))
  })

  test("prints the rounds that the gh login posted and the round limit", () => {
    const review = "Approve: no blocking finding.\n\n🔴 0 · 🟡 1 · 🟢 0\n\n### Findings"
    const result = share([], SCRIPTS, [], [
      { login: "me", body: review },
      { login: "someone", body: review },
      { login: "someone", body: review },
      { login: "me", body: "" },
      { login: "me", body: review },
      { login: "me", body: "🟢 Gate: approve. No review thread is open." },
      { login: "me", body: review },
    ])

    const lines = result.out.split("\n")
    expect(lines.slice(-3)).toEqual(["rounds: 2", "round limit: 3", "reached: yes"])
  })

  test("reads the goal and the round limit from agents.config.json", () => {
    const scripts = join(root, "repo", "scripts")
    cpSync(SCRIPTS, scripts, { recursive: true, filter: (source) => !source.endsWith(".test.ts") })
    writeFileSync(join(root, "repo", "package.json"), '{"type":"module"}\n')
    writeFileSync(
      join(root, "repo", "agents.config.json"),
      JSON.stringify({ nitro: { goalShare: 0.5, maxRounds: 5 } }),
    )
    const threads = Array.from({ length: 10 }, (_, index) =>
      index < 5 ? resolved("suggestion (non-blocking): ok") : open("suggestion (non-blocking): open"),
    )

    expect(share(threads, scripts).out).toContain("goal: 50%")
    expect(share(threads, scripts).out).toContain("round limit: 5")
    expect(share(threads, scripts).out).toContain("reached: yes")
    expect(share(threads).out).toContain("reached: no")
  })
})
