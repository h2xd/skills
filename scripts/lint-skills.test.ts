import { describe, test } from "node:test"
import { expect } from "./expect.ts"
import { copyFileSync, mkdirSync, symlinkSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  BASELINE_PATH,
  EXEMPT,
  MAX_LINES,
  MAX_LINE_LENGTH,
  GUARD_EXCEPTIONS_PATH,
  GUARD_HOOK_PATH,
  guardPatterns,
  lintBlockedGit,
  lintAgentModel,
  lintCatalog,
  lintLinks,
  lintLongLines,
  lintSeeds,
  lintSkill,
  SEEDS_PATH,
  markdownFiles,
  dropStaleBaselineLines,
} from "./lint-skills.ts"

const GOOD = `---
name: demo
description: Do a thing. Use when the thing needs doing.
---

# Demo

### 1. Run

Run \`demo\`.
Done when it exits 0.

## Do

- Run it once.

## Don't

- Don't run it twice. Run it once.
`

describe("lintSkill", () => {
  test("reads a CRLF skill like an LF one", () => {
    expect(lintSkill("demo", GOOD.replace(/\n/g, "\r\n"))).toEqual([])
  })

  test("passes a skill that follows the rules", () => {
    expect(lintSkill("demo", GOOD)).toEqual([])
  })

  test("needs the name to match the folder", () => {
    expect(lintSkill("other", GOOD)).toEqual([`name "demo" differs from the folder "other"`])
  })

  test("needs a description that says when to use it", () => {
    const text = GOOD.replace(" Use when the thing needs doing.", "")
    expect(lintSkill("demo", text)).toEqual([`description does not say when to use the skill ("Use when …")`])
  })

  test("needs Do and Don't sections", () => {
    const text = GOOD.replace("## Do\n", "## Notes\n").replace("## Don't\n", "## More\n")
    expect(lintSkill("demo", text)).toEqual([`no "## Do" section`, `no "## Don't" section`])
  })

  test("needs a Done when in every numbered step", () => {
    const text = GOOD.replace("Done when it exits 0.\n", "")
    expect(lintSkill("demo", text)).toEqual([`step "Run" has no "Done when"`])
  })

  test("rejects parentheses and em dashes in prose, not in code or links", () => {
    const aside = GOOD.replace("Run `demo`.", "Run it (twice).")
    expect(lintSkill("demo", aside)).toEqual([
      "line 10: parentheses in prose. Write a sentence or a comma instead (add-soul rule 13)",
    ])
    const dash = GOOD.replace("Run `demo`.", "Run it — once.")
    expect(lintSkill("demo", dash)).toEqual([
      "line 10: em dash in prose. End the sentence or use a comma (add-soul rule 13)",
    ])
    const allowed = GOOD.replace("Run `demo`.", "Run `f(x)`, see [the guide](guide.md) and <placeholder (a)>.")
    expect(lintSkill("demo", allowed)).toEqual([])
  })

  test("ignores headings inside code blocks", () => {
    const text = GOOD.replace("Run `demo`.", "```markdown\n## Body\n```")
    expect(lintSkill("demo", text)).toEqual([])
  })

  test("caps the length", () => {
    const text = GOOD + "\n".repeat(MAX_LINES)
    expect(lintSkill("demo", text)[0]).toStartWith(`${GOOD.split("\n").length - 1 + MAX_LINES} lines`)
  })

  test("passes a skill of 180 lines and fails one of 181", () => {
    const base = GOOD.endsWith("\n") ? GOOD : GOOD + "\n"
    const baseLines = base.split("\n").length - 1
    const at180 = base + "\n".repeat(180 - baseLines)
    const at181 = base + "\n".repeat(181 - baseLines)
    expect(lintSkill("demo", at180)).toEqual([])
    expect(lintSkill("demo", at181)[0]).toStartWith("181 lines, over 180")
  })

  test("tells the writer to move text to a sibling file, not to cut a rule", () => {
    const text = GOOD + "\n".repeat(MAX_LINES)
    expect(lintSkill("demo", text)[0]).toContain("sibling file")
    expect(lintSkill("demo", text)[0]).toContain("Do not cut a rule to fit")
  })

  test("accepts a tool or model named as an example only", () => {
    const named = GOOD.replace("Run `demo`.", "Ask with AskUserQuestion.")
    expect(lintSkill("demo", named)).toEqual([
      `line 10: AskUserQuestion named as the only way. Describe the action, then "such as AskUserQuestion"`,
    ])
    const example = GOOD.replace("Run `demo`.", "Ask with the question tool, such as AskUserQuestion.")
    expect(lintSkill("demo", example)).toEqual([])
    const inCode = GOOD.replace("Run `demo`.", "```\nmodel: Opus\n```")
    expect(lintSkill("demo", inCode)).toEqual([])
  })
})

describe("lintLongLines", () => {
  const long = "x".repeat(MAX_LINE_LENGTH + 1)
  const path = "skills/demo/SKILL.md"

  test("names the file and the 1-based line of a long prose line", () => {
    const problems = lintLongLines(path, `short\n${long}\n`, {})
    expect(problems.length).toBe(1)
    expect(problems[0]).toStartWith(`${path}: line 2: ${long.length} characters, over ${MAX_LINE_LENGTH}.`)
    expect(problems[0]).toContain("--write-baseline")
  })

  test("allows a line that the baseline holds for that file", () => {
    expect(lintLongLines(path, `${long}\n`, { [path]: [long] })).toEqual([])
    expect(lintLongLines(path, `${long}\n`, { "other.md": [long] }).length).toBe(1)
  })

  test("skips fenced code, table rows and the frontmatter", () => {
    const text = `---\ndescription: ${long}\n---\n\n\`\`\`\n${long}\n\`\`\`\n\n| ${long} |\n`
    expect(lintLongLines(path, text, {})).toEqual([])
  })

  test("counts a leading thematic break as prose, not frontmatter", () => {
    expect(lintLongLines(path, `---\n\n${long}\n\n---\n`, {})).toHaveLength(1)
  })

  test("allows a line of exactly the limit", () => {
    expect(lintLongLines(path, `${"x".repeat(MAX_LINE_LENGTH)}\n`, {})).toEqual([])
  })

  test("keeps an indented baseline line when the baseline shrinks", () => {
    const text = `short\n  - ${long}\n`
    const baseline = dropStaleBaselineLines({ [path]: [`  - ${long}`] }, [{ path, text }])
    expect(baseline).toEqual({ [path]: [`  - ${long}`] })
    expect(lintLongLines(path, text, baseline)).toEqual([])
  })
})

describe("lintLongLines edge cases", () => {
  const long = "x".repeat(MAX_LINE_LENGTH + 1)
  const path = "skills/demo/SKILL.md"

  test("a CRLF file passes with a baseline built from its LF text", () => {
    const text = `---\nname: a\ndescription: ${long}\n---\n\n${long}\n`
    const baseline = { [path]: [long] }
    expect(lintLongLines(path, text.replace(/\n/g, "\r\n"), baseline)).toEqual([])
  })

  test("a baseline line pasted a second time gives one problem", () => {
    const problems = lintLongLines(path, `${long}\nshort\n${long}\n`, { [path]: [long] })
    expect(problems.length).toBe(1)
    expect(problems[0]).toStartWith(`${path}: line 3:`)
  })

  test("counts code points, so a status marker counts as one", () => {
    const line = `${"a".repeat(MAX_LINE_LENGTH - 2)}🔴🔴`
    expect(lintLongLines(path, `${line}\n`, {})).toEqual([])
    expect(lintLongLines(path, `${line}🔴\n`, {})[0]).toContain(`${MAX_LINE_LENGTH + 1} characters`)
  })

  test("skips a fence indented under a numbered step, and a ~~~ fence", () => {
    const text = `1. step\n\n   \`\`\`sh\n   ${long}\n   \`\`\`\n\n~~~\n${long}\n~~~\n`
    expect(lintLongLines(path, text, {})).toEqual([])
  })
})

describe("dropStaleBaselineLines", () => {
  const long = "x".repeat(MAX_LINE_LENGTH + 1)
  const other = "y".repeat(MAX_LINE_LENGTH + 1)
  const path = "a.md"

  test("never adds a new long line", () => {
    const shrunk = dropStaleBaselineLines({ [path]: [long] }, [{ path, text: `${long}\n${other}\n` }])
    expect(shrunk).toEqual({ [path]: [long] })
  })

  test("drops a wrapped line and a copy that is gone", () => {
    expect(dropStaleBaselineLines({ [path]: [long, other] }, [{ path, text: `${long}\n` }])).toEqual({ [path]: [long] })
    expect(dropStaleBaselineLines({ [path]: [long, long] }, [{ path, text: `${long}\n` }])).toEqual({ [path]: [long] })
    expect(dropStaleBaselineLines({ [path]: [long] }, [{ path, text: "short\n" }])).toEqual({})
  })
})

describe("lintCatalog", () => {
  const row = (name: string) => `| Do ${name} | \`h2xd:${name}\` |`

  test("passes when folders and rows match one to one", () => {
    expect(lintCatalog(["a", "b"], [row("a"), row("b")].join("\n"))).toEqual([])
  })

  test("names a missing row, a duplicate row and a row without a folder", () => {
    expect(lintCatalog(["a", "b"], [row("a"), row("a"), row("c")].join("\n"))).toEqual([
      "skills/next/catalog.md: a has 2 rows in the catalog table, needs 1",
      "skills/next/catalog.md: b has 0 rows in the catalog table, needs 1",
      "skills/next/catalog.md: row h2xd:c has no folder in skills/",
    ])
  })
})

describe("the skills in this repo", () => {
  const root = join(import.meta.dirname, "..", "skills")

  test("the catalog of next lists every skill", () => {
    expect(lintCatalog(readdirSync(root).sort(), readFileSync(join(root, "next", "catalog.md"), "utf8"))).toEqual([])
  })

  for (const folder of readdirSync(root).filter((name) => !EXEMPT.has(name))) {
    test(folder, () => {
      const text = readFileSync(join(root, folder, "SKILL.md"), "utf8")
      expect(lintSkill(folder, text)).toEqual([])
    })
  }
})

describe("lintSeeds", () => {
  function seedsRoot(seeds: Record<string, string>): string {
    const root = mkdtempSync(join(tmpdir(), "seeds-"))
    for (const [folder, text] of Object.entries(seeds)) {
      mkdirSync(join(root, folder))
      writeFileSync(join(root, folder, "SKILL.md"), text)
    }
    return root
  }

  test("passes a seed that follows the rules", () => {
    const root = seedsRoot({ demo: GOOD })
    try {
      expect(lintSeeds(root)).toEqual([])
    } finally {
      rmSync(root, { recursive: true })
    }
  })

  test("names the seed file and the rule it breaks", () => {
    const root = seedsRoot({ demo: GOOD.replace("## Do\n", "## Done\n") })
    try {
      expect(lintSeeds(root)).toEqual([`${SEEDS_PATH}/demo/SKILL.md: no "## Do" section`])
    } finally {
      rmSync(root, { recursive: true })
    }
  })

  test("treats a missing seeds folder as no seeds", () => {
    expect(lintSeeds(join(tmpdir(), "no-such-seeds-folder"))).toEqual([])
  })
})

describe("the lint command on a repo with one seed", () => {
  function lintRepoWithSeed(seed: string): { status: number | null; stderr: string } {
    const root = mkdtempSync(join(tmpdir(), "lint-cli-"))
    const source = join(import.meta.dirname, "..")
    try {
      const folders = ["scripts", "templates/hooks", "templates/scripts", "skills/next", "agents", ".claude/skills", `${SEEDS_PATH}/demo`]
      for (const dir of folders) mkdirSync(join(root, dir), { recursive: true })
      for (const file of ["scripts/lint-skills.ts", GUARD_HOOK_PATH, "templates/scripts/yaml.ts"]) {
        copyFileSync(join(source, file), join(root, file))
      }
      writeFileSync(join(root, BASELINE_PATH), "{}")
      writeFileSync(join(root, GUARD_EXCEPTIONS_PATH), "[]")
      writeFileSync(join(root, "skills/next/SKILL.md"), GOOD.replace("name: demo", "name: next"))
      writeFileSync(join(root, "skills/next/catalog.md"), "| Skill | `h2xd:next` |\n")
      symlinkSync("../../skills/next", join(root, ".claude/skills/next"))
      writeFileSync(join(root, SEEDS_PATH, "demo", "SKILL.md"), seed)
      const run = spawnSync("node", ["scripts/lint-skills.ts"], { cwd: root, encoding: "utf8" })
      return { status: run.status, stderr: run.stderr }
    } finally {
      rmSync(root, { recursive: true })
    }
  }

  test("passes a seed that follows the rules", () => {
    expect(lintRepoWithSeed(GOOD).status).toBe(0)
  })

  test("fails with the path of a seed that breaks a rule", () => {
    const run = lintRepoWithSeed(GOOD.replace("## Do\n", "## Done\n"))
    expect(run.status).toBe(1)
    expect(run.stderr).toContain(`${SEEDS_PATH}/demo/SKILL.md: no "## Do" section`)
  })

  test("fails a seed that names a blocked git command", () => {
    const run = lintRepoWithSeed(GOOD.replace("Run `demo`.", "Run `git reset --hard`."))
    expect(run.status).toBe(1)
    expect(run.stderr).toContain(`${SEEDS_PATH}/demo/SKILL.md: line 10: names a blocked command: git reset --hard`)
  })
})

describe("the seeds in this repo", () => {
  test("every seed follows the rules of add-skill", () => {
    expect(lintSeeds(join(import.meta.dirname, "..", SEEDS_PATH))).toEqual([])
  })

  test("lang-ts-base is a seed and no longer a shipped skill", () => {
    const repo = join(import.meta.dirname, "..")
    expect(readdirSync(join(repo, SEEDS_PATH))).toContain("lang-ts-base")
    expect(readdirSync(join(repo, "skills"))).not.toContain("lang-ts-base")
  })
})

describe("the agents in this repo", () => {
  const root = join(import.meta.dirname, "..", "agents")

  for (const name of readdirSync(root).filter((n) => n.endsWith(".md"))) {
    test(name, () => {
      expect(lintAgentModel(`agents/${name}`, readFileSync(join(root, name), "utf8"))).toEqual([])
    })
  }
})

describe("the long lines in this repo", () => {
  const repo = join(import.meta.dirname, "..")
  const baseline = JSON.parse(readFileSync(join(repo, BASELINE_PATH), "utf8"))

  for (const path of ["skills", "agents", SEEDS_PATH].flatMap((dir) => markdownFiles(join(repo, dir), dir))) {
    test(path, () => {
      expect(lintLongLines(path, readFileSync(join(repo, path), "utf8"), baseline)).toEqual([])
    })
  }

  test("the baseline holds no line that is gone or short", () => {
    const files = ["skills", "agents", SEEDS_PATH]
      .flatMap((dir) => markdownFiles(join(repo, dir), dir))
      .map((path) => ({ path, text: readFileSync(join(repo, path), "utf8") }))
    expect(dropStaleBaselineLines(baseline, files)).toEqual(baseline)
  })
})

describe("lintLinks", () => {
  const shipped = ["demo", "other"]
  const linked = [
    { name: "demo", target: "../../skills/demo" },
    { name: "other", target: "../../skills/other" },
  ]

  test("passes a link per shipped skill and a real folder for an internal one", () => {
    expect(lintLinks(shipped, [...linked, { name: "release", target: null }])).toEqual([])
  })

  test("names a shipped skill without a link", () => {
    expect(lintLinks(shipped, linked.slice(0, 1))).toEqual([
      ".claude/skills/other: missing, run ln -s ../../skills/other .claude/skills/other",
    ])
  })

  test("names a link to the wrong place", () => {
    expect(lintLinks(["demo"], [{ name: "demo", target: "../skills/demo" }])).toEqual([
      ".claude/skills/demo: links to ../skills/demo, needs ../../skills/demo",
    ])
  })

  test("names a link without a shipped skill", () => {
    expect(lintLinks([], [{ name: "gone", target: "../../skills/gone" }])).toEqual([
      ".claude/skills/gone: links to ../../skills/gone, which is not a skill in skills/",
    ])
  })

  test("names an internal skill that shadows a shipped one", () => {
    expect(lintLinks(["demo"], [{ name: "demo", target: null }])).toEqual([
      ".claude/skills/demo: a folder, needs a link to ../../skills/demo",
    ])
  })
})

describe("lintBlockedGit", () => {
  const repo = join(import.meta.dirname, "..")
  const patterns = guardPatterns(readFileSync(join(repo, GUARD_HOOK_PATH), "utf8"))
  const path = "skills/demo/SKILL.md"

  const parallelAtB14aabf = [
    "For each build worker whose commits are on the ticket branch:",
    "",
    "```sh",
    "git worktree remove <path>",
    "git branch -D <ticket branch>-w<id>",
    "```",
    "",
  ].join("\n")

  test("reads every check of the hook", () => {
    expect(patterns.map((p) => p.reason)).toEqual([
      "force push or remote delete",
      "git push",
      "git reset --hard",
      "git clean -f",
      "git branch -D",
      "git checkout .",
      "git restore .",
    ])
  })

  test("fails the parallel.md of commit b14aabf, with file, line and pattern", () => {
    expect(lintBlockedGit("skills/code-implement/parallel.md", parallelAtB14aabf, patterns)).toEqual([
      `skills/code-implement/parallel.md: line 5: names a blocked command: git branch -D. Use another command, or add a reason to ${GUARD_EXCEPTIONS_PATH}`,
    ])
  })

  test("checks inline code", () => {
    const text = "Run `git reset --hard` to start over.\n"
    expect(lintBlockedGit(path, text, patterns)).toHaveLength(1)
  })

  test("ignores prose outside code", () => {
    expect(lintBlockedGit(path, "Never git reset --hard here.\n", patterns)).toEqual([])
  })

  test("allows a plain push and a safe command", () => {
    const text = "```sh\ngit push origin main\ngit worktree remove <path>\n```\n"
    expect(lintBlockedGit(path, text, patterns)).toEqual([])
  })

  test("blocks a force push, even behind global options", () => {
    const text = "```sh\ngit -C dir push --force\n```\n"
    expect(lintBlockedGit(path, text, patterns)).toHaveLength(1)
  })

  test("an exception for a line skips that line only", () => {
    const text = "```sh\ngit branch -D a\ngit reset --hard\n```\n"
    const exceptions = [{ file: path, line: "git branch -D", reason: "demo" }]
    expect(lintBlockedGit(path, text, patterns, exceptions)).toHaveLength(1)
  })

  test("an exception with no line skips the file", () => {
    const text = "```sh\ngit reset --hard\n```\n"
    expect(lintBlockedGit(path, text, patterns, [{ file: path, reason: "demo" }])).toEqual([])
  })

  test("every exception in the data file has a reason", () => {
    const exceptions = JSON.parse(readFileSync(join(repo, GUARD_EXCEPTIONS_PATH), "utf8"))
    for (const e of exceptions) expect(typeof e.reason === "string" && e.reason.length > 0).toBe(true)
  })
})

describe("the blocked commands in the skills of this repo", () => {
  const repo = join(import.meta.dirname, "..")
  const patterns = guardPatterns(readFileSync(join(repo, GUARD_HOOK_PATH), "utf8"))
  const exceptions = JSON.parse(readFileSync(join(repo, GUARD_EXCEPTIONS_PATH), "utf8"))

  for (const path of markdownFiles(join(repo, "skills"), "skills")) {
    test(path, () => {
      expect(lintBlockedGit(path, readFileSync(join(repo, path), "utf8"), patterns, exceptions)).toEqual([])
    })
  }
})

describe("lintAgentModel", () => {
  const agent = (extra: string) => `---\nname: a\ndescription: d\ntools: Read\n${extra}---\n\n# A\n`

  test("passes an agent that names its model", () => {
    expect(lintAgentModel("agents/a.md", agent("model: haiku\n"))).toEqual([])
  })

  test("names the file of an agent without a model", () => {
    expect(lintAgentModel("agents/a.md", agent(""))).toEqual([
      "agents/a.md: no model in the frontmatter. Add a model line, such as model: haiku",
    ])
  })

  test("fails an empty or blank model value", () => {
    const message = "agents/a.md: no model in the frontmatter. Add a model line, such as model: haiku"
    expect(lintAgentModel("agents/a.md", agent('model: ""\n'))).toEqual([message])
    expect(lintAgentModel("agents/a.md", agent('model: " "\n'))).toEqual([message])
  })

  test("fails an agent without frontmatter", () => {
    expect(lintAgentModel("agents/a.md", "# A\n")).toEqual(["agents/a.md: no frontmatter"])
  })
})
