# Setup questions

The sections `setup` asks, in order. Lead each with the recommendation, so the
user can accept it in one click. Skip a section whose answer exploration
settled beyond doubt, and say so.

## A. Issue tracker

Where issues live. `h2xd:docs-adr` opens an issue for every decision record and
searches the tracker for overlap, so this is not optional.

- **GitHub**, when a remote points at github.com: `gh`.
- **GitLab**, when a remote points at a GitLab host: `glab`.
- **Local markdown**: files under `.scratch/issues/`, for solo repos without a
  remote. The review skills need a GitHub PR and do not run.
- **Other**, such as Jira or Linear: ask for one paragraph on create, search,
  view, comment, and how a PR links an issue. Write the tracker page from it.

Done when `gh repo view` or `glab repo view` prints the project from this
directory, or the answer is local markdown. When the command fails, stop and
say what is missing.

## B. Knowledge base

Where the [OKF](https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md)
bundle lives. Recommended: `docs/`. Then ask for its directories beyond the
fixed five: `glossary/`, `decisions/`, `agents/`, `references/` and
`research/`. Propose directories from what the repo has.

Propose `concepts/` first. It holds pages on how something works across code,
design and decisions. Other typical extras are `product/`, `architecture/` and
`operations/`.

Done when you have the bundle path and the extra directories, each with the
kind of page it holds.

When a bundle exists in another layout, offer:

- **Adopt**, recommended above ten pages: keep the layout and point the config
  at it, for example `"decisions": "adr"`. List the lint errors on old pages as
  a follow-up.
- **Migrate**: `git mv` pages into the standard layout in this change.

## C. Glossaries

Two glossaries, each term in exactly one:

- **Project**, `glossary/project.md`: the words of the domain, what users and
  the business call things.
- **Technical**, `glossary/technical.md`: the words of the code base, each
  with a `**Code:**` pointer.

Move an existing `GLOSSARY.md` or `CONTEXT.md` into the project glossary with
`git mv`. Ask whether every technical entry needs `**Code:**`. Recommended:
yes.

Then the paths, `docs.glossaries`, relative to the bundle root. Recommended:
the two above. Propose an adopted glossary's path when the repo keeps one
elsewhere. Each path gets its `requiredFields`: `Meaning` always, and `Code`
for the technical glossary when the answer above was yes.

## D. Language

Which language each kind of page uses, for example "product pages German,
engineering pages and glossaries English". Recommended: the language of the
existing docs, else English everywhere. The answer fills the Language section
of `docs/agents/knowledge-base.md`.

## E. Commit vocabulary

The closed sets the `commit-msg` hook enforces. Recommended types:
`feat fix docs refactor test chore`. Propose at most six scopes from the
history and the top-level directories, plus `tooling` for scripts, hooks, CI
and agent config. A scope helps a future session only while the set is small
enough to remember. Widening a set later takes a decision record.

Then the two limits the hook checks:

- `commits.subjectMax`: the longest subject line. Recommended: 72.
- `commits.maxBodyParagraphs`: the most body paragraphs before the footer.
  Recommended: 2, one for what changed and one for a second part.

## F. Decision records need an issue

Recommended: yes, from the next free record number on, so existing records stay
valid. On GitHub or GitLab, create the `adr` label when it is missing.

## G. Enforcement

Recommended: all three.

- `.githooks/pre-commit` runs the docs lint. `.githooks/commit-msg` runs the
  commit lint. Both start with `git config core.hooksPath .githooks` and a
  `prepare` script. When the repo uses husky or lefthook, add the two commands
  there instead.
- `.github/workflows/docs.yml`: docs lint on push and PR.
- `.github/workflows/pr.yml`: the PR body opens with `Closes #<n>`, and every
  commit on the branch passes the commit lint.

Then the closing keyword, `pullRequests.closingKeyword`: the word every PR body
opens with. Recommended: `Closes`. GitHub and GitLab also close an issue on
`Fixes` or `Resolves`. The lint accepts exactly one of them, so pick one.

## H. Worktree setup

The commands a fresh worktree needs before it can typecheck and run the tests,
as argv lists, in `worktreeSetup`. `h2xd:review-pr`, `h2xd:review-fix`,
`h2xd:code-arena` and the build workers of `h2xd:code-implement` run them. Recommended: the install the lockfile implies, for example
`[["npm", "install"]]`, plus any build step the typecheck needs.

Then `worktreeLinks`: the untracked files a new worktree needs from the main
checkout, such as `.env.local` or `.claude/settings.local.json`. A worktree
has only the tracked files, so an agent in it cannot reach these. Propose the
untracked, ignored files that `git status --ignored` lists and the repo reads.
Recommended: those, or none. `scripts/worktree.ts` links each listed file
before it runs `worktreeSetup`, and skips a file the main checkout lacks.

## I. Mutation testing

`h2xd:prove-tests` plants plausible bugs in changed lines and reports the ones
no test catches. `h2xd:review-pr` runs it as Reviewer D. Recommended: on. Then
the runner:

- **`sh`**, recommended without a mutation tool: `scripts/prove-tests.sh`
  applies the agent's mutants with `git apply`, adding `--unidiff-zero` for a
  patch without context lines, and runs the test command. It
  needs only `sh` and `git`, so it works in any stack.
- **`native`**, recommended when the stack has a tool: the agent picks the
  lines, the tool makes the mutants. Propose `nativeCommand` with `{ranges}`,
  which becomes `path:start-end,...`, or with `{files}`:
  - JS or TS on Vitest, Jest or Mocha: `npx stryker run --mutate {ranges}`
  - Rust: `cargo mutants --file {files}`
  - Python, Java, Go: the repo's mutmut, PIT or gremlins command, narrowed to
    `{files}` as far as the tool allows. Ask when unsure.
  - Any other tool: the user's own command.

Then the commands, as shell strings:

- `testCommand`: the repo's test command.
- `checkCommand`: the typecheck or build, so a mutant that does not compile is
  dropped. Or `null`.
- `setupCommand`: what a fresh worktree needs, usually the install. Or `null`.

Keep the budget defaults unless the user asks. They are `linesPerMutant`,
`minMutants`, `maxMutants`, `maxFileShare`, `timeoutFactor` and `exclude`.

## J. Git guardrails

A pre-command hook that refuses destructive git commands from agents: push,
force push, `reset --hard`, `clean -f`, `branch -D`, `checkout .`,
`restore .`. `h2xd:git-guardrails` installs it. Recommended: on, in project
scope, so it travels with the repo.

- **Allow plain pushes** with `--allow-push`, recommended.
  `h2xd:git-pr-body` and `h2xd:review-fix` push on their own. Force pushes and
  remote deletes stay blocked.
- **Block every push**, when the user pushes every branch by hand.
- **Off**.

When the CLI has no pre-command hook, say so and skip.

## K. Triage labels

`h2xd:plan-triage` gives each issue one category label and one state label.
Recommended: keep the defaults, each label equal to its role. The roles are
`bug`, `enhancement`, `needs-triage`, `needs-info`, `ready-for-agent`,
`ready-for-human` and `wontfix`. When `gh label list` or `glab label list`
shows a label for a role, such as `type: bug`, propose that label instead, so
triage creates no duplicates. External PRs stay out of triage. The user can
turn them on in the tracker page.

Labels to create when missing: `adr` described as "Opened for a decision
record", `spec`, `idea` described as "Not a request yet", `in-progress`
described as "A skill or a person works on it", and the triage labels.

## L. Module boundaries

Only when the repo has a `tsconfig.json`. `h2xd:lang-ts-deep-modules` installs
dependency-cruiser, so other code imports a module only through its root
files.

- **Yes**, recommended when the repo has a directory of feature modules, such
  as `src/modules` or `packages`.
- **Later**: list it as a follow-up.

## M. Tone

How agents write: in the chat, in issues, in PRs and in review comments.
`h2xd:setup-tone` installs a tone template as the repo's default output style
and adds one line to the agent instructions file.

- **ASD-STE100**, recommended: Simplified Technical English. Short sentences,
  one meaning per word, summary first, status with 🔴 🟡 🟢 ⚪. Good when people
  read a lot of agent text on GitHub.
- **Keep the default**: no output style. GitHub text still starts with a
  summary, per `h2xd:setup-tone`'s `github-text.md`.

## N. Review size

`h2xd:review-pr` sizes each diff and starts only the reviewers it needs:
two for a small change, all five for a critical or large one. It asks only
before a large review. The limits live in `review`.

- **Keep the defaults**, recommended: small is fewer than 10 files and 500
  lines, middle fewer than 20 files and 1000 lines.
- **Other limits**, such as higher ones for a repo with many generated files.

Then `review.criticalPaths`: path prefixes where any change gets all five
reviewers. Propose the repo's migrations, auth and payment folders, such as
`migrations/` or `src/auth/`. Recommended: those that exist, or none.

Then `review.fixMaxWorkers`: `h2xd:review-fix` splits the fix items into groups
of at most 5 and starts one fixer worker per group. This is the most fixer
workers that run at once.

- **3**, recommended: the default.
- **1**: no split. One fixer applies every item. Choose it when the tests use
  a fixed port, a shared database or another resource outside the worktree.
- **Another number**, such as 2 for a machine that runs slow test suites.

## O. Build workers

`h2xd:code-implement` splits a ticket with three or more acceptance criteria
into criteria groups that share no file. Each group gets its own build worker
and worktree. `implement.maxWorkers` is the most build workers that run at
once.

- **3**, recommended: the default.
- **1**: no split. One build worker builds every criterion in order. Choose
  it when the tests use a fixed port, a shared database or another resource
  outside the worktree.
- **Another number**, such as 2 for a machine that runs slow test suites.

## P. Subagent tools

Subagents read their brief from a skill, so they do not know the extra tools a
repo has. `docs/agents/subagents/` holds one page per role: `scout`,
`builder`, `fixer` and `reviewer`. Each skill that starts a subagent passes
the path of its page. [`subagents.md`](subagents.md) lists the known tools.

Ask per known tool whether the repo uses it. Recommended: yes only for a tool
the repo already names in its agent instructions or MCP config. Then ask for
the load step and the exact call. Then ask once for a tool setup does not
know, which gets the empty slot.

Done when each known tool has a yes or no, and each yes has its values.

## Q. Technologies

A Technology skill holds the rules an agent gets wrong in one technology of
the repo. Setup finds the technologies and asks per technology. It runs no
parser script. Read the files yourself:

- the dependency manifests, such as `package.json`, `Cargo.toml`,
  `pyproject.toml` or `go.mod`
- the config files, such as `tsconfig.json`, a `Dockerfile` or a CI workflow
- the decision records in the bundle

List only a technology that has rules an agent can get wrong. A small library
with one obvious call stays off the list.

Ask one question per technology, at most four per call. Recommended: yes for a
technology that a decision record names, or that has a seed in
`templates/seeds/`, relative to the plugin root. Recommended: no for the rest.
Each question names the technology, the rules the skill would hold, and the
seed when one exists.

An earlier plugin version shipped the TypeScript rules as `lang-ts-base`. The
plugin no longer ships them, so a re-run must offer them. When the repo has a
`tsconfig.json` or `.ts` files, list TypeScript with the seed `lang-ts-base`,
recommended yes. Say that the skill no longer comes with the plugin, and that
a yes keeps the rules in the repo.

After a yes, write the skill and its row in the same run:

1. Copy the seed to `.claude/skills/<name>/` and adapt it to the repo. Without
   a seed, write the skill from the manifests, the records and the code. Do
   not search the web.
2. Run `node scripts/skills.ts due`. It creates the Skills page when it is
   missing and adds the row. Write the technology in the Technology cell.

When the answer is no for every technology, write no skill and no row.
Do not create the Skills page for that run.

## R. Skills page

`h2xd:session-reflect` keeps one row per repo-local skill on the Skills page,
with the date of its last review and the date the next review is due.

- `skills.page`, the repo-relative path of the page. Recommended:
  `docs/agents/skills.md`, in the bundle, so the docs lint checks it.
- `skills.reviewIntervalDays`, the days from a review to the next one.
  Recommended: 10. Choose a smaller number for a repo whose skills change
  fast, and a larger one for a stable repo.

## S. Nitro goal

`h2xd:nitro` takes a ticket to a reviewed PR and stops at its goal. The goal
is a share of the review threads that are 🟢, with no 🔴 thread. ⚪ threads do
not count. Two settings in `nitro` fix when it stops:

- `nitro.goalShare`: the share of 🟢 threads, as a fraction. Recommended:
  0.9. With fewer than 10 threads, all of them must be 🟢. A review with no
  thread counts as 100%.
- `nitro.maxRounds`: the most rounds of fix and review before it stops below
  its goal. Recommended: 3.

One question covers both. Offer the defaults first, then a stricter goal, such
as 1 for a repo where every thread must be 🟢, and a larger limit, such as 5
for a repo with slow reviews.
