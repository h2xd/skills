---
name: setup
description: "Configure a repo for the h2xd skills: where issues live, where the knowledge base and glossaries live, the commit vocabulary, the ADR issue policy, triage labels, mutation testing, the writing tone, and the hooks and CI that enforce them. Use once before the other h2xd skills, and again to update the vendored scripts or switch a choice."
disable-model-invocation: true
---

# Setup

A skill that guesses where your issues live, or which commit types exist, is
wrong on the first run. Setup asks once, writes the answers down, and installs
the checks that keep them true when no skill runs:

- **`agents.config.json`** at the repo root, with every repo-specific value.
- **`docs/agents/*.md`**. The skills read the tracker and knowledge base layout.
- **`scripts/`, `.githooks/`, `.github/workflows/`**, copied from
  [`../../templates/`](../../templates/). The checks run in `pre-commit`,
  `commit-msg` and CI, so pages and commit messages cannot rot between runs.
- **The `## Agent skills`, `## Commits` and `## Pull requests` blocks** in the
  agent instructions file, `CLAUDE.md` or `AGENTS.md`.

Paths that start with `templates/` are relative to the plugin root.

## Steps

### 1. Explore

Read what exists. Assume nothing.

- `git remote -v`: GitHub, GitLab, or no remote?
- `CLAUDE.md`, `AGENTS.md`: which exists, and which blocks it has.
- `agents.config.json` means a re-run. Its values are the current answers. Diff
  `scripts/` against `templates/scripts/` and list what changed.
- A knowledge base in `docs/`, `doc/` or `wiki/`. Look for OKF frontmatter, an
  `index.md`, a `log.md`, a decisions directory such as `decisions/`, `adr/`
  or `docs/adr/`, and the record format, MADR or Nygard.
- Glossaries: `GLOSSARY.md`, `CONTEXT.md`, `docs/**/glossary*.md`.
- Runtime: run `node --version`. When node is missing or older than 22.18,
  stop and say so, and suggest proto, nvm or the nodejs.org installer. The lint
  commands need it, and the hooks skip their checks without it. A repo without
  `package.json` gets a minimal one.
- Tests and stack: the test, typecheck and build commands, and any installed
  mutation tool, such as Stryker, mutmut, cargo-mutants, PIT or gremlins.
- Hooks: `git config core.hooksPath`, `.husky/`, `.githooks/`, `lefthook.yml`
  and `PreToolUse` hooks in `.claude/settings.json`. Also the workflows under
  `.github/workflows/` and the labels from `gh label list`.
- History: `git log -30 --format=%s`. Which types and scopes appear? Top-level
  directories hint at scopes.

Done when you can state, per section in [`questions.md`](questions.md), what
you found and what you recommend.

### 2. Ask

Ask the sections in [`questions.md`](questions.md) the way `h2xd:plan-grill`
does. Ask with clickable options, through the CLI's question tool, such as
AskUserQuestion. Use at most four questions per call. Put the recommendation
first, marked `(Recommended)`.

Done when every section has an answer or was skipped with a reason.

### 3. Show the drafts

Before writing anything, show:

- `agents.config.json` in full.
- The blocks from [`instructions-block.md`](instructions-block.md), filled in.
- Both `docs/agents/` pages, filled in.
- The files to copy and the `package.json` scripts to add.

Done when the user confirms.

### 4. Write

1. **Config.** Write `agents.config.json` from
   [`templates/agents.config.json`](../../templates/agents.config.json) with the
   answers. Set `docs.root` and `docs.decisions` from B, and
   `docs.glossaries` with each path and its `requiredFields` from C. Set
   `decisionIssueRequiredFrom` to the next free record number, or `null` when F
   was no. Set `commits` from E, `pullRequests.closingKeyword` from G,
   `worktreeSetup` from H, `mutation` from I, `review` from N, `implement` from O.
2. **Scripts.** Copy `templates/scripts/` to `scripts/`, including
   `package.json`, which marks the folder as ES modules. Leave out `*.test.ts`,
   which assume the default config. Keep `prove-tests.sh` executable. On a
   re-run, show the diff per file and keep the user's local edits.
3. **package.json scripts.** Add these without touching existing keys:

   ```json
   "docs:lint": "node scripts/lint-docs.ts", "docs:find": "node scripts/find-docs.ts",
   "docs:resolve": "node scripts/resolve-docs.ts", "review": "node scripts/review.ts",
   "commit:lint": "node scripts/lint-commit-message.ts", "pr:lint": "node scripts/lint-pr-body.ts",
   "prepare": "git config core.hooksPath .githooks"
   ```

   Leave out `prepare` when the repo uses husky or lefthook, or has a `prepare`
   script. Then chain the command or ask.
4. **Hooks and CI**, per section G. Copy `templates/githooks/*`, executable,
   to `.githooks/` and `templates/workflows/*.yml` to `.github/workflows/`. Run
   `git config core.hooksPath .githooks` once.
5. **Docs bundle.** For a new bundle, copy `templates/docs/`. Replace
   `{{DATE}}` with today in `YYYY-MM-DD` form. Replace `{{ACTOR}}` with
   `<cli>/<your model id>`, such as `claude-code/claude-opus-5-5`. For an
   adopted bundle, add only what is missing. That is the glossaries,
   `docs/agents/`, an `index.md` entry per new page and a `log.md` entry.
6. **Agent config pages.** Write `docs/agents/issue-tracker.md` from
   [github](issue-tracker-github.md), [gitlab](issue-tracker-gitlab.md) or
   [local](issue-tracker-local.md). Write `docs/agents/knowledge-base.md` from
   [`knowledge-base.md`](knowledge-base.md). Fill every `{{...}}`. List both in
   `docs/index.md` under `## Agent config`.
7. **Labels.** Create each missing label with `gh label create` or
   `glab label create`: `adr` described as "Opened for a decision record",
   `spec`, `idea` described as "Not a request yet", and the triage labels from
   section K. Skip this step for a local tracker.
8. **Instructions file.** Edit the one that exists, or ask which to create.
   Write the [blocks](instructions-block.md) into it.
9. **Optional skills.** They are user-only, so read and follow each by path:
   `../git-guardrails/SKILL.md` per J in project scope,
   `../lang-ts-deep-modules/SKILL.md` when L was yes, `../setup-tone/SKILL.md` per M.

Done when every file from step 3 exists, `node scripts/lint-docs.ts` exits 0,
and `node scripts/lint-commit-message.ts <file>` exits 1 on a file that holds
only `chore(tooling): x`. That empty body proves the hook reads the config.

### 5. Report

One line per item, worst first:

```
🔴 <item>: <a check that fails, or a choice that blocks a skill>
🟡 <item>: <follow-up, such as lint errors on adopted pages, a bundle to migrate, or a tracker the review skills cannot drive>
🟢 <item>: <what was written, and which skill reads it>
```

Close with one sentence: the user may edit `agents.config.json` and
`docs/agents/*.md` directly, and a re-run updates scripts or switches trackers.

Done when every written file and follow-up has its line.

## Do

- Explore before asking, and recommend what the repo already does.
- Show every draft first, and keep existing keys, hooks and blocks.

## Don't

- Don't create both `CLAUDE.md` and `AGENTS.md`. Edit the one that exists.
- Don't copy `*.test.ts` into the repo. Copy only the scripts.
- Don't switch `core.hooksPath` when husky or lefthook runs the hooks. Add the
  two commands there.
- Don't migrate a large existing bundle without asking. Offer to adopt it.
- Don't overwrite a local edit to a vendored script. Show the diff and ask.
