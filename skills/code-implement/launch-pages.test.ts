import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { test } from "node:test";

const read = (p: string) =>
  readFileSync(new URL(`../${p}`, import.meta.url), "utf8").replace(/\s+/g, " ");

const MISSING = "missing, run /h2xd:setup";

const GIVE = /(?:Give (?:it|each one)|Each prompt holds) the paths to .*?\.(?= |$)/g;

const launches: [string, string, string, string, string][] = [
  ["scout", "code-implement/planning.md", "scout.md", "scout", "code-implement/missing-page.md"],
  ["build worker", "code-implement/SKILL.md", "worker-1.md", "builder", "code-implement/missing-page.md"],
  ["parallel build worker", "code-implement/parallel.md", "worker-<id>.md", "builder", "code-implement/missing-page.md"],
  ["fix worker", "code-implement/parallel.md", "fix-worker.md", "builder", "code-implement/missing-page.md"],
  ["fixer", "review-fix/SKILL.md", "fixer.md", "fixer", "review-fix/launch.md"],
  ["reviewer", "review-pr/SKILL.md", "reviewer-brief.md", "reviewer", "review-pr/reviewers.md"],
];

const launchPath = (role: string, rule: string) =>
  rule.startsWith("code-implement/")
    ? `<repo root>/docs/agents/subagents/${role}.md`
    : `$WORK/${role}-tools.md`;

for (const [name, launch, marker, role, rule] of launches) {
  const page = launchPath(role, rule);
  test(`the ${name} launch sentence passes ${page}`, () => {
    const sentence = (read(launch).match(GIVE) ?? []).find((s) => s.includes(marker));
    assert.ok(sentence, `${launch} has no launch sentence with ${marker}`);
    assert.ok(sentence.includes(page), `${launch}: "${sentence}" lacks ${page}`);
  });
}

for (const role of new Set(launches.map((l) => l[3]))) {
  const rule = launches.find((l) => l[3] === role)![4];
  test(`a missing ${role} page gives the setup line in ${rule}`, () => {
    const page = `docs/agents/subagents/${role}.md`;
    assert.ok(read(rule).includes(`${page}: ${MISSING}`), `${rule} lacks it`);
  });
}

for (const rule of new Set(launches.map((l) => l[4]))) {
  const skip = rule.startsWith("review-pr/") ? /Leave it out of the posted review/ : /without its path/;
  test(`${rule} skips the page and goes on`, () => {
    assert.match(read(rule), skip);
  });
}

for (const role of ["fixer", "reviewer"]) {
  const rule = role === "fixer" ? "review-fix/launch.md" : "review-pr/reviewers.md";
  test(`${rule} reads the ${role} page from the base branch`, () => {
    const copy = `git show origin/<base>:docs/agents/subagents/${role}.md > $WORK/${role}-tools.md`;
    assert.ok(read(rule).includes(copy), `${rule} lacks ${copy}`);
  });
}

for (const launch of new Set(launches.map((l) => l[1]))) {
  for (const rule of new Set(launches.filter((l) => l[1] === launch).map((l) => l[4]))) {
    const rows = launches.filter((l) => l[1] === launch && l[4] === rule).length;
    test(`${launch} links ${rule} once per launch`, () => {
      const links = read(launch).split(`](${basename(rule)})`).length - 1;
      assert.ok(links >= rows, `${launch} links ${basename(rule)} ${links} times, needs ${rows}`);
    });
  }
}

test("the report layout has the missing-page line", () => {
  assert.ok(read("code-implement/report.md").includes(MISSING));
});

test("the chat layouts of review-fix and review-pr have the missing-page line", () => {
  for (const [file, role] of [["review-fix/SKILL.md", "fixer"], ["review-pr/SKILL.md", "reviewer"]]) {
    assert.ok(read(file).includes(`docs/agents/subagents/${role}.md: ${MISSING}`), `${file} lacks it`);
  }
});
