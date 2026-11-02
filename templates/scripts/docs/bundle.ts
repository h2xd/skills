/**
 * Reads the docs bundle into pages with parsed frontmatter and resolved links.
 *
 * Shared by the docs linter and the docs finder, so both agree on what a page,
 * a link and an index entry are. Paths come in two forms: a page path is
 * relative to the bundle root ("decisions/0001-x.md"), a resolved link is
 * relative to the repo root ("docs/decisions/0001-x.md", "packages/x/y.ts").
 */

import { readdir } from "node:fs/promises"
import { join, posix } from "node:path"
import { config } from "../config.ts"
import { readFile } from "node:fs/promises"
import { parseYaml } from "../yaml.ts"

export const BUNDLE_DIRECTORY = config.docs.root
export const DECISIONS_DIRECTORY = config.docs.decisions

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n/
const FENCED_CODE = /```[\s\S]*?```/g
const MARKDOWN_LINK = /\[([^\]]*)\]\(([^)\s]+)\)/g
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i
const INDEX_ENTRY = /^\* \[([^\]]+)\]\(([^)\s]+)\) - (.+)$/

type PageKind = "index" | "log" | "concept"

export type Link = {
  text: string
  target: string
  /** Repo-relative path, or the URL itself for an external link. */
  resolved: string
  external: boolean
}

export type Page = {
  path: string
  kind: PageKind
  frontmatter?: Record<string, unknown>
  frontmatterError?: string
  /** The whole file, frontmatter included, for checks that report line numbers. */
  text: string
  body: string
  links: Link[]
}

export type IndexEntry = {
  title: string
  link: Link
  description: string
}

function kindOf(path: string): PageKind {
  const filename = posix.basename(path)
  if (filename === "index.md") return "index"
  if (filename === "log.md") return "log"
  return "concept"
}

function withoutTrailingSlash(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path
}

/** Resolves a link target written on a page to a repo-relative path. */
export function resolveLink(
  pagePath: string,
  target: string,
): Link["resolved"] {
  const withoutAnchor = target.split("#")[0]
  const joined = withoutAnchor.startsWith("/")
    ? posix.join(BUNDLE_DIRECTORY, withoutAnchor)
    : posix.join(BUNDLE_DIRECTORY, posix.dirname(pagePath), withoutAnchor)
  return withoutTrailingSlash(posix.normalize(joined))
}

function extractLinks(pagePath: string, body: string): Link[] {
  const links: Link[] = []
  for (const [, text, target] of body
    .replace(FENCED_CODE, "")
    .matchAll(MARKDOWN_LINK)) {
    if (target.startsWith("#")) continue
    const external = URL_SCHEME.test(target)
    links.push({
      text,
      target,
      resolved: external ? target : resolveLink(pagePath, target),
      external,
    })
  }
  return links
}

export function parsePage(path: string, text: string): Page {
  const kind = kindOf(path)
  const match = text.match(FRONTMATTER)
  const body = match ? text.slice(match[0].length) : text
  const page: Page = {
    path,
    kind,
    text,
    body,
    links: extractLinks(path, body),
  }
  if (!match) return page
  try {
    const parsed = parseYaml(match[1])
    page.frontmatter =
      typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : {}
  } catch (error) {
    page.frontmatterError = String(error)
  }
  return page
}

export function parseIndexEntries(indexPage: Page): IndexEntry[] {
  const entries: IndexEntry[] = []
  for (const line of indexPage.body.split("\n")) {
    const match = line.match(INDEX_ENTRY)
    if (!match) continue
    const [, title, target, description] = match
    const external = URL_SCHEME.test(target)
    entries.push({
      title,
      description,
      link: {
        text: title,
        target,
        resolved: external ? target : resolveLink(indexPage.path, target),
        external,
      },
    })
  }
  return entries
}

/** The repo-relative path of a page, the form links resolve to. */
export function repoPath(page: Page): string {
  return posix.join(BUNDLE_DIRECTORY, page.path)
}

/**
 * YAML turns unquoted dates and timestamps into Date objects, and quoted ones
 * stay strings. Both forms mean the same thing in frontmatter.
 */
export function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) return value
  if (typeof value !== "string") return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export async function loadBundle(repoRoot: string): Promise<Page[]> {
  const bundleRoot = join(repoRoot, BUNDLE_DIRECTORY)
  const entries = await readdir(bundleRoot, { recursive: true })
  const paths = entries.filter((entry) => entry.endsWith(".md")).sort()
  return Promise.all(
    paths.map(async (path) =>
      parsePage(path, await readFile(join(bundleRoot, path), "utf8")),
    ),
  )
}
