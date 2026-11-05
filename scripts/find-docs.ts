#!/usr/bin/env node
/**
 * Finds docs pages by frontmatter and links. Filters combine with AND.
 *
 *   node scripts/find-docs.ts --type Decision --status accepted
 *   node scripts/find-docs.ts --tag deployment
 *   node scripts/find-docs.ts --type Decision --search "session cache"
 *   node scripts/find-docs.ts --links-to src/payments
 *   node scripts/find-docs.ts --backlinks decisions/0001-use-postgres.md
 *   node scripts/find-docs.ts --stale
 *   node scripts/find-docs.ts --orphans
 *
 * Prints one page per line and exits 1 when nothing matches.
 */

import { parseArgs } from "node:util"
import { REPO_ROOT } from "./config.ts"
import { loadBundle } from "./docs/bundle.ts"
import { findPages, formatPage } from "./docs/find.ts"

const { values } = parseArgs({
  options: {
    type: { type: "string" },
    status: { type: "string" },
    tag: { type: "string" },
    search: { type: "string" },
    "links-to": { type: "string" },
    backlinks: { type: "string" },
    stale: { type: "boolean" },
    orphans: { type: "boolean" },
    help: { type: "boolean" },
  },
})

if (values.help) {
  console.log(
    "usage: node scripts/find-docs.ts [--type T] [--status S] [--tag T] [--search WORDS] [--links-to PATH] [--backlinks PAGE] [--stale] [--orphans]",
  )
  process.exit(0)
}

const pages = await loadBundle(REPO_ROOT)
const found = findPages(
  pages,
  {
    type: values.type,
    status: values.status,
    tag: values.tag,
    search: values.search,
    linksTo: values["links-to"],
    backlinks: values.backlinks,
    stale: values.stale,
    orphans: values.orphans,
  },
  new Date(),
)

for (const page of found) console.log(formatPage(page))
if (found.length === 0) {
  console.error("docs:find: no page matches")
  process.exit(1)
}
