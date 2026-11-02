/**
 * The checks behind `node scripts/lint-docs.ts`, as pure functions over parsed pages.
 *
 * Errors block a commit: OKF conformance (spec section 11), MADR rules for
 * decision records, a decision record that cites no tracker issue, an index
 * that has drifted from the pages, a broken glossary entry or glossary link
 * (scripts/docs/glossary.ts), a conflict marker a merge left behind, and two
 * decision records sharing a number. scripts/resolve-docs.ts fixes the common
 * cases of the last two. Notes only inform: a link to a page not written yet
 * is valid OKF. Pages nobody links to are a query (`docs:find --orphans`), not
 * a note, because most are fine.
 */

import type { GlossaryConfig } from "../config.ts"
import {
  BUNDLE_DIRECTORY,
  DECISIONS_DIRECTORY,
  type IndexEntry,
  type Page,
  parseIndexEntries,
  repoPath,
  toDate,
} from "./bundle.ts"
import { checkGlossaries } from "./glossary.ts"

const LOG_DATE_HEADING = /^## \d{4}-\d{2}-\d{2}$/

/** A log entry is one line. The details live in the page and the commit. */
export const LOG_ENTRY_MAX = 300
// Decision records use MADR 4.0 status values instead of OKF's draft/stable/deprecated.
const DECISION_STATUS =
  /^(proposed|rejected|accepted|deprecated|superseded by ADR-(\d{4}))$/
const DECISION_PREFIX = `${DECISIONS_DIRECTORY}/`
const DECISION_NUMBER = new RegExp(`^${DECISION_PREFIX}(\\d{4})-`)
const DECISION_FILENAME = new RegExp(`^${DECISION_PREFIX}\\d{4}-[a-z0-9-]+\\.md$`)
const ISSUE_SOURCE_ID = /^issue-\d+$/
const ROOT_INDEX = "index.md"
// A bare ======= line is left out: it is also a valid setext heading underline.
const CONFLICT_MARKER = /^(<<<<<<<|>>>>>>>)( |$)/

type LintOptions = {
  /** Whether a repo-relative path exists, for links that leave the bundle. */
  exists: (repoRelativePath: string) => boolean
  now: Date
  /** Records numbered at or above this must cite an `issue-<n>` source. */
  decisionIssueRequiredFrom: number | null
  glossaries: GlossaryConfig[]
}

type LintResult = { errors: string[]; notes: string[] }

type Report = LintResult & { pages: Page[]; options: LintOptions }

function checkConcept(report: Report, page: Page) {
  if (page.frontmatterError) {
    report.errors.push(
      `${page.path}: frontmatter is not valid YAML (${page.frontmatterError})`,
    )
    return
  }
  if (!page.frontmatter) {
    report.errors.push(
      `${page.path}: no frontmatter block, every concept needs one`,
    )
    return
  }
  for (const key of ["type", "title", "description"]) {
    const value = page.frontmatter[key]
    if (typeof value !== "string" || value.trim() === "") {
      report.errors.push(`${page.path}: frontmatter has no non-empty \`${key}\``)
    }
  }
  const generated = page.frontmatter.generated as Record<string, unknown> | undefined
  if (typeof generated !== "object" || generated === null || !generated.by || !generated.at) {
    report.errors.push(`${page.path}: frontmatter has no \`generated: { by, at }\``)
  }
  const staleAfter = toDate(page.frontmatter.stale_after)
  if (staleAfter && staleAfter <= report.options.now) {
    report.notes.push(
      `${page.path}: stale since ${staleAfter.toISOString().slice(0, 10)}`,
    )
  }
}

function checkIndexFrontmatter(report: Report, page: Page) {
  if (!page.frontmatter) return
  const keys = Object.keys(page.frontmatter)
  if (page.path !== ROOT_INDEX || keys.some((key) => key !== "okf_version")) {
    report.errors.push(
      `${page.path}: index files carry no frontmatter, except okf_version in the root index`,
    )
  }
}

function checkLog(report: Report, page: Page) {
  page.body.split("\n").forEach((line, index) => {
    if (line.startsWith("## ") && !LOG_DATE_HEADING.test(line)) {
      report.errors.push(
        `${page.path}: log heading "${line}" is not a YYYY-MM-DD date`,
      )
    }
    if (line.startsWith("* ") && line.length > LOG_ENTRY_MAX) {
      report.notes.push(
        `${page.path}: entry on line ${index + 1} has ${line.length} characters, over ${LOG_ENTRY_MAX}. Keep one line, and put the details in the page and the commit`,
      )
    }
  })
}

function decisionNumber(page: Page): string | undefined {
  return page.path.match(DECISION_NUMBER)?.[1]
}

function checkDecision(report: Report, page: Page) {
  const frontmatter = page.frontmatter
  if (!frontmatter) return
  if (!DECISION_FILENAME.test(page.path)) {
    report.errors.push(`${page.path}: decision records are named NNNN-slug.md`)
  }
  const status = String(frontmatter.status ?? "")
  const statusMatch = status.match(DECISION_STATUS)
  if (!statusMatch) {
    report.errors.push(
      `${page.path}: status "${status}" is not a MADR status (proposed, rejected, accepted, deprecated, superseded by ADR-NNNN)`,
    )
  }
  if (!toDate(frontmatter.date)) {
    report.errors.push(
      `${page.path}: date "${String(frontmatter.date ?? "")}" is not YYYY-MM-DD`,
    )
  }

  checkIssueSource(report, page)

  const supersedingNumber = statusMatch?.[2]
  if (supersedingNumber) {
    checkSupersededBy(report, page, supersedingNumber)
  } else if (status === "accepted" && !linksOutsideBundle(page)) {
    report.notes.push(
      `${page.path}: links no code or config the decision affects`,
    )
  }
}

/**
 * A decision record starts life as a tracker issue, so overlapping records are
 * caught where the work is discussed, before a second file exists.
 */
function checkIssueSource(report: Report, page: Page) {
  const from = report.options.decisionIssueRequiredFrom
  const number = Number(decisionNumber(page))
  if (from === null || Number.isNaN(number) || number < from) return
  const sources = Array.isArray(page.frontmatter?.sources)
    ? page.frontmatter.sources
    : []
  const cited = sources.some(
    (source) =>
      typeof source === "object" &&
      source !== null &&
      ISSUE_SOURCE_ID.test(String((source as { id?: unknown }).id ?? "")),
  )
  if (!cited) {
    report.errors.push(
      `${page.path}: cites no tracker issue. Add a \`sources\` entry with id \`issue-<n>\` for the issue this record was opened under (the adr skill creates it)`,
    )
  }
}

function checkSupersededBy(report: Report, page: Page, number: string) {
  const successor = report.pages.find(
    (candidate) => decisionNumber(candidate) === number,
  )
  if (!successor) {
    report.errors.push(
      `${page.path}: superseded by ADR-${number}, which does not exist`,
    )
    return
  }
  const linksBack = successor.links.some(
    (link) => link.resolved === repoPath(page),
  )
  if (!linksBack) {
    report.errors.push(
      `${successor.path}: supersedes ${page.path} but does not link to it`,
    )
  }
}

/**
 * Decision records may cite what they supersede. Every other page should point
 * at the decision that holds now.
 */
function checkLinksToSuperseded(report: Report, page: Page) {
  if (page.path.startsWith(DECISION_PREFIX)) return
  for (const link of page.links) {
    const target = report.pages.find(
      (candidate) => repoPath(candidate) === link.resolved,
    )
    const status = String(target?.frontmatter?.status ?? "")
    const successor = status.match(DECISION_STATUS)?.[2]
    if (!target || !successor) continue
    report.notes.push(
      `${page.path}: links ${target.path}, which is superseded by ADR-${successor}`,
    )
  }
}

function linksOutsideBundle(page: Page): boolean {
  return page.links.some(
    (link) =>
      !link.external && !link.resolved.startsWith(`${BUNDLE_DIRECTORY}/`),
  )
}

function linkExists(report: Report, resolved: string): boolean {
  if (report.pages.some((page) => repoPath(page) === resolved)) return true
  return report.options.exists(resolved)
}

function checkLinks(report: Report, page: Page) {
  for (const link of page.links) {
    if (link.external || linkExists(report, link.resolved)) continue
    report.notes.push(`${page.path}: links to ${link.target}, not written yet`)
  }
}

function checkConflictMarkers(report: Report, page: Page) {
  page.text.split("\n").forEach((line, index) => {
    if (CONFLICT_MARKER.test(line)) {
      report.errors.push(
        `${page.path}: leftover conflict marker on line ${index + 1}`,
      )
    }
  })
}

function checkDecisionNumbers(report: Report) {
  const pathsByNumber = new Map<string, string[]>()
  for (const page of report.pages) {
    const number = decisionNumber(page)
    if (!number) continue
    pathsByNumber.set(number, [...(pathsByNumber.get(number) ?? []), page.path])
  }
  for (const [number, paths] of pathsByNumber) {
    if (paths.length < 2) continue
    report.errors.push(
      `decision number ${number} is used by more than one record: ${paths.join(", ")}`,
    )
  }
}

function checkRootIndex(report: Report) {
  const index = report.pages.find((page) => page.path === ROOT_INDEX)
  if (!index) {
    report.errors.push(`${ROOT_INDEX}: missing, it must list every page`)
    return
  }
  const entries = parseIndexEntries(index)
  for (const entry of entries) {
    if (!entry.link.external && !linkExists(report, entry.link.resolved)) {
      report.errors.push(
        `${ROOT_INDEX}: lists ${entry.link.target}, which does not exist`,
      )
    }
  }
  for (const page of report.pages) {
    if (page.kind !== "concept") continue
    const entry = entries.find((item) => item.link.resolved === repoPath(page))
    if (!entry) {
      report.errors.push(`${page.path}: not listed in ${ROOT_INDEX}`)
      continue
    }
    checkIndexDescription(report, page, entry)
  }
}

/**
 * The index copies each page's description. It may put a status in front,
 * such as "Deprecated.", so the description only has to end the entry.
 */
function checkIndexDescription(report: Report, page: Page, entry: IndexEntry) {
  const description = page.frontmatter?.description
  if (typeof description !== "string") return
  if (!entry.description.endsWith(description)) {
    report.errors.push(
      `${ROOT_INDEX}: the entry for ${page.path} does not end with the page's description`,
    )
  }
}

export function lintBundle(pages: Page[], options: LintOptions): LintResult {
  const report: Report = { errors: [], notes: [], pages, options }
  for (const page of pages) {
    if (page.kind === "index") checkIndexFrontmatter(report, page)
    else if (page.kind === "log") checkLog(report, page)
    else {
      checkConcept(report, page)
      if (page.path.startsWith(DECISION_PREFIX)) checkDecision(report, page)
      checkLinksToSuperseded(report, page)
    }
    checkLinks(report, page)
    checkConflictMarkers(report, page)
  }
  checkDecisionNumbers(report)
  checkRootIndex(report)
  report.errors.push(...checkGlossaries(pages, options.glossaries))
  return { errors: report.errors, notes: report.notes }
}
