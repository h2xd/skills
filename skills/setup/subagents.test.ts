import { readFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))
const read = (name: string) => readFileSync(join(dir, name), "utf8")

const ROLES = ["scout", "builder", "fixer", "reviewer"]

const toolTemplates = readdirSync(dir).filter((f) => f.startsWith("tool-"))

test("setup writes the four role pages and links the guide", () => {
  const guide = read("subagents.md")
  const skill = read("SKILL.md")
  for (const role of ROLES) assert.match(guide, new RegExp(`\`${role}\\.md\``))
  assert.match(skill, /\(subagents\.md\)/)
  assert.match(skill, /docs\/agents\/subagents\//)
})

test("the guide states the 40 line limit and the empty slot", () => {
  const guide = read("subagents.md")
  assert.match(guide, /at most 40 lines/)
  assert.match(guide, /### Other tools/)
})

test("every known tool has one template that names its roles and lines", () => {
  assert.ok(toolTemplates.length >= 1)
  const guide = read("subagents.md")
  for (const file of toolTemplates) {
    assert.ok(guide.includes(`(${file})`), `${file} is listed in subagents.md`)
    const text = read(file)
    const applies = text.match(/\*\*Applies to:\*\* (.+)/)
    assert.ok(applies, `${file} has Applies to`)
    for (const role of [...applies[1].matchAll(/`(\w+)\.md`/g)].map((m) => m[1])) {
      assert.ok(ROLES.includes(role), `${file}: unknown role ${role}`)
      assert.ok(text.includes(`\`${role}.md\`:`), `${file} has lines for ${role}`)
    }
  }
})

test("every tool template asks a question and names the values", () => {
  for (const file of toolTemplates) {
    const text = read(file)
    assert.match(text, /\*\*Ask:\*\* \S/, `${file} has Ask`)
    assert.match(text, /\*\*Values:\*\* \S/, `${file} has Values`)
  }
})

test("every role block of a tool template uses the load step and the call", () => {
  for (const file of toolTemplates) {
    const blocks = [...read(file).matchAll(/`(\w+)\.md`:\n\n```markdown\n([\s\S]*?)```/g)]
    assert.ok(blocks.length >= 1, `${file} has role blocks`)
    for (const [, role, body] of blocks) {
      assert.match(body, /\{\{LOAD\}\}/, `${file} ${role} uses LOAD`)
      assert.match(body, /\{\{CALL\}\}/, `${file} ${role} uses CALL`)
    }
  }
})

test("a re-run reads the existing pages and keeps the empty slot as written", () => {
  const guide = read("subagents.md")
  assert.match(guide, /On a re-run, read each existing role page first/)
  assert.match(guide, /Keep everything under `### Other tools` as written/)
  assert.match(guide, /A page\s+that exists keeps every line it has/)
})

test("setup asks the tool question", () => {
  assert.match(read("questions.md"), /## P\. Subagent tools/)
})
