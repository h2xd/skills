# Skill catalog

Every h2xd skill, the flows that join them, and the situation each one fits.
The summaries are for routing only. The skill's own `SKILL.md` owns the details
and wins when the two disagree.

Keep this file in step with `skills/`. Every skill folder appears once in the
table below as `h2xd:<name>`. A new skill gets a row in the same change.

## The main flow: idea to merged PR

Most work runs along this path. Each arrow is the usual next step, not a rule.

```
plan-grill → to-spec → to-tickets → code-implement → review-pr → review-fix → session-retro
```

1. `h2xd:plan-grill` turns an idea into settled decisions. It records terms with
   `h2xd:docs-glossary` and decisions with `h2xd:docs-adr` as they settle.
2. When only something a person runs or sees can settle a question, detour
   through `h2xd:plan-prototype`. For competing real attempts, use
   `h2xd:code-arena`. Then go back to `h2xd:plan-grill` with the answer.
3. When the build spans more than one session, `h2xd:to-spec` writes the spec
   as a tracker issue. `h2xd:to-tickets` splits it into tickets with blocking
   edges. Work the tickets in order, blockers first. When the build fits in one
   session, skip both and build here.
4. `h2xd:code-implement` works one ticket: branch, `h2xd:code-tdd` per
   acceptance criterion, and `h2xd:git-commit`. Then the user runs
   `h2xd:git-pr-body`.
   `h2xd:code-quality` and `h2xd:lang-ts-base` set the bar while writing.
5. `h2xd:git-commit` writes each commit message.
   `h2xd:review-code-comments` cleans comments before review.
6. `h2xd:git-pr-body` writes the PR body. `h2xd:review-pr` reviews the PR, and
   `h2xd:review-fix` acts on the review threads.
7. `h2xd:session-retro` turns what went wrong into lints, types, tests or
   skill edits.

Keep steps 1 to 3 in one context window, so the spec and tickets build on the
grilling itself. Each ticket can start fresh. See
[between-phases.md](between-phases.md) for when to clear, compact or hand off.

## On-ramps

Starting points that create work, then join the main flow.

- Raw issues or outside PRs piling up: `h2xd:plan-triage` turns them into
  agent-ready issues. Tickets from `h2xd:to-tickets` are already agent-ready,
  so they skip triage.
- Something broken, failing, flaky or slow: `h2xd:code-debug` builds a red
  command first and ends with a regression test. Then `h2xd:session-retro`
  asks what would have prevented it.
- Code that is hard to change or test: `h2xd:code-architecture` finds the
  candidates. The one the user picks goes to `h2xd:plan-grill`.
- A question nobody in the session can answer: `h2xd:to-questionnaire` asks the
  customer or the person who can, on a page. The answers go back to
  `h2xd:plan-grill` or `h2xd:to-spec`.
- An idea that may clash with what the wiki says: `h2xd:docs-fact-check`
  before `h2xd:plan-grill`.
- A fact from outside the repo: `h2xd:docs-research` files it as a wiki page
  that `h2xd:plan-grill` and `h2xd:to-spec` can cite.

## Understand before changing

```
how → why → teach
```

`h2xd:how` explains what the code does and where new code belongs.
`h2xd:why` finds the reasons and the history. `h2xd:teach` runs one or both and
explains the result plainly. Run them before a change to unfamiliar code.

## Prove it works

- `h2xd:prove-e2e-create` once per repo, so agents can drive the app.
  `h2xd:prove-e2e-maintain` when the app has drifted from it.
- `h2xd:prove-tests` after writing tests.
- `h2xd:prove-blast-radius` for a diff whose effects outside itself are
  unclear.
- `h2xd:prove-measure` before trusting a number.

## Close calls

- `h2xd:how` explains what the code does. `h2xd:why` explains why it is that
  way. `h2xd:docs-research` answers from sources outside the repo.
- `h2xd:plan-prototype` builds one throwaway thing for a person to try.
  `h2xd:code-arena` builds several real attempts and grafts the best into one.
- `h2xd:code-arena` gives every worker the same task. `h2xd:code-swarm`
  splits one task into slices or a race and returns one report.
- `h2xd:docs-fact-check` checks one idea against the wiki and changes
  nothing. `h2xd:docs-proofread` reads the whole wiki against itself and fixes
  words and links. `h2xd:docs-quiz` asks whether the wiki answers real
  questions.
- `h2xd:review-pr` reviews the diff against the bar.
  `h2xd:prove-blast-radius` looks for breakage outside the diff.
- `h2xd:plan-grill` asks up to four questions at a time in the chat.
  `h2xd:to-page` puts a checklist or a round of decisions on a page, for the
  user or the team. `h2xd:to-questionnaire` puts broad questions on a page
  for a customer or a person outside the team.
- `h2xd:what` re-says the last message. `h2xd:plan-sharpen` rewrites the
  user's next prompt before it is sent.
- `h2xd:session-handoff` writes the session down for another session or agent.
  `h2xd:session-retro` changes the repo so the next session does better.

## Catalog

| The user wants to | Skill |
|---|---|
| Configure a repo for the h2xd skills | `h2xd:setup` |
| Block destructive git commands before they run | `h2xd:git-guardrails` |
| Find the next step, or which skill fits a situation | `h2xd:next` |
| Set the writing tone: short, plain, summary first | `h2xd:setup-tone` |
| Work one ticket from branch to PR | `h2xd:code-implement` |
| Stress-test an idea, plan or design by interview | `h2xd:plan-grill` |
| Write a discussed feature up as a spec issue | `h2xd:to-spec` |
| Split a spec or plan into tickets with blocking edges | `h2xd:to-tickets` |
| Work through checks or decisions on a page | `h2xd:to-page` |
| Ask a customer or someone outside the team the questions a plan waits on | `h2xd:to-questionnaire` |
| Move incoming issues and PRs to agent-ready | `h2xd:plan-triage` |
| Build a feature or fix a bug test-first | `h2xd:code-tdd` |
| Diagnose and fix a bug or a slowdown | `h2xd:code-debug` |
| Answer a design question with throwaway code | `h2xd:plan-prototype` |
| Run several attempts at one task and merge the best | `h2xd:code-arena` |
| Run parallel workers over slices or a race | `h2xd:code-swarm` |
| Know the quality and architecture bar | `h2xd:code-quality` |
| Apply the TypeScript rules to `.ts` or `.tsx` work | `h2xd:lang-ts-base` |
| Enforce deep modules in a TypeScript repo | `h2xd:lang-ts-deep-modules` |
| Find refactoring targets and deepen modules | `h2xd:code-architecture` |
| Follow the working rules every session keeps | `h2xd:code-rules` |
| Know how code works or where new code belongs | `h2xd:how` |
| Know why code or a value is the way it is | `h2xd:why` |
| Understand a change or subsystem, explained plainly | `h2xd:teach` |
| Get a question answered from primary sources | `h2xd:docs-research` |
| Hear the last message again, simpler | `h2xd:what` |
| Get a prompt rewritten deeper before sending it | `h2xd:plan-sharpen` |
| Write a commit message | `h2xd:git-commit` |
| Write a PR body | `h2xd:git-pr-body` |
| Review a PR | `h2xd:review-pr` |
| Address review comments on a PR | `h2xd:review-fix` |
| Remove useless comments before review | `h2xd:review-code-comments` |
| Find skills that overlap and tidy the set | `h2xd:review-skills` |
| Check that the tests catch wrong changes | `h2xd:prove-tests` |
| Find what a change breaks outside its diff | `h2xd:prove-blast-radius` |
| Vet a benchmark, latency or eval number | `h2xd:prove-measure` |
| Give agents a scripted way to drive the app | `h2xd:prove-e2e-create` |
| Bring the verification skill back in line with the app | `h2xd:prove-e2e-maintain` |
| Add, update or query pages in the docs wiki | `h2xd:docs-wiki` |
| Add, sharpen or rename a glossary term | `h2xd:docs-glossary` |
| Record, supersede or correct a decision | `h2xd:docs-adr` |
| Check an idea or claim against the docs wiki | `h2xd:docs-fact-check` |
| Proofread the whole wiki, unattended, with several agents | `h2xd:docs-proofread` |
| Test whether the wiki answers real questions | `h2xd:docs-quiz` |
| Pass the work to a fresh session or agent | `h2xd:session-handoff` |
| Turn a session's mistakes into lasting fixes | `h2xd:session-retro` |
| Walk a person through steps only they can do | `h2xd:setup-wizard` |
| Write or rewrite a skill or agent prompt | `h2xd:add-skill` |
| Cut AI tells from prose | `h2xd:add-soul` |
