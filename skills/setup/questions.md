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

The commands a fresh worktree needs before it can typecheck, as argv lists, in
`worktreeSetup`. `h2xd:review-pr`, `h2xd:review-fix` and `h2xd:code-arena`
run them. Recommended: the install the lockfile implies, for example
`[["npm", "install"]]`, plus any build step the typecheck needs.

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
  one meaning per word, summary first, status with 🔴 🟡 🟢. Good when people
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

## O. Build workers

`h2xd:code-implement` splits a ticket with three or more acceptance criteria
into criteria groups that share no file. Each group gets its own build worker
and worktree. `implement.maxWorkers` is the most build workers that run at
once.

- **3**, recommended: the default.
- **1**: no split. One build worker builds every criterion in order.
- **Another number**, such as 2 for a machine that runs slow test suites.
