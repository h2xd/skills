/** The subcommands of `node scripts/review.ts`. Each takes its argv tail and does the I/O. */

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { parseArgs } from "node:util"
import { config } from "../config.ts"
import { createWorktree } from "../worktree/create.ts"
import { type ContextData, formatContext } from "./context.ts"
import { formatFleet, parseNumstat, parseRaw, pickFleet } from "./fleet.ts"
import {
  authenticatedLogin,
  commentOnPullRequest,
  fetchReviewData,
  pullRequestDiff,
  repositoryName,
  replyToThread,
  resolveThread,
  viewIssue,
  viewPullRequest,
} from "./github.ts"
import {
  existingThreads,
  findingsBullets,
  formatPreview,
  mergeFindings,
  parseFindings,
} from "./findings.ts"
import { missingReviewFiles } from "./missing.ts"
import { formatFixSplit, parseFixItems, planFixSplit } from "./split.ts"
import {
  type DraftComment,
  localFolders,
  validateDraftComments,
  validateNoLocalPaths,
} from "./options.ts"
import { planReplies, postReplies } from "./reply.ts"
import { resolveThreads, threadNodeIds } from "./resolve.ts"
import { run, runAllowingFailure } from "./shell.ts"
import { tallyThreads } from "./tally.ts"
import { formatThreadsDocument, unrepliedSummaryItems } from "./threads.ts"
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

function createReviewWorktree(mainWorktree: string, branch: string): string {
  const path = newWorktreePath(mainWorktree, branch)
  run(["git", "fetch", "origin", branch])
  const { skipped } = createWorktree({
    mainWorktree,
    path,
    branch,
    base: `origin/${branch}`,
    track: true,
    setup: config.worktreeSetup,
    links: config.worktreeLinks,
  })
  for (const note of skipped) console.error(`review: ${note}`)
  return path
}

export function setupCommand(argv: string[]): void {
  const { positionals } = parseArgs({ args: argv, allowPositionals: true })
  const path = resolve(requireArgument(positionals[0], "setup <path>"))
  for (const command of config.worktreeSetup) run(command, path)
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
  console.log(createReviewWorktree(entries[0].path, branch))
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
    behindBase: Number(
      run([
        "git",
        "-C",
        worktree,
        "rev-list",
        "--count",
        `HEAD..origin/${pullRequest.baseRefName}`,
      ]),
    ),
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
    mergeable: data.pullRequest.mergeable,
    mergeStateStatus: data.pullRequest.mergeStateStatus,
    behindBase: data.behindBase,
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
  const { threads, reviews, comments } = fetchReviewData(
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
      items: unrepliedSummaryItems(reviews, comments),
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
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { threads: { type: "string" } },
  })
  const usage =
    "usage: node scripts/review.ts resolve [--threads <threads.md>] <thread-id or T label>..."
  if (positionals.length === 0 || positionals.some((a) => /^\d+$/.test(a))) {
    throw new Error(usage)
  }
  const threadIds = threadNodeIds(
    positionals,
    values.threads ? readFileSync(values.threads, "utf8") : "",
  )
  const outcome = resolveThreads(threadIds, resolveThread)
  for (const line of outcome.lines) console.log(line)
  if (outcome.failed) process.exit(1)
}

export function tallyCommand(argv: string[]): void {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { threads: { type: "string" }, verdicts: { type: "string" } },
  })
  const usage =
    "tally --threads <threads.md> --verdicts <dir> <T label>..."
  const threadsFile = requireArgument(values.threads, usage)
  const directory = requireArgument(values.verdicts, usage)
  if (positionals.length === 0) requireArgument(undefined, usage)
  const outcome = tallyThreads(
    positionals,
    readFileSync(threadsFile, "utf8"),
    directory,
    {
      readVerdictFile: (path) =>
        existsSync(path) ? readFileSync(path, "utf8") : undefined,
      replyToThread,
      resolveThread,
    },
  )
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
    "-z",
    `origin/${base}...HEAD`,
  ])
  const raw = run([
    "git",
    "-C",
    worktree,
    "diff",
    "--raw",
    "--no-abbrev",
    "-z",
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
    options: {
      validate: { type: "string" },
      "local-path": { type: "string", multiple: true },
    },
  })
  const reviewFile = requireArgument(
    values.validate,
    "options --validate <review.json> [--local-path <dir>]...",
  )
  if (!existsSync(reviewFile)) throw new Error(`${reviewFile} does not exist`)
  const review = JSON.parse(readFileSync(reviewFile, "utf8")) as {
    body?: string
    comments?: DraftComment[]
  }
  const problems = [
    ...validateDraftComments(review.comments ?? []),
    ...validateNoLocalPaths(review, localFolders(values["local-path"])),
  ]
  if (problems.length > 0) {
    for (const problem of problems) console.error(problem)
    throw new Error(
      `${problems.length} problem(s) in ${reviewFile}`,
    )
  }
  console.log(`ok: ${review.comments?.length ?? 0} comments checked`)
}

export function missingCommand(argv: string[]): void {
  const { positionals } = parseArgs({ args: argv, allowPositionals: true })
  const [directory, ...letters] = positionals
  if (!directory || letters.length === 0) {
    throw new Error("usage: node scripts/review.ts missing <dir> <letter>...")
  }
  const missing = missingReviewFiles(directory, letters)
  if (missing.length > 0) {
    for (const name of missing) console.error(`missing ${name}.json`)
    throw new Error(`${missing.length} reviewer file(s) missing in ${directory}`)
  }
  console.log(`ok: ${letters.length} reviewer file(s) found`)
}

function readJson(file: string): unknown {
  if (!existsSync(file)) throw new Error(`${file} does not exist`)
  try {
    return JSON.parse(readFileSync(file, "utf8"))
  } catch (error) {
    throw new Error(
      `${file} is not JSON: ${error instanceof Error ? error.message : error}`,
    )
  }
}

export function findingsCommand(argv: string[]): void {
  const { values } = parseArgs({
    args: argv,
    options: { validate: { type: "string" } },
  })
  const file = requireArgument(values.validate, "findings --validate <file>")
  const parsed = parseFindings(readJson(file))
  if (!parsed.ok) {
    for (const problem of parsed.problems) console.error(problem)
    throw new Error(`${parsed.problems.length} problem(s) in ${file}`)
  }
  console.log(`ok: ${parsed.file.findings.length} findings checked`)
}

const PICK_META = /^- (Size|Reviewers|Effort for A|Ask first):/

function pickReasons(pickFile: string | undefined): string[] {
  if (!pickFile) return []
  return readFileSync(pickFile, "utf8")
    .split("\n")
    .filter((line) => line.startsWith("- ") && !PICK_META.test(line))
    .map((line) => line.slice(2))
}

function bulletsFrom(file: string | undefined): string[] | undefined {
  if (!file) return undefined
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
}

export function mergeCommand(argv: string[]): void {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      out: { type: "string" },
      pr: { type: "string" },
      worktree: { type: "string" },
      pick: { type: "string" },
      bullets: { type: "string" },
      preview: { type: "string" },
    },
  })
  const usage =
    "merge <findings.json>... --out review.json [--pr N] [--worktree PATH] [--pick pick.md] [--bullets FILE] [--preview FILE]"
  const outFile = requireArgument(values.out, usage)
  if (positionals.length === 0) throw new Error(`usage: node scripts/review.ts ${usage}`)

  const files = positionals.map((path) => {
    const parsed = parseFindings(readJson(path))
    if (!parsed.ok) {
      throw new Error(
        `${path} is not valid, run findings --validate:\n${parsed.problems.join("\n")}`,
      )
    }
    return parsed.file
  })

  const worktree = values.worktree ? resolve(values.worktree) : undefined
  const pullRequest = viewPullRequest(values.pr, worktree)
  const { owner, name } = repositoryName(worktree)
  const { threads } = fetchReviewData(owner, name, pullRequest.number, worktree)
  const { review, stats, dropped } = mergeFindings(
    files,
    pullRequestDiff(pullRequest.number, worktree),
    {
      headSha: pullRequest.headRefOid,
      threads: existingThreads(threads),
      reviewerLogin: authenticatedLogin(worktree),
      author: pullRequest.author.login,
      pickReasons: pickReasons(values.pick),
      rewordedBullets: bulletsFrom(values.bullets),
    },
  )
  writeFileSync(outFile, `${JSON.stringify(review, null, 2)}\n`)
  if (values.preview) writeFileSync(values.preview, formatPreview(review, dropped))
  console.log(
    `wrote ${outFile}: ${review.event}, ${stats.inline} inline, ${stats.outside} outside the diff, ${stats.merged} merged, ${dropped.length} dropped`,
  )
  for (const item of dropped) {
    console.log(`dropped ${item.id}: ${item.subject}`)
  }
  if (!values.bullets) {
    console.log(`bullets:\n${findingsBullets(review.body).join("\n")}`)
  }
}

export function splitCommand(argv: string[]): void {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { out: { type: "string" } },
  })
  const usage = "split <threads.md> <plan.md> [--out FILE]"
  const threadsFile = requireArgument(positionals[0], usage)
  const planFile = requireArgument(positionals[1], usage)
  const split = planFixSplit(
    parseFixItems(readFileSync(planFile, "utf8"), readFileSync(threadsFile, "utf8")),
    config.review,
  )
  const text = formatFixSplit(split)
  if (values.out) {
    writeFileSync(values.out, text)
    console.log(`${split.workers.length} fixer workers: wrote ${values.out}`)
  } else {
    process.stdout.write(text)
  }
}
