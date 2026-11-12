#!/usr/bin/env node
/**
 * Checks every skill in skills/ and every internal skill in .claude/skills/
 * against the rules of skills/add-skill that a script can check. It also
 * checks every .md under skills/ and agents/ for prose lines over 80
 * characters. Lines that already existed are in scripts/lint-skills.baseline.json.
 * Prints one line per problem and exits 1 when any exist.
 *
 *   node scripts/lint-skills.ts
 *   node scripts/lint-skills.ts --write-baseline
 *
 * --write-baseline drops the baseline lines that are gone or wrapped. It
 * never adds a line. Run it after you wrap a long line.
 */

import { lstatSync, readdirSync, readFileSync, readlinkSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { parseYaml } from "../templates/scripts/yaml.ts"
import { fileURLToPath } from "node:url"

export const MAX_LINES = 150

export const MAX_LINE_LENGTH = 80

export const BASELINE_PATH = "scripts/lint-skills.baseline.json"

export type Baseline = Record<string, string[]>

/** Skills the lint skips. Empty: every skill follows add-skill. */
export const EXEMPT = new Set<string>()

/** Tool and model names that appear only as an example, after "such as" or "for example". */
const CLI_SPECIFIC = [
  "AskUserQuestion",
  "TodoWrite",
  "WebFetch",
  "WebSearch",
  "subagent_type",
  "`Agent`",
  "Opus",
  "Sonnet",
  "Haiku",
  "Fable",
]

const EXAMPLE_MARKER = /(such as|for example)[^.]*$/i

export function lintSkill(folder: string, rawText: string): string[] {
  const problems: string[] = []
  const text = rawText.replace(/\r\n/g, "\n")
  const match = text.match(/^---\n([\s\S]*?)\n---\n/)
  if (!match) return ["no frontmatter"]
  let frontmatter: Record<string, unknown>
  try {
    frontmatter = parseYaml(match[1]) as Record<string, unknown>
  } catch (error) {
    return [`frontmatter is not valid YAML: ${error}`]
  }
  if (frontmatter.name !== folder) {
    problems.push(`name "${frontmatter.name}" differs from the folder "${folder}"`)
  }
  const description = frontmatter.description
  if (typeof description !== "string" || !/\bUse\b/.test(description)) {
    problems.push(`description does not say when to use the skill ("Use when …")`)
  }

  const lines = text.split("\n")
  const frontmatterLines = match[0].split("\n").length - 1
  const lineCount = text.endsWith("\n") ? lines.length - 1 : lines.length
  if (lineCount > MAX_LINES) {
    problems.push(`${lineCount} lines, over ${MAX_LINES}. Move text to a sibling file, such as briefs, templates or catalogs. Do not cut a rule to fit`)
  }
  if (!lines.includes("## Do")) problems.push(`no "## Do" section`)
  if (!lines.includes("## Don't")) problems.push(`no "## Don't" section`)

  for (const step of numberedSteps(withoutCode(text).split("\n"))) {
    if (!/Done when/.test(step.body)) problems.push(`step "${step.heading}" has no "Done when"`)
  }

  const prose = proseOnly(withoutCode(text.slice(match[0].length)))
  const descriptionText = typeof description === "string" ? proseOnly(description) : ""
  if (/[()]/.test(descriptionText)) problems.push(`description has parentheses. Write a sentence or a comma instead`)
  prose.split("\n").forEach((line, index) => {
    if (/[()]/.test(line)) {
      problems.push(`line ${frontmatterLines + index + 1}: parentheses in prose. Write a sentence or a comma instead (add-soul rule 13)`)
    }
    if (line.includes("—")) {
      problems.push(`line ${frontmatterLines + index + 1}: em dash in prose. End the sentence or use a comma (add-soul rule 13)`)
    }
  })

  const body = withoutCode(text.slice(match[0].length))
  for (const name of CLI_SPECIFIC) {
    let at = body.indexOf(name)
    while (at !== -1) {
      const before = body.slice(Math.max(0, at - 120), at).replace(/\s+/g, " ")
      if (!EXAMPLE_MARKER.test(before)) {
        problems.push(`line ${lineOf(body, at, match[0])}: ${name} named as the only way. Describe the action, then "such as ${name}"`)
      }
      at = body.indexOf(name, at + name.length)
    }
  }
  return problems
}

/** Every skill folder has exactly one row in the catalog of `next` table, and every row names a folder. */
export function lintCatalog(folders: string[], catalog: string): string[] {
  const rows = [...catalog.matchAll(/^\|[^|\n]*\| `h2xd:([a-z0-9-]+)` \|$/gm)].map((m) => m[1])
  const problems: string[] = []
  for (const folder of folders) {
    const count = rows.filter((row) => row === folder).length
    if (count !== 1) problems.push(`skills/next/catalog.md: ${folder} has ${count} rows in the catalog table, needs 1`)
  }
  for (const row of rows) {
    if (!folders.includes(row)) problems.push(`skills/next/catalog.md: row h2xd:${row} has no folder in skills/`)
  }
  return problems
}

function longProseLines(rawText: string): { line: number; text: string }[] {
  const text = rawText.replace(/\r\n/g, "\n")
  const frontmatter = text.match(/^---\n[\w-]+:[\s\S]*?\n---\n/)?.[0] ?? ""
  const body = withoutCode(text.slice(frontmatter.length)).split("\n")
  const offset = frontmatter.split("\n").length - 1
  const original = text.split("\n")
  return body.flatMap((line, index) => {
    const source = original[offset + index]
    if (line.trim() === "" || [...source].length <= MAX_LINE_LENGTH || source.trimStart().startsWith("|")) return []
    return [{ line: offset + index + 1, text: source }]
  })
}

function countLines(lines: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const line of lines) counts.set(line, (counts.get(line) ?? 0) + 1)
  return counts
}

function takeOne(counts: Map<string, number>, line: string): boolean {
  const left = counts.get(line) ?? 0
  counts.set(line, left - 1)
  return left > 0
}

export function lintLongLines(path: string, text: string, baseline: Baseline): string[] {
  const allowed = countLines(baseline[path] ?? [])
  return longProseLines(text)
    .filter((long) => !takeOne(allowed, long.text))
    .map(
      (long) =>
        `${path}: line ${long.line}: ${[...long.text].length} characters, over ${MAX_LINE_LENGTH}. Wrap the line. After you wrap an old long line, run node scripts/lint-skills.ts --write-baseline`,
    )
}

export function dropStaleBaselineLines(old: Baseline, files: { path: string; text: string }[]): Baseline {
  const shrunk: Baseline = {}
  for (const { path, text } of files) {
    const present = countLines(longProseLines(text).map((long) => long.text))
    const kept = (old[path] ?? []).filter((line) => takeOne(present, line))
    if (kept.length > 0) shrunk[path] = kept
  }
  return shrunk
}

export function markdownFiles(absolute: string, relativePath: string): string[] {
  return readdirSync(absolute, { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : 1))
    .flatMap((entry) => {
      const child = `${relativePath}/${entry.name}`
      if (entry.isDirectory()) return markdownFiles(join(absolute, entry.name), child)
      return entry.name.endsWith(".md") ? [child] : []
    })
}

type Entry = { name: string; target: string | null }

/**
 * Every shipped skill has a link in `.claude/skills`, and every link points to
 * one. An entry with no target is a real folder, an internal skill.
 */
export function lintLinks(shipped: string[], entries: Entry[]): string[] {
  const problems: string[] = []
  for (const name of shipped) {
    const entry = entries.find((e) => e.name === name)
    const want = `../../skills/${name}`
    if (!entry) problems.push(`.claude/skills/${name}: missing, run ln -s ${want} .claude/skills/${name}`)
    else if (entry.target === null) problems.push(`.claude/skills/${name}: a folder, needs a link to ${want}`)
    else if (entry.target !== want) problems.push(`.claude/skills/${name}: links to ${entry.target}, needs ${want}`)
  }
  for (const { name, target } of entries) {
    if (target !== null && !shipped.includes(name)) {
      problems.push(`.claude/skills/${name}: links to ${target}, which is not a skill in skills/`)
    }
  }
  return problems
}

type Step = { heading: string; body: string }

/** `### 1. Name` sections, each running to the next heading of the same or higher level. */
function numberedSteps(lines: string[]): Step[] {
  const steps: Step[] = []
  lines.forEach((line, index) => {
    const heading = line.match(/^(#{2,4}) \d+\. (.+)$/)
    if (!heading) return
    const level = heading[1].length
    const end = lines.findIndex(
      (next, j) => j > index && /^#{1,6} /.test(next) && next.match(/^#+/)![0].length <= level,
    )
    steps.push({ heading: heading[2], body: lines.slice(index + 1, end === -1 ? undefined : end).join("\n") })
  })
  return steps
}

/** Drops inline code, link targets, HTML tags and placeholders, so only prose is left. */
function proseOnly(text: string): string {
  return text
    .replace(/`[^`\n]*`/g, "")
    .replace(/\]\([^)\s]*\)/g, "]")
    .replace(/<[^>\n]*>/g, "")
}

/** Blanks fenced code, keeping line breaks so line numbers still match. */
function withoutCode(text: string): string {
  return text.replace(/^( *)(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\2\s*$/gm, (block) => block.replace(/[^\n]/g, " "))
}

function lineOf(body: string, at: number, frontmatter: string): number {
  return frontmatter.split("\n").length - 1 + body.slice(0, at).split("\n").length
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const repo = resolve(import.meta.dirname, "..")
  const root = resolve(repo, "skills")
  const markdown = ["skills", "agents"].flatMap((dir) => markdownFiles(join(repo, dir), dir))
  if (process.argv.includes("--write-baseline")) {
    const files = markdown.map((path) => ({ path, text: readFileSync(join(repo, path), "utf8") }))
    const old: Baseline = JSON.parse(readFileSync(join(repo, BASELINE_PATH), "utf8"))
    writeFileSync(join(repo, BASELINE_PATH), JSON.stringify(dropStaleBaselineLines(old, files), null, 2) + "\n")
    console.log(`wrote ${BASELINE_PATH}`)
    process.exit(0)
  }
  let failed = false
  const baseline: Baseline = JSON.parse(readFileSync(join(repo, BASELINE_PATH), "utf8"))
  for (const path of markdown) {
    for (const problem of lintLongLines(path, readFileSync(join(repo, path), "utf8"), baseline)) {
      console.error(problem)
      failed = true
    }
  }
  for (const folder of readdirSync(root).sort()) {
    if (EXEMPT.has(folder)) continue
    const path = join(root, folder, "SKILL.md")
    const text = readFileSync(path, "utf8")
    for (const problem of lintSkill(folder, text)) {
      console.error(`skills/${folder}/SKILL.md: ${problem}`)
      failed = true
    }
  }
  const local = resolve(import.meta.dirname, "..", ".claude", "skills")
  const entries = readdirSync(local).sort().map((name) => {
    const path = join(local, name)
    return { name, target: lstatSync(path).isSymbolicLink() ? readlinkSync(path) : null }
  })
  for (const { name } of entries.filter((e) => e.target === null)) {
    for (const problem of lintSkill(name, readFileSync(join(local, name, "SKILL.md"), "utf8"))) {
      console.error(`.claude/skills/${name}/SKILL.md: ${problem}`)
      failed = true
    }
  }
  for (const problem of lintLinks(readdirSync(root).sort(), entries)) {
    console.error(problem)
    failed = true
  }
  const catalog = readFileSync(join(root, "next", "catalog.md"), "utf8")
  for (const problem of lintCatalog(readdirSync(root).sort(), catalog)) {
    console.error(problem)
    failed = true
  }
  if (failed) process.exit(1)
  console.log("skills ok")
}
