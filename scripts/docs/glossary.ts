/**
 * Checks that keep each glossary usable as the list of names a term goes by:
 * every `###` entry carries the fields its glossary requires, no term appears
 * twice, and every link into a glossary lands on an existing entry.
 *
 * A repo has a project glossary (the words of the domain) and a technical
 * glossary (the words of the code base). Both are configured in
 * agents.config.json and checked the same way.
 */

import type { GlossaryConfig } from "../config.ts"
import { BUNDLE_DIRECTORY, type Page, repoPath } from "./bundle.ts"

const ENTRY_HEADING = /^### (.+)$/
const ANY_HEADING = /^#{1,6} /
const FENCED_CODE = /```[\s\S]*?```/g
const IN_PAGE_LINK = /\]\(#([^)\s]+)\)/g

type Entry = { heading: string; lines: string[] }

/** GitHub's heading anchor: "Add-on Game" → "add-on-game", "GlücksSpirale" → "glücksspirale". */
export function headingAnchor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-")
}

function parseEntries(glossary: Page): Entry[] {
  const entries: Entry[] = []
  let current: Entry | undefined
  for (const line of glossary.body.replace(FENCED_CODE, "").split("\n")) {
    const heading = line.match(ENTRY_HEADING)?.[1]
    if (heading) {
      current = { heading: heading.trim(), lines: [] }
      entries.push(current)
    } else if (ANY_HEADING.test(line)) {
      current = undefined
    } else {
      current?.lines.push(line)
    }
  }
  return entries
}

function checkEntry(glossary: GlossaryConfig, entry: Entry): string[] {
  return glossary.requiredFields
    .filter(
      (field) => !entry.lines.some((line) => line.includes(`**${field}:**`)),
    )
    .map(
      (field) =>
        `${glossary.path}: entry "${entry.heading}" has no **${field}:** line`,
    )
}

function duplicates(values: string[]): string[] {
  return [
    ...new Set(
      values.filter((value, index) => values.indexOf(value) !== index),
    ),
  ]
}

function safeDecode(anchor: string): string {
  try {
    return decodeURIComponent(anchor)
  } catch {
    return anchor
  }
}

/** Every anchor that points into the glossary, as [page path, anchor] pairs. */
function glossaryAnchors(pages: Page[], glossary: Page): [string, string][] {
  const glossaryRepoPath = repoPath(glossary)
  const anchors: [string, string][] = []
  for (const page of pages) {
    for (const link of page.links) {
      const anchor = link.target.split("#")[1]
      if (link.resolved === glossaryRepoPath && anchor) {
        anchors.push([page.path, anchor])
      }
    }
  }
  const body = glossary.body.replace(FENCED_CODE, "")
  for (const [, anchor] of body.matchAll(IN_PAGE_LINK)) {
    anchors.push([glossary.path, anchor])
  }
  return anchors
}

export function checkGlossary(
  pages: Page[],
  config: GlossaryConfig,
): string[] {
  const target = `${BUNDLE_DIRECTORY}/${config.path}`
  const glossary = pages.find((page) => page.path === config.path)
  if (!glossary) {
    const linked = pages.some((page) =>
      page.links.some((link) => link.resolved === target),
    )
    return linked ? [`${target}: missing, but pages link to it`] : []
  }
  const entries = parseEntries(glossary)
  const errors = entries.flatMap((entry) => checkEntry(config, entry))
  for (const heading of duplicates(entries.map((entry) => entry.heading))) {
    errors.push(`${config.path}: entry "${heading}" appears more than once`)
  }
  const anchors = new Set(entries.map((entry) => headingAnchor(entry.heading)))
  for (const [pagePath, anchor] of glossaryAnchors(pages, glossary)) {
    if (!anchors.has(safeDecode(anchor))) {
      errors.push(
        `${pagePath}: links to #${anchor} in ${target}, which has no such entry`,
      )
    }
  }
  return errors
}

/**
 * The same term defined in two glossaries means two readers learn two
 * meanings. Each term has one home.
 */
function checkTermsAcrossGlossaries(
  pages: Page[],
  configs: GlossaryConfig[],
): string[] {
  const homes = new Map<string, string[]>()
  for (const config of configs) {
    const glossary = pages.find((page) => page.path === config.path)
    if (!glossary) continue
    for (const entry of parseEntries(glossary)) {
      const key = entry.heading.toLowerCase()
      homes.set(key, [...(homes.get(key) ?? []), config.path])
    }
  }
  return [...homes]
    .filter(([, paths]) => new Set(paths).size > 1)
    .map(
      ([term, paths]) =>
        `glossary term "${term}" is defined in ${[...new Set(paths)].join(" and ")}, give it one home`,
    )
}

export function checkGlossaries(
  pages: Page[],
  configs: GlossaryConfig[],
): string[] {
  return [
    ...configs.flatMap((config) => checkGlossary(pages, config)),
    ...checkTermsAcrossGlossaries(pages, configs),
  ]
}
