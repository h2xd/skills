/**
 * The queries behind `node scripts/find-docs.ts`, as pure functions over parsed pages.
 *
 * Every filter reads frontmatter or resolved links, never the prose, so a page
 * that merely mentions a word does not match.
 */

import { BUNDLE_DIRECTORY, type Page, repoPath, toDate } from "./bundle.ts"

export type Query = {
  type?: string
  /** Prefix match, so "superseded" finds "superseded by ADR-0009". */
  status?: string
  tag?: string
  /**
   * Words that must all appear, in any case, in the title, description or
   * tags. Still frontmatter only: it finds what a page says it is about.
   */
  search?: string
  /** A repo-relative file or directory. Matches links to it or below it. */
  linksTo?: string
  /** A page, as "decisions/x.md", "/decisions/x.md" or "docs/decisions/x.md". */
  backlinks?: string
  stale?: boolean
  /** Pages no other concept page links to. The index and log don't count. */
  orphans?: boolean
}

/** OKF treats a page without `status` as stable. */
function statusOf(page: Page): string {
  const status = page.frontmatter?.status
  return typeof status === "string" ? status : "stable"
}

function normalizeRepoPath(path: string): string {
  return path.replace(/^\.\//, "").replace(/\/+$/, "")
}

function normalizePagePath(path: string): string {
  const withoutSlash = path.replace(/^\//, "")
  return withoutSlash.startsWith(`${BUNDLE_DIRECTORY}/`)
    ? withoutSlash
    : `${BUNDLE_DIRECTORY}/${withoutSlash}`
}

function isUnder(resolved: string, target: string): boolean {
  return resolved === target || resolved.startsWith(`${target}/`)
}

function linkedFromConcepts(pages: Page[]): Set<string> {
  return new Set(
    pages
      .filter((page) => page.kind === "concept")
      .flatMap((page) => page.links.map((link) => link.resolved)),
  )
}

function mentionsAll(
  frontmatter: Record<string, unknown>,
  search: string,
): boolean {
  const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : []
  const haystack = [frontmatter.title, frontmatter.description, ...tags]
    .map((value) => String(value ?? ""))
    .join(" ")
    .toLowerCase()
  return search
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word !== "")
    .every((word) => haystack.includes(word))
}

function matches(
  page: Page,
  query: Query,
  now: Date,
  linkedPaths: Set<string>,
): boolean {
  const frontmatter = page.frontmatter ?? {}
  if (query.type) {
    const type = String(frontmatter.type ?? "")
    if (type.toLowerCase() !== query.type.toLowerCase()) return false
  }
  if (query.status && !statusOf(page).startsWith(query.status)) return false
  if (query.tag) {
    const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : []
    if (!tags.includes(query.tag)) return false
  }
  if (query.search && !mentionsAll(frontmatter, query.search)) return false
  if (query.linksTo) {
    const target = normalizeRepoPath(query.linksTo)
    const linked = page.links.some(
      (link) => !link.external && isUnder(link.resolved, target),
    )
    if (!linked) return false
  }
  if (query.backlinks) {
    const target = normalizePagePath(query.backlinks)
    if (!page.links.some((link) => link.resolved === target)) return false
  }
  if (query.stale) {
    const staleAfter = toDate(frontmatter.stale_after)
    if (!staleAfter || staleAfter > now) return false
  }
  if (query.orphans && linkedPaths.has(repoPath(page))) return false
  return true
}

/** Concept pages matching every filter in the query. Index and log never match. */
export function findPages(pages: Page[], query: Query, now: Date): Page[] {
  const linkedPaths = linkedFromConcepts(pages)
  return pages.filter(
    (page) => page.kind === "concept" && matches(page, query, now, linkedPaths),
  )
}

export function formatPage(page: Page): string {
  const type = String(page.frontmatter?.type ?? "?")
  const title = String(page.frontmatter?.title ?? page.path)
  return `${repoPath(page)}  [${type}, ${statusOf(page)}]  ${title}`
}
