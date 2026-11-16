import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, test } from "node:test"
import { expect } from "../../scripts/expect.ts"
import { envWithoutGit } from "../../scripts/test-env.ts"

const SCRIPT = join(import.meta.dirname, "hooks.ts")
const TEMPLATE = "#!/bin/sh\necho new\n"
const EARLIER = "#!/bin/sh\necho old\n"

let root: string
let plugin: string
let repo: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "hooks-cli-"))
  plugin = join(root, "plugin")
  repo = join(root, "repo")
  mkdirSync(join(plugin, "templates", "githooks"), { recursive: true })
  mkdirSync(join(plugin, "templates", "githooks-earlier"))
  mkdirSync(join(repo, ".githooks"), { recursive: true })
  writeFileSync(join(plugin, "templates", "githooks", "pre-commit"), TEMPLATE)
  writeFileSync(join(plugin, "templates", "githooks-earlier", "pre-commit"), EARLIER)
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

function run(...args: string[]) {
  const result = spawnSync("node", [SCRIPT, ...args], { encoding: "utf8", env: envWithoutGit() })
  return { status: result.status, out: result.stdout.trim(), err: result.stderr }
}

const mode = (path: string) => statSync(path).mode & 0o777
const hookPath = () => join(repo, ".githooks", "pre-commit")
const localPath = () => join(repo, ".githooks", "pre-commit.d", "50-local")

describe("hooks.ts", () => {
  test("a usage error exits 2", () => {
    expect(run(plugin).status).toBe(2)
  })

  test("copies a hook the repo does not have", () => {
    const result = run(plugin, repo)
    expect(result).toEqual({ status: 0, out: "pre-commit: copied", err: "" })
    expect(readFileSync(hookPath(), "utf8")).toBe(TEMPLATE)
    expect(mode(hookPath())).toBe(0o755)
  })

  test("moves the repo's own lines to 50-local, then copies", () => {
    writeFileSync(hookPath(), `${EARLIER}npm run lint:extra\n`)
    const result = run(plugin, repo)
    expect(result.status).toBe(0)
    expect(result.out).toBe("pre-commit: moved 1 lines to .githooks/pre-commit.d/50-local")
    expect(readFileSync(localPath(), "utf8")).toBe("#!/bin/sh\nnpm run lint:extra\n")
    expect(mode(localPath())).toBe(0o755)
    expect(readFileSync(hookPath(), "utf8")).toBe(TEMPLATE)
    expect(mode(hookPath())).toBe(0o755)
  })

  test("asks and writes nothing when 50-local exists", () => {
    const edited = `${EARLIER}npm run lint:extra\n`
    writeFileSync(hookPath(), edited)
    mkdirSync(join(repo, ".githooks", "pre-commit.d"))
    writeFileSync(localPath(), "#!/bin/sh\nmine\n")
    const result = run(plugin, repo)
    expect(result.status).toBe(1)
    expect(result.out).toBe("pre-commit: 50-local exists, ask the user")
    expect(readFileSync(hookPath(), "utf8")).toBe(edited)
    expect(readFileSync(localPath(), "utf8")).toBe("#!/bin/sh\nmine\n")
  })

  test("reports unchanged and unedited hooks", () => {
    writeFileSync(hookPath(), TEMPLATE)
    expect(run(plugin, repo).out).toBe("pre-commit: unchanged")
    writeFileSync(hookPath(), EARLIER)
    expect(run(plugin, repo).out).toBe("pre-commit: unedited, replaced")
    expect(readFileSync(hookPath(), "utf8")).toBe(TEMPLATE)
  })

  test("names a hand merge and exits 1", () => {
    writeFileSync(hookPath(), `${EARLIER}if true; then\n`)
    const result = run(plugin, repo)
    expect(result.status).toBe(1)
    expect(result.out).toBe("pre-commit: 1 repo lines do not parse alone, merge them by hand")
  })
})
