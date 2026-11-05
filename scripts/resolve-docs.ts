#!/usr/bin/env node
/**
 * Fixes the mechanical docs conflicts after `git merge` or `git rebase` stops,
 * and lists what is left for a human.
 *
 *   node scripts/resolve-docs.ts [--base <ref>]
 *
 * Resolves `generated:` lines and the bundle's index.md and log.md hunks, then
 * renumbers a decision record whose number the base branch already uses.
 * Exits 1 while any conflict or number collision remains. The logic lives in
 * scripts/docs/resolve.ts.
 */

import { existsSync, readdirSync } from "node:fs"
import { isAbsolute, join, posix } from "node:path"
import { config, REPO_ROOT } from "./config.ts"
import {
  type DecisionCollision,
  type FileResolution,
  hasConflictMarkers,
  planRenumbering,
  type Renumbering,
  resolveFile,
  rewriteReferences,
  sortDecisionEntries,
} from "./docs/resolve.ts"
import { run, runAllowingFailure } from "./review/shell.ts"
import * as fs from "node:fs/promises"

const DEFAULT_BASE = "origin/main"
const BASE_FLAG = "--base"
const DECISIONS_DIRECTORY = posix.join(config.docs.root, config.docs.decisions)
const INDEX_FILE = posix.join(config.docs.root, "index.md")
const GLOSSARY_FILES = config.docs.glossaries.map((glossary) =>
  posix.join(config.docs.root, glossary.path),
)
const IN_PROGRESS_MARKERS = ["MERGE_HEAD", "rebase-merge", "rebase-apply"]
const PREFIX = "docs:resolve:"

type Remaining = { path: string; detail: string }

type Summary = {
  resolved: { path: string; resolution: FileResolution }[]
  renumbered: { renumbering: Renumbering; rewrittenFiles: number }[]
  collisions: DecisionCollision[]
  remaining: Remaining[]
}

function git(...args: string[]): string {
  return run(["git", ...args], REPO_ROOT)
}

function parseBase(argv: string[]): string {
  const flagIndex = argv.indexOf(BASE_FLAG)
  if (flagIndex === -1) return DEFAULT_BASE
  const base = argv[flagIndex + 1]
  if (!base) throw new Error(`${BASE_FLAG} needs a ref`)
  return base
}

function isHandled(path: string): boolean {
  return (
    GLOSSARY_FILES.includes(path) ||
    (path.startsWith(`${config.docs.root}/`) && path.endsWith(".md"))
  )
}

function operationInProgress(): boolean {
  return IN_PROGRESS_MARKERS.some((marker) => {
    const path = git("rev-parse", "--git-path", marker)
    return existsSync(isAbsolute(path) ? path : join(REPO_ROOT, path))
  })
}

function conflictedFiles(): string[] {
  return git("diff", "--name-only", "--diff-filter=U")
    .split("\n")
    .filter(Boolean)
}

async function readFile(path: string): Promise<string> {
  return fs.readFile(join(REPO_ROOT, path), "utf8")
}

async function writeFile(path: string, text: string) {
  await fs.writeFile(join(REPO_ROOT, path), text)
}

/** Stages a file only once it is free of markers, so git keeps the rest unmerged. */
function stageIfClean(path: string, text: string) {
  if (!hasConflictMarkers(text)) git("add", "--", path)
}

async function resolveConflictedFile(path: string, summary: Summary) {
  if (!existsSync(join(REPO_ROOT, path))) {
    summary.remaining.push({ path, detail: "deleted on one side" })
    return
  }
  const resolution = resolveFile(path, await readFile(path))
  const { resolved, remainingLines } = resolution
  if (resolved["generated line"] + resolved.union > 0) {
    await writeFile(path, resolution.text)
    summary.resolved.push({ path, resolution })
  }
  stageIfClean(path, resolution.text)
  for (const line of remainingLines) {
    summary.remaining.push({ path, detail: `line ${line}` })
  }
}

function existsAtBase(base: string, path: string): boolean {
  return (
    runAllowingFailure(["git", "cat-file", "-e", `${base}:${path}`], REPO_ROOT)
      .exitCode === 0
  )
}

function filesMentioning(fileName: string): string[] {
  const result = runAllowingFailure(
    ["git", "grep", "-l", "-I", "-F", fileName],
    REPO_ROOT,
  )
  return [...new Set(result.stdout.split("\n").filter(Boolean))]
}

async function renumber(renumbering: Renumbering): Promise<number> {
  git("mv", renumbering.from, renumbering.to)
  const oldFileName = posix.basename(renumbering.from)
  const newFileName = posix.basename(renumbering.to)
  const files = filesMentioning(oldFileName)
  for (const path of files) {
    const text = rewriteReferences(
      await readFile(path),
      oldFileName,
      newFileName,
    )
    await writeFile(path, text)
    stageIfClean(path, text)
  }
  return files.length
}

async function resortIndex() {
  const text = sortDecisionEntries(await readFile(INDEX_FILE))
  await writeFile(INDEX_FILE, text)
  stageIfClean(INDEX_FILE, text)
}

async function renumberDecisions(base: string, summary: Summary) {
  const verify = ["git", "rev-parse", "--verify", "--quiet", `${base}^{commit}`]
  if (runAllowingFailure(verify, REPO_ROOT).exitCode !== 0) {
    throw new Error(
      `base ${base} is not a commit, pass another with ${BASE_FLAG}`,
    )
  }
  const paths = readdirSync(join(REPO_ROOT, DECISIONS_DIRECTORY))
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => posix.join(DECISIONS_DIRECTORY, fileName))
  const { renumberings, collisions } = planRenumbering(paths, (path) =>
    existsAtBase(base, path),
  )
  for (const renumbering of renumberings) {
    const rewrittenFiles = await renumber(renumbering)
    summary.renumbered.push({ renumbering, rewrittenFiles })
  }
  if (renumberings.length > 0) await resortIndex()
  summary.collisions.push(...collisions)
}

function describeResolution({ resolved }: FileResolution): string {
  return Object.entries(resolved)
    .filter(([, count]) => count > 0)
    .map(
      ([rule, count]) => `${count} ${count === 1 ? "hunk" : "hunks"} (${rule})`,
    )
    .join(", ")
}

function printSection(title: string, lines: string[]) {
  if (lines.length === 0) return
  console.log(`${PREFIX} ${title}`)
  for (const line of lines) console.log(`  ${line}`)
}

function printSummary(summary: Summary, base: string) {
  printSection(
    "resolved",
    summary.resolved.map(
      ({ path, resolution }) => `${path}: ${describeResolution(resolution)}`,
    ),
  )
  printSection(
    "renumbered decisions",
    summary.renumbered.map(
      ({ renumbering, rewrittenFiles }) =>
        `${renumbering.from} -> ${renumbering.to} (references rewritten in ${rewrittenFiles} files)`,
    ),
  )
  printSection(
    `decision numbers used twice, left alone because both or neither exist at ${base}`,
    summary.collisions.map(
      (collision) => `${collision.number}: ${collision.paths.join(", ")}`,
    ),
  )
  printSection(
    "conflicts remain",
    summary.remaining.map(({ path, detail }) => `${path}: ${detail}`),
  )
}

async function main(argv: string[]): Promise<number> {
  const base = parseBase(argv)
  const conflicted = conflictedFiles()
  if (conflicted.length === 0 && !operationInProgress()) {
    console.log(`${PREFIX} no merge or rebase in progress, nothing to resolve`)
    return 0
  }

  const summary: Summary = {
    resolved: [],
    renumbered: [],
    collisions: [],
    remaining: [],
  }
  for (const path of conflicted) {
    if (isHandled(path)) await resolveConflictedFile(path, summary)
    else summary.remaining.push({ path, detail: "not handled" })
  }
  await renumberDecisions(base, summary)
  printSummary(summary, base)

  if (summary.remaining.length > 0 || summary.collisions.length > 0) {
    console.log(`${PREFIX} resolve the rest by hand, then run it again`)
    return 1
  }
  console.log(`${PREFIX} all docs conflicts resolved`)
  return 0
}

try {
  process.exit(await main(process.argv.slice(2)))
} catch (error) {
  console.error(`${PREFIX} ${error instanceof Error ? error.message : error}`)
  process.exit(1)
}
