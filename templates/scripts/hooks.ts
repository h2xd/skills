#!/usr/bin/env node
/**
 * Copies the plugin's git hooks into a repo and keeps the repo's own lines.
 *
 *   node scripts/hooks.ts <plugin root> <repo root>
 *
 * Run the plugin's own copy of this script. A target repo's copy is never run,
 * as with `drift.ts`: it needs the plugin's templates. For each file in
 * `templates/githooks`, it compares the repo's `.githooks/<hook>` with the
 * template and with the earlier template in `templates/githooks-earlier`.
 * Lines that the repo added move to `.githooks/<hook>.d/50-local`.
 * Exit codes: 0 when every hook is done, 1 when a hook needs the user
 * (`50-local` exists, or the extra lines do not parse alone), 2 on a usage error.
 */

import { spawnSync } from "node:child_process"
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { planHook } from "./hooks/merge.ts"

const [pluginRoot, repoRoot] = process.argv.slice(2)
if (!pluginRoot || !repoRoot) {
  console.error("usage: node scripts/hooks.ts <plugin root> <repo root>")
  process.exit(2)
}

function readIfExists(path: string): string | null {
  return existsSync(path) ? readFileSync(path, "utf8") : null
}

function parses(script: string): boolean {
  const directory = mkdtempSync(join(tmpdir(), "hook-parse-"))
  try {
    const path = join(directory, "script")
    writeFileSync(path, script)
    return spawnSync("sh", ["-n", path]).status === 0
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

const templates = join(pluginRoot, "templates", "githooks")
const earlierDirectory = join(pluginRoot, "templates", "githooks-earlier")
let needsUser = false

for (const hook of readdirSync(templates).sort()) {
  const template = readFileSync(join(templates, hook), "utf8")
  const earlierText = readIfExists(join(earlierDirectory, hook))
  const target = join(repoRoot, ".githooks", hook)
  const localPath = join(repoRoot, ".githooks", `${hook}.d`, "50-local")
  const plan = planHook({
    repoHook: readIfExists(target),
    template,
    earlier: earlierText === null ? [] : [earlierText],
    localExists: existsSync(localPath),
    parses,
  })

  const install = () => {
    mkdirSync(join(repoRoot, ".githooks"), { recursive: true })
    writeFileSync(target, template, { mode: 0o755 })
    chmodSync(target, 0o755)
  }

  switch (plan.kind) {
    case "copy":
      install()
      console.log(`${hook}: copied`)
      break
    case "same":
      console.log(`${hook}: unchanged`)
      break
    case "replace-unedited":
      install()
      console.log(`${hook}: unedited, replaced`)
      break
    case "move": {
      mkdirSync(join(repoRoot, ".githooks", `${hook}.d`), { recursive: true })
      writeFileSync(localPath, plan.local, { mode: 0o755 })
      chmodSync(localPath, 0o755)
      install()
      const count = plan.local.split("\n").length - 2
      console.log(`${hook}: moved ${count} lines to .githooks/${hook}.d/50-local`)
      for (const line of plan.local.split("\n").slice(1, -1)) console.log(`  ${line}`)
      break
    }
    case "ask":
      needsUser = true
      console.log(`${hook}: 50-local exists, ask the user`)
      break
    case "manual":
      needsUser = true
      console.log(`${hook}: ${plan.lines.length} repo lines do not parse alone, merge them by hand`)
      break
  }
}

process.exit(needsUser ? 1 : 0)
