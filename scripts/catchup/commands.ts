import { readdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"
import { parseArgs } from "node:util"
import { run, runAllowingFailure } from "../review/shell.ts"
import { parseWorktreeList } from "../review/worktree.ts"
import { progressBar, timeline, weekGraph } from "./drawings.ts"
import {
  branchTicket,
  type Commit,
  commitsPerWeek,
  LOG_FORMAT,
  newestHandoff,
  parseLog,
  topLevelCounts,
} from "./facts.ts"

const LAST_COMMITS = 3
const LISTED_CHANGES = 20
const GRAPH_WEEKS = 26
const LISTED_TAGS = 10

type Scope = "work" | "repo"

function log(range: string, ...options: string[]): Commit[] {
  return parseLog(
    run(["git", "log", "--date=short", `--format=${LOG_FORMAT}`, ...options, range]),
  )
}

function branchExists(branch: string): boolean {
  return (
    runAllowingFailure(["git", "show-ref", "--verify", "--quiet", `refs/heads/${branch}`])
      .exitCode === 0
  )
}

function currentBranch(): string {
  return run(["git", "branch", "--show-current"])
}

function defaultBranch(): string {
  const origin = runAllowingFailure(["git", "symbolic-ref", "--short", "refs/remotes/origin/HEAD"])
  if (origin.exitCode === 0) return origin.stdout.trim().replace(/^origin\//, "")
  return ["main", "master"].find(branchExists) ?? currentBranch()
}

function lines(heading: string, items: string[]): string[] {
  return [heading, ...items]
}

function weekSection(commits: Commit[]): string[] {
  const weeks = commitsPerWeek(commits.map((commit) => commit.date)).slice(-GRAPH_WEEKS)
  return weeks.length === 0 ? [] : ["commits per week:", weekGraph(weeks)]
}

function commitLine(commit: Commit, withAuthor: boolean): string {
  const line = `- ${commit.hash} ${commit.date} ${commit.subject}`
  return withAuthor ? `${line} (${commit.author})` : line
}

function workFacts(base: string): string[] {
  const branch = currentBranch()
  const ahead = log(`${base}..HEAD`)
  const uncommitted = run(["git", "status", "--porcelain"]).split("\n").filter((line) => line !== "")
  return [
    "scope: work",
    `branch: ${branch === "" ? "detached" : branch}`,
    `base: ${base}`,
    `ticket: ${branchTicket(branch) ?? "none"}`,
    `ahead: ${ahead.length}`,
    `uncommitted: ${uncommitted.length}`,
    ...lines("last commits:", log("HEAD", `-${LAST_COMMITS}`).map((commit) => commitLine(commit, false))),
    ...weekSection(ahead),
  ]
}

function documentaryFacts(commits: Commit[]): string[] {
  const weeks = commitsPerWeek(commits.map((commit) => commit.date))
  const busiest = weeks.toSorted((a, b) => b.count - a.count)[0]
  const tags = run(["git", "tag", "--sort=-creatordate", "--format=%(refname:short) %(creatordate:short)"])
    .split("\n")
    .filter((line) => line !== "")
    .slice(0, LISTED_TAGS)
  const tracked = run(["git", "ls-files"]).split("\n").filter((line) => line !== "")
  return [
    "mode: documentary",
    "story:",
    `- first commit: ${commits[commits.length - 1].date}`,
    `- commits: ${commits.length}`,
    `- authors: ${new Set(commits.map((commit) => commit.email)).size}`,
    `- busiest week: ${busiest.week} with ${busiest.count} commits`,
    ...tags.map((tag) => `- ${tag}`),
    "map:",
    ...topLevelCounts(tracked).map((entry) => `- ${entry.name} ${entry.files} files`),
    ...weekSection(commits),
  ]
}

function changesFacts(commits: Commit[], lastOwn: Commit): string[] {
  const changes = log(`${lastOwn.hash}..HEAD`)
  return [
    "mode: changes",
    `your last commit: ${lastOwn.date}`,
    `since your last commit: ${changes.length}`,
    ...changes.slice(0, LISTED_CHANGES).map((commit) => commitLine(commit, true)),
    ...(changes.length > LISTED_CHANGES ? [`- and ${changes.length - LISTED_CHANGES} more`] : []),
    ...weekSection(commits),
  ]
}

function repoFacts(base: string, user: string): string[] {
  const commits = log(base)
  if (commits.length === 0) throw new Error(`${base} has no commit`)
  const own = commits.filter((commit) => commit.email === user)
  const header = [
    "scope: repo",
    `branch: ${base}`,
    `commits: ${commits.length}`,
    `first commit: ${commits[commits.length - 1].date}`,
    `last commit: ${commits[0].date}`,
    `authors: ${new Set(commits.map((commit) => commit.email)).size}`,
    `user: ${user}`,
    `your commits: ${own.length}`,
  ]
  return [
    ...header,
    ...(own.length === 0 ? documentaryFacts(commits) : changesFacts(commits, own[0])),
  ]
}

function pickScope(value: string | undefined, base: string): Scope {
  if (value !== undefined) {
    if (value !== "work" && value !== "repo") throw new Error("scope must be work or repo")
    return value
  }
  return currentBranch() === base ? "repo" : "work"
}

export function factsCommand(argv: string[]): void {
  const { values } = parseArgs({
    args: argv,
    options: {
      scope: { type: "string" },
      base: { type: "string" },
      user: { type: "string" },
    },
  })
  const base = values.base ?? defaultBranch()
  const scope = pickScope(values.scope, base)
  const user = values.user ?? run(["git", "config", "user.email"])
  console.log((scope === "work" ? workFacts(base) : repoFacts(base, user)).join("\n"))
}

export function barCommand(argv: string[]): void {
  const [label, done, total] = parseArgs({ args: argv, allowPositionals: true }).positionals
  if (label === undefined || done === undefined || total === undefined) {
    throw new Error("usage: node scripts/catchup.ts bar <label> <done> <total>")
  }
  console.log(progressBar(label, Number(done), Number(total)))
}

export function timelineCommand(argv: string[]): void {
  const [range] = parseArgs({ args: argv, allowPositionals: true }).positionals
  if (range === undefined) throw new Error("usage: node scripts/catchup.ts timeline <commit range>")
  console.log(timeline(log(range)))
}

export function handoffCommand(argv: string[]): void {
  const { values } = parseArgs({ args: argv, options: { dir: { type: "string" } } })
  const directory = values.dir ?? tmpdir()
  const [main] = parseWorktreeList(run(["git", "worktree", "list", "--porcelain"]))
  const name = newestHandoff(readdirSync(directory), basename(main.path))
  console.log(name === null ? "none" : join(directory, name))
}
