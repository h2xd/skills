import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import { fetchReviewData } from "./github.ts"

/**
 * A `gh` that answers the review data queries from fake pages. A page is keyed
 * `threads:<cursor>` or `comments:<thread id>:<cursor>`, with an empty cursor
 * for the first page.
 */
const FAKE_GH = `#!/usr/bin/env node
const { readFileSync } = require("node:fs")
const args = process.argv.slice(2)
const value = (name) => {
  const flag = args.findIndex((arg, i) => /^-[fF]$/.test(arg) && args[i + 1].startsWith(name + "="))
  return flag === -1 ? "" : args[flag + 1].slice(name.length + 1)
}
const pages = JSON.parse(readFileSync(process.env.FAKE_GH_PAGES, "utf8"))
const key = value("threadId")
  ? "comments:" + value("threadId") + ":" + value("after")
  : "threads:" + value("after")
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
        reviews: { nodes: [] },
        comments: { nodes: [{ body: "top" }] },
      },
    },
  },
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
})

afterEach(() => {
  process.env.PATH = savedPath
  delete process.env.FAKE_GH_PAGES
  rmSync(directory, { recursive: true, force: true })
})

function servePages(pages: Record<string, unknown>) {
  writeFileSync(join(directory, "pages.json"), JSON.stringify(pages))
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
