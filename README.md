# h2xd skills

56 skills and 12 agents for Claude Code that keep what an agent learns in the repo.

An agent forgets everything when a session ends. A repo does not have to.

[Install](#install) · [The loop](#the-loop) · [Skills](#skills) · [Agents](#agents) · [Releases](https://github.com/h2xd/skills/releases)

<br>

## Why

The skills put knowledge where the next session finds it. They keep docs that
stay true, decisions with a reason, commits that explain themselves, and
reviews that hold the bar.

A rule that an agent can forget becomes a check where it can. Lints run on the
docs, the glossary words, the commit messages, the PR bodies and the skills
themselves. They run in git hooks and in CI, without an agent.

The docs follow the
[Open Knowledge Format](https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md)
and work as an [LLM wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).
The set builds on many good skill repos and grew out of my own projects. Take
what helps, and [open an issue](https://github.com/h2xd/skills/issues) for what
is missing.

<br>

## Install

```sh
claude plugin marketplace add h2xd/skills && claude plugin install h2xd@h2xd
```

Then open a repo and run `/h2xd:setup`. To update later, run
`claude plugin update h2xd@h2xd`, then run `/h2xd:setup` again.

## What setup does

`/h2xd:setup` reads the repo first, then asks only what it cannot see. The
questions come in rounds of at most four. Each has a recommended answer that
you accept with one click.

<details>
<summary>The questions</summary>

<br>

- the issue tracker: GitHub, GitLab or local markdown files
- the docs bundle: where it lives, and whether to adopt or migrate an existing one
- the project and technical glossaries, and the fields each entry needs
- the language of each kind of page
- the commit types and scopes, and how long a message may be
- whether a new decision record needs an issue
- the hooks and CI workflows that enforce the rules
- the commands a fresh worktree runs before it can typecheck and run the tests
- mutation testing, and which runner plants the bugs
- the size limits that decide how many reviewers a PR review starts, and the paths that always get all of them
- how many build workers may build one ticket at the same time
- a hook that stops the agent from running destructive git commands
- the triage labels
- module boundaries, for TypeScript repos
- the writing tone of the agent

</details>

Setup shows every draft and writes nothing until you agree. Then it writes
`agents.config.json`, copies the scripts, git hooks and CI workflows, and adds
the `package.json` scripts. It also seeds `docs/`, creates the issue labels and
adds its blocks to `CLAUDE.md` or `AGENTS.md`.

It ends with one status line per item. 🟢 means written, 🟡 means a follow-up,
and 🔴 means something blocks a skill. Run it again to update the scripts or to
change an answer.

<br>

## The loop

```mermaid
flowchart TD
  idea([An idea])
  subgraph plan [Plan]
    grill[plan-grill] -->|written up| spec[to-spec]
    spec -->|split| tickets[to-tickets]
  end
  subgraph build [Build]
    impl[code-implement] -->|opens the PR| body[git-pr-body]
    impl -.->|something breaks| debug[code-debug]
    debug -.->|fixed, with a test| impl
  end
  subgraph ship [Review and learn]
    review[review-pr] -->|open threads| fix[review-fix]
    fix -.->|one more review| review
    fix -->|merged| reflect[session-reflect]
  end
  idea -->|questions until nothing is open| grill
  tickets -->|one ticket| impl
  body -->|up to five reviewers| review
  reflect -->|lessons become checks| idea
```

Not sure where you are in it? `/h2xd:next` knows.

<br>

## What keeps it honest

- Docs stay true. `docs-wiki` and `docs-glossary` keep the pages and the two
  glossaries. The docs lint checks them in `pre-commit` and CI.
- Decisions do not overlap. `docs-adr` searches the records on the same
  question first. The docs lint fails a record without its issue, and the PR
  lint fails a body without `Closes #<n>`.
- History explains itself. `git-commit` and `git-pr-body` use closed types and
  scopes, a short body and the reason in the footer. The `commit-msg` hook and
  CI check them.
- Reviews hold the bar. `review-pr` picks up to five reviewers from the diff:
  correctness, standards, comments, mutation testing and blast radius. The
  `review` script runs every mechanical step.

<br>

## Skills

Most names start with their group. Open a group to see its skills. The
**Starts** column says who can start a skill:

- *auto*: the model picks it when it fits, and you can call it too.
- *you*: only you start it, because it posts in public, costs a lot, or is a
  deliberate step.

<details>
<summary><b>Core</b> · Set up once, then let <code>next</code> show the way. The two <code>add-</code> skills keep every skill and every sentence clean.</summary>

<br>

| Skill | What it does | Use when | Starts |
|---|---|---|---|
| `setup` | Asks a few questions, then writes the config, scripts, hooks, CI and seed docs | Once per repo, and again to update or change a choice | you |
| `setup-tone` | Sets the writing tone, such as ASD-STE100, as the repo's default style | You want short, plain, summary-first agent text | you |
| `setup-wizard` | Writes a shell script that walks a person through steps only they can do | A task needs someone at a browser, such as setting secrets | you |
| `next` | Reads your branch, changes and PR, and names the one next step | You don't know what comes next | auto |
| `add-skill` | Writes skills and agent prompts an agent follows without guessing | You create or edit a skill, an agent or an instructions file | auto |
| `add-soul` | Cuts AI tells and walls of text from prose | Prose should read as a careful person wrote it | you |

</details>

<details>
<summary><b>Docs</b> · The memory of the repo. Pages that change with the code, one word per thing, and every decision with its reason.</summary>

<br>

| Skill | What it does | Use when | Starts |
|---|---|---|---|
| `docs-wiki` | Ingests, queries and lints the docs, and keeps pages in step with the code | A page changes, code a page describes changes, or a source arrives | auto |
| `docs-glossary` | Adds, sharpens and renames terms in the two glossaries | A new term comes up, or two words name one thing | auto |
| `docs-adr` | Checks for overlap, opens the issue, writes the decision record, links the PR | A hard-to-reverse decision is made or contradicted | auto |
| `docs-research` | Answers a question from primary sources and files it in the docs | You need facts about a library, an API or a standard | auto |
| `docs-fact-check` | Checks each claim of an idea against the pages, glossaries and decisions | An idea or plan may disagree with what the wiki says | auto |
| `docs-proofread` | Proofreads the wiki with several agents, fixes words and links, and suggests the rest | Overnight, or before a release, to keep the pages one piece | you |
| `docs-quiz` | Lets a fresh agent answer real questions from the wiki alone, and grades the answers | You want to know whether the wiki helps a newcomer | you |

</details>

<details>
<summary><b>Plan</b> · Before a line of code. Turn a fuzzy idea into decisions, a spec and tickets that another agent can pick up next week.</summary>

<br>

| Skill | What it does | Use when | Starts |
|---|---|---|---|
| `plan-grill` | Asks up to four clickable questions at a time until no decision is open | A plan still has open choices, such as "grill me on the CSV export idea" | auto |
| `plan-sharpen` | Makes a task deeper, not bigger, and rewrites the prompt | A task feels shallow or the prompt is vague | auto |
| `plan-prototype` | Builds throwaway code to answer one design question | You want to try a state model, flow or UI first | you |
| `plan-triage` | Moves issues through triage and writes agent-ready briefs | The tracker needs sorting | you |
| `to-spec` | Turns the conversation into a spec issue | A discussed feature should be written down | auto |
| `to-tickets` | Splits a spec into tickets with blockers and acceptance criteria | The spec is settled | you |
| `to-page` | Renders a checklist, a round of decisions or one decision in depth as a page, and reads the answers back as JSON | Many checks or decisions wait on you or the team | auto |
| `to-questionnaire` | Turns what a customer must answer into a questionnaire page, and reads the answers back | A plan waits on a customer or another person outside the team | you |

</details>

<details>
<summary><b>Ask</b> · Three question words, a teacher and a committee. Ask them as often as you like.</summary>

<br>

| Skill | What it does | Use when | Starts |
|---|---|---|---|
| `what` | Says the last message again, in plain words | The last answer did not land | auto |
| `how` | Explains how code works and where new code belongs | You want the map before you change something | you |
| `why` | Explains why code is the way it is, with sources | You want the reason behind a choice or a number | you |
| `teach` | Explains a whole body of work plainly, built on `how` and `why` | You want to understand a whole part of the system | you |
| `ask-committee` | A design chapter and an engineering chapter of reviewer agents vote. Each lead merges its chapter's votes, and the chair writes one verdict with every vote attached | You want a verdict on variants, a design, a plan or a diff | you |

</details>

<details>
<summary><b>Code</b> · Where the work happens. The rules for how an agent works, the bar for how code looks, and the loops that turn a ticket into a passing change.</summary>

<br>

| Skill | What it does | Use when | Starts |
|---|---|---|---|
| `code-rules` | How an agent works: asking, context, scripts, order of work, failed fixes | Any task bigger than a one-line edit | auto |
| `code-quality` | The quality and architecture bar, and the smells reviewers check | You write or review code that more than one function calls | auto |
| `code-implement` | Works one ticket from branch to a reviewed PR with parallel build workers, asking only for test entry points and unsure files | You pick a ticket to build | auto |
| `code-tdd` | Test-first when the change is clear, ending with a mutation check | You want test-first work or a regression test | auto |
| `code-debug` | Builds a command that goes red on the bug, then fixes the root cause | Something is broken and the cause is unknown | auto |
| `code-architecture` | Finds shallow modules and other weak spots, ranked | You want refactoring targets | you |
| `code-arena` | Runs several attempts at one change and grafts the best parts | A change deserves competing versions | you |
| `code-swarm` | Fans a task out to parallel workers and returns one report | A task splits into many independent slices | you |
| `lang-ts-base` | Type patterns that make the compiler reject bad states | You read or edit `.ts` and `.tsx` files | auto |
| `lang-ts-deep-modules` | Build rules so modules are imported only through their entry points | A TypeScript repo should enforce module seams | you |

</details>

<details>
<summary><b>Prove</b> · Tests pass. But would they catch a real bug? This group checks tests, risky changes, numbers and the running app against the real thing.</summary>

<br>

| Skill | What it does | Use when | Starts |
|---|---|---|---|
| `prove-tests` | Plants plausible bugs and reports the ones no test catches | After writing tests, or before review | auto |
| `prove-blast-radius` | Finds what a change breaks outside the diff, by running real code | A change touches shared code | auto |
| `prove-measure` | Vets a number and finds what limits it | Before you trust a benchmark or a score | auto |
| `prove-e2e-create` | Generates a repo skill that drives the app like a user | The repo has no scripted end-to-end check | you |
| `prove-e2e-maintain` | Keeps that skill honest as the app changes | The app changed since the last check | you |

</details>

<details>
<summary><b>Git</b> · History is the one record every future session reads. Make it worth reading.</summary>

<br>

| Skill | What it does | Use when | Starts |
|---|---|---|---|
| `git-commit` | Writes a commit message the hook accepts and the next session can use | Before every commit | auto |
| `git-pr-body` | Writes a PR body: closing line, summary, evidence, merge danger. Then pushes and opens the PR | You open a PR | auto |
| `git-guardrails` | Installs a hook that stops agents from destructive git commands | You want no surprise pushes or resets | you |

</details>

<details>
<summary><b>Review</b> · Five reviewers and one grim reaper.</summary>

<br>

| Skill | What it does | Use when | Starts |
|---|---|---|---|
| `review-pr` | Picks up to five reviewers from the diff, then posts one review without asking | A PR is ready | auto |
| `review-fix` | Fixes the review threads, pushes, replies and resolves them. Asks only when a check fails | A PR has comments to address | auto |
| `review-code-comments` | Sends the comment reaper over a diff | Before review, or when the comments in a diff only repeat the code | auto |
| `review-skills` | Finds skills that overlap and proposes exact fixes | The wrong skill fires, or after adding several | you |

</details>

<details>
<summary><b>Design</b> · One inventory of every reusable element, kept tidy and mirrored to Claude Design. Agents build variants, and <code>ask-committee</code> judges them.</summary>

<br>

| Skill | What it does | Use when | Starts |
|---|---|---|---|
| `design-setup` | Builds the inventory, the overview page, the agent view for curl, the design log and the design config page | A repo has no design system, or a hand-written one | auto |
| `design-log` | Writes one dated entry per small design decision, links it from the inventory, and answers why an element looks that way | A design choice is made, or you ask why | auto |
| `design-tidy` | Finds missing, dead and copied elements, literal values and stale intent entries. Fixes the safe ones and asks about the rest | Every few weeks, or after a burst of UI work | auto |
| `design-mirror` | Exports the design pages as snapshots, diffs them against the last push, and writes the hand-off the user's sync skill pushes from. The repo stays the only author | The inventory, a token or a page changed | you |
| `design-variants` | Three UI prototyper agents build one task as real pages, a usability tester agent reviews each, they revise once, and the committee picks one. It ends with a ticket | A screen or element has no obvious shape | you |

</details>

<details>
<summary><b>Session</b> · The end of one session is the start of the next.</summary>

<br>

| Skill | What it does | Use when | Starts |
|---|---|---|---|
| `session-handoff` | Writes a handoff document the next agent picks up | Context runs low, or someone else takes over | auto |
| `session-reflect` | Turns each lesson into a check, a type, a lint, a test or, last, words | After a session, or when a mistake repeats | auto |

</details>

<br>

## Agents

- `comment-reaper` hates comments. It deletes every one its keep list does not
  protect, and marks the code that needed one. Its first words on every run:
  "Every comment's hour comes."
- `skill-polisher` reads one skill in a new context, on a fast model. It fixes
  errors and walls of text, and suggests better names. `add-skill` sends one per
  skill.
- The committee is ten `committee-*` agents in a design chapter and an
  engineering chapter. `ask-committee` runs them, and `design-variants` starts
  the UI prototyper and the usability tester.
  [`members.md`](skills/ask-committee/members.md) holds their tiers and calls.
  The two directors use the `fable` model alias. When the CLI does not know it,
  `ask-committee` starts them again with a model override.

<br>

<details>
<summary><b>Layout</b></summary>

```
.claude-plugin/   plugin and marketplace manifests
skills/           one folder per skill
agents/           comment-reaper, skill-polisher, committee-*
templates/        what setup copies into a repo
  scripts/        docs lint, find and resolve, commit and PR lint, review and implement helpers, mutation runner
  githooks/       pre-commit, commit-msg
  hooks/          the agent hook git-guardrails installs
  workflows/      docs.yml, pr.yml
  output-styles/  tone templates, such as asd-ste100.md
  docs/           seed bundle: index, log, both glossaries
  agents.config.json
scripts/          the skills lint and this repo's tests
.claude/          this repo's tone, ASD-STE100, and links to skills/ and agents/
.github/          this repo's CI
```

</details>

<details>
<summary><b>Developing</b></summary>

Pull requests are welcome. For a bigger change, please open an issue first so we
can talk it through.

The scripts need Node 22.18 or later and no npm packages. Development uses
Node 26, pinned in `.prototools` and `.nvmrc`. [proto](https://moonrepo.dev/proto)
installs the pinned version:

```sh
bash <(curl -fsSL https://moonrepo.dev/install/proto.sh)
proto install
```

With nvm, run `nvm install` instead. Then:

```sh
npm ci
npm run typecheck
npm test
```

`npm test` also runs the skills lint on every skill. CI runs the same on Node
22.18 and 26, plus a shell syntax check and a lint of a fresh seed bundle.
Without a local Node:

```sh
docker run --rm -v "$PWD":/src:ro node:26 sh -c \
  'cp -r /src /w && cd /w && npm ci && npm run typecheck && npm test'
```

A new skill follows [`skills/add-skill/SKILL.md`](skills/add-skill/SKILL.md)
and gets a row in [`skills/next/catalog.md`](skills/next/catalog.md). Bump
`version` in `.claude-plugin/plugin.json` for every release, because Claude Code
updates installed plugins by version.

</details>

<br>

## License

MIT, see [`LICENSE`](LICENSE). The licenses and notices of the work this set
builds on are in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

This set stands on the shoulders of two generous people. Much of it is their
work, reshaped to fit my own workflow:

- **Matt Pocock** and [mattpocock/skills](https://github.com/mattpocock/skills). The
  grilling interview, the spec and ticket flow, the triage roles, the TDD
  seams and much more began there.
- **Lauren Tan** and [pstack](https://github.com/cursor/plugins/tree/main/pstack).
  The rules behind `add-soul`, the comment reaper, the blast radius, the arena
  and many of the working principles began there.

Thanks also to **Dex Horthy** at [HumanLayer](https://github.com/humanlayer/skills).
The HumanLayer show-me skill gave `git-pr-body` its summary views. Thanks too to
the author of an [ASD-STE100 output style gist](https://gist.github.com/starise/470f53dbd16149dcd168fa45bff17d1f)
that inspired this repo's tone.

Thank you all for sharing such fantastic work in the open. Where these skills
are good, a lot of that is yours. Where they fall short, the fault is mine.
