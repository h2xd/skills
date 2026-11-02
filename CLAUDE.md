# h2xd skills

A Claude Code plugin. `skills/` and `agents/` ship to users. `skills/setup`
copies `templates/` into their repos.

## Writing skills

- A skill's `description` says what it does and when to use it, so the model
  can pick it from the description alone.
- Steps end in a **Done when** a reader can check.
- Skills and agent prompts follow `skills/add-skill/SKILL.md`, which ends
  with a `skills/add-soul/SKILL.md` pass. Exception: MADR headings in the ADR
  template keep MADR's title case.
- `node scripts/lint-skills.ts` checks what a script can: frontmatter, length, a
  `Done when` per numbered step, `## Do` and `## Don't`, and tool or model
  names only as examples. `npm test` runs it on every skill.
- Skills name each other as `h2xd:<name>`. A skill with
  `disable-model-invocation: true` in its frontmatter is user-only. It is
  read by path, `../<name>/SKILL.md`, never invoked by another skill. Telling
  the user to run it, as `/h2xd:<name>`, is fine. A user-only skill also needs
  `agents/openai.yaml` with `allow_implicit_invocation: false`, the same switch
  for Codex. The lint checks that the two agree.
- Text a skill posts to GitHub follows `skills/setup-tone/github-text.md`:
  summary first, 🔴 🟡 🟢 status, bullets, long detail in `<details>`.
- This repo writes in ASD-STE100, set in `.claude/output-styles/asd-ste100.md`.
- A new skill gets a row in `skills/next/catalog.md`, and a place in its
  flows when it has one. `node scripts/lint-skills.ts` fails without the row.
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
