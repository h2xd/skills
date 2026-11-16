#!/usr/bin/env node
/**
 * Names the copies in a repo that are older than the plugin.
 *
 *   node scripts/drift.ts <plugin root> <repo root>
 *
 * Compares the version that `h2xd:setup` wrote into the repo's
 * `agents.config.json` with the plugin's `.claude-plugin/plugin.json`, and the
 * content of each copied file with its template. Run the plugin's own copy of
 * this script, so a repo that predates it can be checked too. Prints one
 * report, and exits 1 on any drift.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { type DriftFile, findDrift, formatDrift, hasDrift } from "./drift/check.ts"

const [pluginRoot, repoRoot] = process.argv.slice(2)
if (!pluginRoot || !repoRoot) {
  console.error("usage: node scripts/drift.ts <plugin root> <repo root>")
  process.exit(2)
}

function readIfExists(path: string): string | null {
  return existsSync(path) ? readFileSync(path, "utf8") : null
}

function filesIn(directory: string): string[] {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.endsWith(".test.ts"))
    .map((entry) => join(entry.parentPath, entry.name).slice(directory.length + 1))
    .sort()
}

/** A template folder, the folder it is copied to, and whether a repo may lack the copy. */
const COPIES = [
  { from: "templates/scripts", to: "scripts", optional: false },
  { from: "templates/githooks", to: ".githooks", optional: false },
  { from: "templates/workflows", to: ".github/workflows", optional: true },
  { from: "templates/hooks", to: ".claude/hooks", optional: true },
]

const files: DriftFile[] = COPIES.flatMap(({ from, to, optional }) => {
  const directory = join(pluginRoot, from)
  if (!existsSync(directory)) return []
  return filesIn(directory).map((file) => ({
    path: `${to}/${file}`,
    template: readFileSync(join(directory, file), "utf8"),
    copy: readIfExists(join(repoRoot, to, file)),
    optional,
  }))
})

const plugin = JSON.parse(readFileSync(join(pluginRoot, ".claude-plugin/plugin.json"), "utf8"))
const configText = readIfExists(join(repoRoot, "agents.config.json"))
const repoVersion: unknown = configText === null ? null : JSON.parse(configText).version

const report = findDrift({
  repoVersion: typeof repoVersion === "string" ? repoVersion : null,
  pluginVersion: plugin.version,
  files,
})
console.log(formatDrift(report))
process.exit(hasDrift(report) ? 1 : 0)
