import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (p: string) =>
  readFileSync(new URL(`../${p}`, import.meta.url), "utf8").replace(/\s+/g, " ");

const MISSING = "missing, run /h2xd:setup";

const launches: [string, string, string, string][] = [
  ["scout", "code-implement/planning.md", "scout", "code-implement/planning.md"],
  ["build worker", "code-implement/SKILL.md", "builder", "code-implement/parallel.md"],
  ["parallel build worker", "code-implement/parallel.md", "builder", "code-implement/parallel.md"],
  ["fixer", "review-fix/SKILL.md", "fixer", "review-fix/launch.md"],
  ["reviewer", "review-pr/SKILL.md", "reviewer", "review-pr/reviewers.md"],
];

for (const [name, launch, role, rule] of launches) {
  const page = `docs/agents/subagents/${role}.md`;
  test(`the ${name} launch step passes ${page}`, () => {
    assert.ok(read(launch).includes(page), `${launch} lacks ${page}`);
  });
  test(`a missing ${role} page gives the setup line`, () => {
    assert.ok(read(rule).includes(`${page}: ${MISSING}`), `${rule} lacks it`);
  });
}

test("the report layout has the missing-page line", () => {
  assert.ok(read("code-implement/report.md").includes(MISSING));
});
