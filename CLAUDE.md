# h2xd skills

A Claude Code plugin. `skills/` and `agents/` ship to users. `skills/setup`
copies `templates/` into their repos.

`.claude/agents` is a symlink to `agents/`. `.claude/skills` holds one
symlink per skill in `skills/`, so a session in this repo can use the skills it
edits. Here they load without the `h2xd:` prefix, such as `/add-skill`. A new
skill needs its link: `ln -s ../../skills/<name> .claude/skills/<name>`.

A real folder in `.claude/skills` is an internal skill, such as `release`. The
plugin does not ship it. `node scripts/lint-skills.ts` checks the links and
the internal skills.

## Writing skills

- A skill's `description` says what it does and when to use it, so the model
  can pick it from the description alone.
- Steps end in a **Done when** a reader can check.
- Skills and agent prompts follow `skills/add-skill/SKILL.md`, which ends
  with a `skills/add-soul/SKILL.md` pass. Exception: MADR headings in the ADR
  template keep MADR's title case.
- `node scripts/lint-skills.ts` checks what a script can: frontmatter, length, a
  `Done when` per numbered step, `## Do` and `## Don't`, and tool or model
  names only as examples. It also fails a new prose line over 80 characters,
  against `scripts/lint-skills.baseline.json`. `npm test` runs it on every
  skill.
- Skills name each other as `h2xd:<name>`. A skill with
  `disable-model-invocation: true` in its frontmatter is user-only. It is
  read by path, `../<name>/SKILL.md`, never invoked by another skill. Telling
  the user to run it, as `/h2xd:<name>`, is fine.
- Text a skill posts to GitHub follows `skills/setup-tone/github-text.md`:
  summary first, 🔴 🟡 🟢 status, bullets, long detail in `<details>`.
- This repo writes in ASD-STE100, set in `.claude/output-styles/asd-ste100.md`.
- A new skill gets a row in `skills/next/catalog.md`, and a place in its
  flows when it has one. `node scripts/lint-skills.ts` fails without the row.
- The README's "What setup does" section describes `skills/setup/SKILL.md`
  and `skills/setup/questions.md`. A change to either updates that section in
  the same change.
- Repo-specific values never appear in a skill. They live in the target repo's
  `agents.config.json` for scripts, or in `docs/agents/*.md` for skills.

## Templates

- Every script reads repo-specific values through `templates/scripts/config.ts`.
  A new setting gets a default there, a key in `templates/agents.config.json`,
  and a question in `skills/setup/SKILL.md`, in the same change.
- Pure checks take settings as arguments, and the CLI entry points read
  `config`. That keeps the tests independent of any one repo's config. The one
  exception is the bundle and decisions directory names, which
  `docs/bundle.ts` reads at import because every path in the bundle code
  depends on them. The tests assume the defaults.
- `prove-tests.sh` is POSIX `sh` so it runs in repos without node. It cannot
  import `config.ts`. The `prove-tests` skill reads the `mutation` settings and
  passes them as flags.
- Bump `version` in `.claude-plugin/plugin.json` for every release. Claude Code
  updates an installed plugin only when the version changes.
- The scripts run on Node 22.18 or later with no npm packages. `npm test` and
  `npm run typecheck` must pass. Setup does not copy `*.test.ts`
  into target repos.
- `scripts/`, `.githooks/`, `.github/workflows/docs.yml`, `pr.yml` and
  `.claude/hooks/` hold this repo's own copies of `templates/`. Change the
  template, then copy it. `scripts/repo.test.ts` fails when a copy differs.

## Agent skills

- **Issue tracker**: GitHub Issues in `h2xd/skills`, through `gh`. See
  `docs/agents/issue-tracker.md`.
- **Knowledge base**: an OKF bundle in `docs/`, maintained with
  `/h2xd:docs-wiki`. See `docs/agents/knowledge-base.md`.
  `node scripts/lint-docs.ts` runs on every commit.
- **Glossaries**: `docs/glossary/project.md` holds domain words.
  `docs/glossary/technical.md` holds code words. Name a thing by its
  entry's heading. `/h2xd:docs-glossary` adds and renames terms.
- **Decisions**: `docs/decisions/`, MADR. A record needs no issue in this
  repo. `/h2xd:docs-adr` checks for overlap first.

## Commits

`type(scope): summary`, at most 72 characters. Both sets are closed.
Widening one takes a decision record.

- **Type**: `feat` for new behavior, `fix` for a bug, `docs` for docs and
  the README only, `refactor` for the same behavior, `test` for tests only,
  `chore` for tooling and releases.
- **Scope**, optional: `skills` for `skills/`, `agents` for `agents/`,
  `templates` for `templates/`, `docs` for the docs-* skills and `docs/`,
  `tooling` for scripts, hooks, CI and agent config.

The body is one paragraph on what is different now and why. The footer
carries what the conversation produced: `Refs:` or `Closes:` for the issue,
the record touched, the option rejected. End with
`Co-Authored-By: <model> <noreply@anthropic.com>`. `/h2xd:git-commit` writes the
message. `.githooks/commit-msg` rejects a malformed one.

## Releases

Every merged PR is a release, and GitHub releases are the changelog. The
repo keeps no `CHANGELOG.md`.

- A commit in the PR, `chore: ship <version>`, bumps `version` in
  `.claude-plugin/plugin.json`: minor when the PR holds a `feat`, patch
  otherwise.
- After the merge, run the internal `release` skill without asking. It tags
  the merge commit and creates a draft release. The user publishes it.

## Pull requests

Every PR body opens with `Closes #<n>` on its own line, one line per
issue.
Merging is what closes an issue. `h2xd:git-pr-body` writes the body.
`node scripts/lint-pr-body.ts` checks it in CI.
