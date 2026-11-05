#!/usr/bin/env node
/**
 * Checks that the docs bundle is a conformant Open Knowledge Format (OKF v0.2)
 * bundle with MADR decision records and an index that matches the pages.
 *
 * Run by .githooks/pre-commit and CI. The checks live in scripts/docs/lint.ts.
 */

import { existsSync } from "node:fs"
import { join } from "node:path"
import { config, REPO_ROOT } from "./config.ts"
import { BUNDLE_DIRECTORY, loadBundle } from "./docs/bundle.ts"
import { lintBundle } from "./docs/lint.ts"

const pages = await loadBundle(REPO_ROOT)
const { errors, notes } = lintBundle(pages, {
  exists: (repoRelativePath) => existsSync(join(REPO_ROOT, repoRelativePath)),
  now: new Date(),
  decisionIssueRequiredFrom: config.docs.decisionIssueRequiredFrom,
  glossaries: config.docs.glossaries,
})

for (const note of notes) console.log(`note: ${note}`)

if (errors.length > 0) {
  console.error(
    `\ndocs:lint: ${BUNDLE_DIRECTORY} is not a conformant OKF bundle.\n`,
  )
  for (const error of errors) console.error(`  - ${error}`)
  console.error("\nSee the h2xd:docs-wiki skill.\n")
  process.exit(1)
}

console.log(`docs:lint: ${pages.length} files in ${BUNDLE_DIRECTORY} conform`)
