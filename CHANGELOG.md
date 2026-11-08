# Changelog

## 0.7.0

- Fewer stops. `code-implement` now runs `git-pr-body`, `review-pr`,
  `review-fix` and one more `review-pr` without asking between them. It
  stops on a draft for a one-way door or a failed check.
- `git-pr-body`, `review-pr` and `review-fix` are model-invocable, so other
  skills and agents start them.
- `git-pr-body` commits a dirty tree with `git-commit`, creates the issue when
  none fits, then pushes and opens the PR without asking. A 🔴 one-way door
  opens as a draft.
- `review-pr` starts only the reviewers the diff needs. The new
  `node scripts/review.ts fleet` sizes the diff from the `review` limits in
  `agents.config.json`. Small, fewer than 10 files and 500 lines, gets A and
  the comment reaper. Middle, fewer than 20 files and 1000 lines, adds one
  lens per kind of file. Large gets all five after a question. Critical, a
  one-way door or a path under `review.criticalPaths`, gets all five at once.
- `review-pr` posts every review, 🔴 included. It asks only for a head
  mismatch or a large change. The comment reaper runs on the cheapest model,
  such as Haiku.
- `review-fix` commits, pushes and replies without asking while the checks
  pass. It pushes or fast-forwards a head mismatch by itself.
- `code-implement` hands the build to a subagent on a fast model, such as
  Sonnet. Reviewers on the strongest model, such as Opus, check it.
- `next` starts the next skill when only one fits.
- `git-guardrails` and `setup` now recommend allowing plain pushes. Force
  pushes and remote deletes stay blocked.

## 0.6.0

- A new design group. `design-setup` builds or audits one inventory of
  reusable elements, an overview page, a design log, the config page
  `docs/agents/design-system.md`, and an agent view. The agent view is
  `index.json` and `llms.md`, generated, committed, and checked in CI and a
  package script.
- `design-log` records small design decisions as dated entries with ids, and
  answers why an element looks the way it does. `design-tidy` runs ten checks
  for drift between the inventory and the code.
- `design-mirror` exports the design pages as snapshots, diffs them against
  the last push, and writes the hand-off the user's sync skill pushes from.
  The repo stays the only author.
- `design-variants` runs three UI prototyper agents with a random stance
  each, a usability tester, one revision, then the committee, and ends with
  a ticket.
- `ask-committee` runs a design and an engineering chapter of reviewer
  agents, named `committee-<chapter>-<function>`. It defaults to a quick vote.
  Full mode adds pages, spikes and measurements from worker agents. The
  verdict keeps every vote. `members.md` holds the hierarchy.
- `next` sends UI work without a design config to `design-setup` and a
  settled design choice to `design-log`. `plan-prototype` points to
  `design-variants` for variants agents build.
- The skills lint treats Fable as a model name, like Opus.

## 0.5.0

- `to-page` has a new page type, `decision`: one hard choice in depth. A
  table rates each option from 1 to 5 against the drivers, and each option
  shows its good and bad points. With `multi`, the reader picks several
  options. The fields use MADR names, so `docs-adr` writes the record.
- `to-page serve` serves the pages over HTTP, also to other devices with
  `--host 0.0.0.0`. A submit writes the answers next to the form, and
  `to-page wait` wakes the agent. The open page loads the next round by
  itself.
- `to-page done` writes a last page with every decision of the rounds.
- Every page opens with a summary, folds the options after a pick, and
  shows the answers for a check before submit.

## 0.4.0

- `to-page` turns a checklist or a round of hard decisions into one HTML
  page that works offline. The agent writes a small JSON form file, and a
  script renders the page. The answers come back as JSON, and later rounds
  build on them.
- `to-questionnaire` now renders a questionnaire page with the `to-page`
  tool, for a customer or another person outside the team. It groups
  questions by theme and accepts open answers. The page replaces the
  Markdown template.

## 0.3.0

- `docs-quiz` lets a fresh agent answer real questions from the wiki alone,
  then grades each answer against the code, the issues and the records.

## 0.2.0

- `docs-fact-check` checks an idea against the wiki, claim by claim.
- `docs-proofread` proofreads the wiki with several agents, such as
  overnight. It fixes words and links on a branch and suggests the rest.

## 0.1.0

The first public release.

- 45 skills in nine groups: setup, docs, plan, ask, code, prove, git, review
  and session. 23 the model can start, 22 only you can start.
- 2 agents: `comment-reaper` and `skill-polisher`.
- Install for Claude Code as a plugin.
- `setup` wires a repo up: an Open Knowledge Format docs bundle with two
  glossaries, issue-first decision records, commit and PR lints, git hooks, CI,
  mutation testing and an ASD-STE100 writing tone.
- The scripts run on Node 22.18 or later with no npm packages. The mutation
  runner and the git hooks need only `sh` and `git`.
