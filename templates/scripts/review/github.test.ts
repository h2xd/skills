import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { fetchReviewData, viewPullRequest } from "./github.ts"

const FAKE_GH = `#!/usr/bin/env node
const { appendFileSync, readFileSync } = require("node:fs")
const args = process.argv.slice(2)
appendFileSync(process.env.FAKE_GH_LOG, JSON.stringify(args) + "\\n")
if (args[0] === "pr") {
  console.log("{}")
  process.exit(0)
}
const value = (name) => {
  const flag = args.findIndex((arg, i) => /^-[fF]$/.test(arg) && args[i + 1].startsWith(name + "="))
  return flag === -1 ? "" : args[flag + 1].slice(name.length + 1)
}
const query = value("query")
const pages = JSON.parse(readFileSync(process.env.FAKE_GH_PAGES, "utf8"))
const kind = value("threadId")
  ? "comments:" + value("threadId")
  : query.includes("reviewThreads")
    ? "threads"
    : query.includes("reviews(")
      ? "reviews"
      : "prcomments"
const key = kind + ":" + value("after")
if (!(key in pages)) {
  console.error("no fake page " + key)
  process.exit(1)
}
console.log(JSON.stringify(pages[key]))
`

const comment = (thread: string, n: number) => ({
  author: { login: "bot" },
  body: `${thread}-${n}`,
  url: `https://x/${thread}-${n}`,
  createdAt: "2026-01-01T00:00:00Z",
})

const thread = (id: string, comments: number, next: string | null) => ({
  id,
  isResolved: false,
  isOutdated: false,
  path: "a.ts",
  diffSide: "RIGHT",
  line: 1,
  startLine: null,
  originalLine: 1,
  comments: {
    pageInfo: { hasNextPage: next !== null, endCursor: next },
    nodes: Array.from({ length: comments }, (_, n) => comment(id, n)),
  },
})

const threadsPage = (nodes: unknown[], next: string | null) => ({
  data: {
    repository: {
      pullRequest: {
        reviewThreads: { pageInfo: { hasNextPage: next !== null, endCursor: next }, nodes },
      },
    },
  },
})

const summaryPage = (field: string, nodes: unknown[], next: string | null) => ({
  data: {
    repository: {
      pullRequest: {
        [field]: { pageInfo: { hasNextPage: next !== null, endCursor: next }, nodes },
      },
    },
  },
})

const review = (n: number) => ({
  author: { login: "bot" },
  state: "COMMENTED",
  body: `review ${n}`,
  url: `https://x/review-${n}`,
  submittedAt: "2026-01-01T00:00:00Z",
})

const commentsPage = (id: string, from: number, count: number, next: string | null) => ({
  data: {
    node: {
      comments: {
        pageInfo: { hasNextPage: next !== null, endCursor: next },
        nodes: Array.from({ length: count }, (_, n) => comment(id, from + n)),
      },
    },
  },
})

let directory: string
let savedPath: string | undefined

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "fake-gh-"))
  writeFileSync(join(directory, "gh"), FAKE_GH)
  chmodSync(join(directory, "gh"), 0o755)
  savedPath = process.env.PATH
  process.env.PATH = `${directory}:${savedPath}`
  process.env.FAKE_GH_PAGES = join(directory, "pages.json")
  process.env.FAKE_GH_LOG = join(directory, "calls.log")
  writeFileSync(process.env.FAKE_GH_LOG, "")
})

afterEach(() => {
  process.env.PATH = savedPath
  delete process.env.FAKE_GH_PAGES
  delete process.env.FAKE_GH_LOG
  rmSync(directory, { recursive: true, force: true })
})

function servePages(pages: Record<string, unknown>) {
  const summaries = {
    "threads:": threadsPage([], null),
    "reviews:": summaryPage("reviews", [], null),
    "prcomments:": summaryPage("comments", [{ body: "top" }], null),
  }
  writeFileSync(join(directory, "pages.json"), JSON.stringify({ ...summaries, ...pages }))
}

function calls(): string[][] {
  return readFileSync(process.env.FAKE_GH_LOG as string, "utf8")
    .trim()
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => JSON.parse(line))
}

function queriesContaining(text: string): string[] {
  return calls()
    .flatMap((args) => args.filter((arg) => arg.startsWith("query=")))
    .filter((query) => query.includes(text))
}

describe("fetchReviewData", () => {
  test("reads every review thread past 100, page by page", () => {
    const first = Array.from({ length: 100 }, (_, n) => thread(`t${n}`, 1, null))
    const second = Array.from({ length: 30 }, (_, n) => thread(`t${100 + n}`, 1, null))
    servePages({
      "threads:": threadsPage(first, "c1"),
      "threads:c1": threadsPage(second, null),
    })
    const { threads, comments } = fetchReviewData("o", "r", 1)
    expect(threads).toHaveLength(130)
    expect(threads[129].id).toBe("t129")
    expect(comments).toEqual(["top"])
  })

  test("reads review threads across three pages", () => {
    servePages({
      "threads:": threadsPage([thread("t0", 1, null)], "c1"),
      "threads:c1": threadsPage([thread("t1", 1, null)], "c2"),
      "threads:c2": threadsPage([thread("t2", 1, null)], null),
    })
    const { threads } = fetchReviewData("o", "r", 1)
    expect(threads.map((item) => item.id)).toEqual(["t0", "t1", "t2"])
  })

  test("reads the comments of a thread across three pages", () => {
    servePages({
      "threads:": threadsPage([thread("t0", 100, "k1")], null),
      "comments:t0:k1": commentsPage("t0", 100, 100, "k2"),
      "comments:t0:k2": commentsPage("t0", 200, 5, null),
    })
    const { threads } = fetchReviewData("o", "r", 1)
    expect(threads[0].comments.nodes).toHaveLength(205)
    expect(threads[0].comments.nodes[204].body).toBe("t0-204")
  })

  test("reads every comment of a thread past 100", () => {
    servePages({
      "threads:": threadsPage([thread("t0", 100, "k1"), thread("t1", 2, null)], null),
      "comments:t0:k1": commentsPage("t0", 100, 20, null),
    })
    const { threads } = fetchReviewData("o", "r", 1)
    expect(threads).toHaveLength(2)
    expect(threads[0].comments.nodes).toHaveLength(120)
    expect(threads[0].comments.nodes[119].body).toBe("t0-119")
    expect(threads[1].comments.nodes).toHaveLength(2)
  })
})

describe("the review summary data", () => {
  test("returns the reviews of the pull request", () => {
    servePages({ "reviews:": summaryPage("reviews", [review(1)], null) })
    expect(fetchReviewData("o", "r", 1).reviews).toEqual([review(1)])
  })

  test("reads every review past 100, with its own cursor", () => {
    servePages({
      "reviews:": summaryPage("reviews", [review(1)], "r1"),
      "reviews:r1": summaryPage("reviews", [review(2)], "r2"),
      "reviews:r2": summaryPage("reviews", [review(3)], null),
    })
    expect(fetchReviewData("o", "r", 1).reviews.map((item) => item.body)).toEqual([
      "review 1",
      "review 2",
      "review 3",
    ])
  })

  test("reads every pull request comment past 100, with its own cursor", () => {
    servePages({
      "prcomments:": summaryPage("comments", [{ body: "one" }], "p1"),
      "prcomments:p1": summaryPage("comments", [{ body: "two" }], null),
    })
    expect(fetchReviewData("o", "r", 1).comments).toEqual(["one", "two"])
  })

  test("returns all 101 reviews and 101 pull request comments over two pages", () => {
    servePages({
      "reviews:": summaryPage("reviews", Array.from({ length: 100 }, (_, n) => review(n)), "r1"),
      "reviews:r1": summaryPage("reviews", [review(100)], null),
      "prcomments:": summaryPage(
        "comments",
        Array.from({ length: 100 }, (_, n) => ({ body: `c${n}` })),
        "p1",
      ),
      "prcomments:p1": summaryPage("comments", [{ body: "c100" }], null),
    })
    const data = fetchReviewData("o", "r", 1)
    expect(data.reviews).toHaveLength(101)
    expect(data.comments).toHaveLength(101)
  })

  test("asks for the reviews and the comments once, not on every thread page", () => {
    servePages({
      "threads:": threadsPage([thread("t0", 1, null)], "c1"),
      "threads:c1": threadsPage([thread("t1", 1, null)], null),
    })
    fetchReviewData("o", "r", 1)
    expect(queriesContaining("reviews(")).toHaveLength(1)
    expect(queriesContaining("pullRequest(number: $number) {\n      comments(")).toHaveLength(1)
    expect(queriesContaining("reviewThreads")).toHaveLength(2)
  })
})

describe("the GraphQL queries", () => {
  const flat = (query: string) => query.replace(/\s+/g, " ")
  const PAGE_INFO = "{ pageInfo { hasNextPage endCursor }"

  test("ask for pageInfo in the thread and the comment selections", () => {
    servePages({
      "threads:": threadsPage([thread("t0", 100, "k1")], null),
      "comments:t0:k1": commentsPage("t0", 100, 1, null),
    })
    fetchReviewData("o", "r", 1)
    const threadsQuery = flat(queriesContaining("reviewThreads")[0])
    expect(threadsQuery).toContain(`reviewThreads(first: 100, after: $after) ${PAGE_INFO}`)
    expect(threadsQuery).toContain(`comments(first: 100) ${PAGE_INFO}`)
    const commentsQuery = flat(queriesContaining("on PullRequestReviewThread")[0])
    expect(commentsQuery).toContain(`comments(first: 100, after: $after) ${PAGE_INFO}`)
  })

  test("ask for the reviews with a cursor, page info and every field a review reads", () => {
    servePages({})
    fetchReviewData("o", "r", 1)
    const query = flat(queriesContaining("reviews(")[0])
    expect(query).toContain(`reviews(first: 100, after: $after) ${PAGE_INFO}`)
    const nodes = query.match(/nodes \{(.*)\} \} \} \}/)?.[1] ?? ""
    for (const field of ["author { login }", "state", "body", "url", "submittedAt"]) {
      expect(nodes).toContain(field)
    }
  })

  test("ask for the pull request comments with a cursor and page info", () => {
    servePages({})
    fetchReviewData("o", "r", 1)
    const query = flat(queriesContaining("pullRequest(number: $number) {\n      comments(")[0])
    expect(query).toContain(`comments(first: 100, after: $after) ${PAGE_INFO}`)
    expect(query).toContain("nodes { body }")
  })

  test("ask for the start side of a thread", () => {
    servePages({ "threads:": threadsPage([], null) })
    fetchReviewData("o", "r", 1)
    expect(queriesContaining("reviewThreads")[0]).toContain("startDiffSide")
  })

  test("pass the thread id as a typed -F field", () => {
    servePages({
      "threads:": threadsPage([thread("t0", 100, "k1")], null),
      "comments:t0:k1": commentsPage("t0", 100, 1, null),
    })
    fetchReviewData("o", "r", 1)
    const call = calls().find((args) => args.includes("threadId=t0")) as string[]
    expect(call[call.indexOf("threadId=t0") - 1]).toBe("-F")
  })

  test("ask gh pr view for the merge state fields", () => {
    viewPullRequest(undefined)
    const call = calls().find((args) => args[0] === "pr") as string[]
    const fields = call[call.indexOf("--json") + 1].split(",")
    expect(fields).toContain("mergeable")
    expect(fields).toContain("mergeStateStatus")
  })
})
