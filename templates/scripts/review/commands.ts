/** The subcommands of `node scripts/review.ts`. Each takes its argv tail and does the I/O. */

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { parseArgs } from "node:util"
import { config } from "../config.ts"
import { type ContextData, formatContext } from "./context.ts"
import { formatFleet, parseNumstat, parseRaw, pickFleet } from "./fleet.ts"
import {
  authenticatedLogin,
  commentOnPullRequest,
  fetchReviewData,
  repositoryName,
  replyToThread,
  resolveThread,
  viewIssue,
  viewPullRequest,
} from "./github.ts"
import { type DraftComment, validateDraftComments } from "./options.ts"
import { planReplies, postReplies } from "./reply.ts"
import { resolveThreads } from "./resolve.ts"
import { run, runAllowingFailure } from "./shell.ts"
import { formatThreadsDocument, summaryItems } from "./threads.ts"
import { collectWarnings, formatWarnings } from "./warnings.ts"
import {
  findWorktreeForBranch,
  newWorktreePath,
  parseWorktreeList,
} from "./worktree.ts"

function emit(text: string, outputFile?: string): void {
  if (outputFile) {
    writeFileSync(outputFile, text)
    console.log(`wrote ${outputFile}`)
  } else {
    process.stdout.write(text.endsWith("\n") ? text : `${text}\n`)
  }
}

function requireArgument(value: string | undefined, usage: string): string {
  if (!value) throw new Error(`usage: node scripts/review.ts ${usage}`)
  return value
}

function listWorktrees() {
  return parseWorktreeList(run(["git", "worktree", "list", "--porcelain"]))
}

function updateExistingWorktree(path: string): void {
  const status = run(["git", "-C", path, "status", "--short"])
  if (status.trim() !== "") {
    console.error(`review: ${path} has uncommitted changes, left without pull`)
    return
  }
  run(["git", "-C", path, "pull", "--ff-only"])
}

function createWorktree(mainWorktree: string, branch: string): string {
  const path = newWorktreePath(mainWorktree, branch)
  run(["git", "fetch", "origin", branch])
  const localBranchExists =
    runAllowingFailure([
      "git",
      "show-ref",
      "--verify",
      "--quiet",
      `refs/heads/${branch}`,
    ]).exitCode === 0
  run(
    localBranchExists
      ? ["git", "worktree", "add", path, branch]
      : [
          "git",
          "worktree",
          "add",
          "--track",
          "-b",
          branch,
          path,
          `origin/${branch}`,
        ],
  )
  for (const command of config.worktreeSetup) run(command, path)
  return path
}

export function worktreeCommand(argv: string[]): void {
  const { positionals } = parseArgs({ args: argv, allowPositionals: true })
  const branch = requireArgument(positionals[0], "worktree <branch>")
  const entries = listWorktrees()
  const existing = findWorktreeForBranch(entries, branch)
  if (existing) {
    updateExistingWorktree(existing.path)
    console.log(existing.path)
    return
  }
  console.log(createWorktree(entries[0].path, branch))
}

function docsRecordsFor(worktree: string, file: string): string[] {
  const result = runAllowingFailure(
    ["node", "scripts/find-docs.ts", "--links-to", file],
    worktree,
  )
  // docs:find exits 1 when no page links to the file.
  if (result.exitCode === 1) return []
  if (result.exitCode !== 0) {
    throw new Error(`docs:find failed for ${file}: ${result.stderr.trim()}`)
  }
  return result.stdout.split("\n").filter((line) => line.trim() !== "")
}

function gatherContext(
  pullRequestArgument: string | undefined,
  worktree: string,
) {
  const pullRequest = viewPullRequest(pullRequestArgument, worktree)
  const { owner, name } = repositoryName(worktree)
  run(["git", "-C", worktree, "fetch", "origin", pullRequest.baseRefName])
  const range = `origin/${pullRequest.baseRefName}...HEAD`
  const changedFiles = run([
    "git",
    "-C",
    worktree,
    "diff",
    "--name-only",
    range,
  ])
    .split("\n")
    .filter((file) => file !== "")
  const data: ContextData = {
    pullRequest,
    repository: `${owner}/${name}`,
    login: authenticatedLogin(worktree),
    worktree,
    localHead: run(["git", "-C", worktree, "rev-parse", "HEAD"]),
    currentBranch: run(["git", "-C", worktree, "branch", "--show-current"]),
    status: run(["git", "-C", worktree, "status", "--short"]),
    diffStat: run(["git", "-C", worktree, "diff", "--stat", range]),
    changedFiles,
    issues: pullRequest.closingIssuesReferences.map((issue) =>
      viewIssue(issue.number, worktree),
    ),
    recordsByFile: new Map(
      changedFiles.map((file) => [file, docsRecordsFor(worktree, file)]),
    ),
    threads: fetchReviewData(owner, name, pullRequest.number, worktree).threads,
  }
  return data
}

export function contextCommand(argv: string[]): void {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { worktree: { type: "string" }, out: { type: "string" } },
  })
  const worktree = resolve(values.worktree ?? process.cwd())
  const data = gatherContext(positionals[0], worktree)
  const warnings = collectWarnings({
    headRefName: data.pullRequest.headRefName,
    headRefOid: data.pullRequest.headRefOid,
    localHead: data.localHead,
    status: data.status,
    currentBranch: data.currentBranch,
  })
  emit(formatContext(data, formatWarnings(warnings)), values.out)
}

export function threadsCommand(argv: string[]): void {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { worktree: { type: "string" }, out: { type: "string" } },
  })
  const worktree = values.worktree ? resolve(values.worktree) : undefined
  const pullRequest = viewPullRequest(positionals[0], worktree)
  const { owner, name } = repositoryName(worktree)
  const { threads, reviews } = fetchReviewData(
    owner,
    name,
    pullRequest.number,
    worktree,
  )
  const warnings = worktree
    ? collectWarnings({
        headRefName: pullRequest.headRefName,
        headRefOid: pullRequest.headRefOid,
        localHead: run(["git", "-C", worktree, "rev-parse", "HEAD"]),
        status: run(["git", "-C", worktree, "status", "--short"]),
      })
    : []
  emit(
    formatThreadsDocument({
      header: {
        number: pullRequest.number,
        url: pullRequest.url,
        headRefName: pullRequest.headRefName,
        headRefOid: pullRequest.headRefOid,
        baseRefName: pullRequest.baseRefName,
        owner,
        name,
      },
      warningsSection: formatWarnings(warnings),
      threads,
      items: summaryItems(reviews),
    }),
    values.out,
  )
}

export function replyCommand(argv: string[]): void {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      sha: { type: "string" },
      threads: { type: "string" },
      "dry-run": { type: "boolean" },
    },
  })
  const usage = "reply <pr> <replies.md> --sha <sha> --threads <threads.md>"
  const pullRequest = requireArgument(positionals[0], usage)
  const repliesFile = requireArgument(positionals[1], usage)
  const threadsFile = requireArgument(values.threads, usage)

  const plan = planReplies({
    repliesMarkdown: readFileSync(repliesFile, "utf8"),
    threadsMarkdown: readFileSync(threadsFile, "utf8"),
    sha: values.sha,
  })
  const lines = postReplies(
    plan,
    {
      replyToThread,
      commentOnPullRequest: (body) => commentOnPullRequest(pullRequest, body),
    },
    values["dry-run"] === true,
  )
  for (const line of lines) console.log(line)
}

export function resolveCommand(argv: string[]): void {
  const { positionals } = parseArgs({ args: argv, allowPositionals: true })
  if (positionals.length === 0) {
    throw new Error("usage: node scripts/review.ts resolve <thread-id>...")
  }
  const outcome = resolveThreads(positionals, resolveThread)
  for (const line of outcome.lines) console.log(line)
  if (outcome.failed) process.exit(1)
}

export function fleetCommand(argv: string[]): void {
  const { values } = parseArgs({
    args: argv,
    options: {
      base: { type: "string" },
      worktree: { type: "string" },
      "one-way-door": { type: "boolean", default: false },
      out: { type: "string" },
    },
  })
  const base = requireArgument(
    values.base,
    "fleet --base <branch> [--worktree PATH] [--one-way-door] [--out FILE]",
  )
  const worktree = values.worktree ?? "."
  const numstat = run([
    "git",
    "-C",
    worktree,
    "diff",
    "--numstat",
    "--no-renames",
    `origin/${base}...HEAD`,
  ])
  const raw = run([
    "git",
    "-C",
    worktree,
    "diff",
    "--raw",
    "--no-abbrev",
    "--no-renames",
    `origin/${base}...HEAD`,
  ])
  const fleet = pickFleet(
    parseRaw(raw, parseNumstat(numstat)),
    { ...config.review, mutationEnabled: config.mutation.enabled },
    values["one-way-door"],
  )
  emit(formatFleet(fleet), values.out)
}

export function optionsCommand(argv: string[]): void {
  const { values } = parseArgs({
    args: argv,
    options: { validate: { type: "string" } },
  })
  const reviewFile = requireArgument(
    values.validate,
    "options --validate <review.json>",
  )
  if (!existsSync(reviewFile)) throw new Error(`${reviewFile} does not exist`)
  const review = JSON.parse(readFileSync(reviewFile, "utf8")) as {
    comments?: DraftComment[]
  }
  const problems = validateDraftComments(review.comments ?? [])
  if (problems.length > 0) {
    for (const problem of problems) console.error(problem)
    throw new Error(
      `${problems.length} choice block problem(s) in ${reviewFile}`,
    )
  }
  console.log(`ok: ${review.comments?.length ?? 0} comments checked`)
}
