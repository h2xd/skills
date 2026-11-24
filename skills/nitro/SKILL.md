---
name: nitro
description: "Take a ticket or the current work to a reviewed PR by running the steps of next one after another, until the review reaches its goal. Runs each skill alone, never runs the final approval gate and never merges. Use only when the user types /h2xd:nitro to hand over a ticket or the work in progress."
disable-model-invocation: true
argument-hint: "[ticket number]"
---

# Nitro

`h2xd:next` names one step and stops. The user then starts the next step, and
the one after it. This skill runs those steps in a row: the PR, the review, the
fixes and one more review, until the review reaches its goal.

It is a superset of `next`. It reads the state the way `next` does, and it
takes its steps from the table of `next`. It runs each skill alone.

Only the user starts it. It claims a ticket, pushes and posts to GitHub, so no
other skill may start it.

## Before step 1

Read `../next/SKILL.md` by path. Its step 1 reads the state, and its step 2
holds the table of states and next skills. Nitro loops over that table.

## Steps

### 1. Find the work

- A ticket number in the argument is the work.
- Without an argument, the work in progress is the work. That is a branch
  other than the default branch with commits, or an open PR.
- With neither, take the oldest ticket that is ready for an agent. Run
  **List by label** in `docs/agents/issue-tracker.md` with the
  `ready-for-agent` label of its Triage table. Keep the open tickets, lowest
  number first. Skip a ticket with an open blocker. `h2xd:code-implement`
  claims the ticket.

With no work in progress and no ticket ready for an agent, say so in one line
and stop. Do not start anything.

Done when you hold a ticket number or a branch, or you stopped with that line.

### 2. Read the state and pick the row

Run the commands of step 1 of `next`. Take the first row of the table in its
step 2 that matches. When the row is not one of these, stop and report it:

- `h2xd:code-implement` for a ticket
- `h2xd:git-commit` for uncommitted changes
- `h2xd:git-pr-body` for commits with no PR
- `h2xd:review-pr` for a PR with no review
- `h2xd:review-fix` for a PR with open threads

Done when you can name one row.

### 3. Run the skill alone

Run the skill of the row, and only that skill. Then go back to step 2.

- Run `h2xd:code-implement` with the argument `pr-only`. Its chain then ends
  after the PR opens, and nitro runs the review steps itself.
- Run `h2xd:review-pr` and `h2xd:review-fix` as the table says.
- Never run `h2xd:review-gate`, and never merge.

Done when the skill finished and its report is read.

### 4. Stop or go on

Stop when any of these is true, and say which in one line:

- **A one-way door.** A PR opened as a draft, or a skill asks before an act
  that is hard to undo.
- **A failed check.** A lint, typecheck or test command fails, or a skill
  reports 🔴.
- **A cost jump.** A skill asks before a step that costs far more than the
  steps before it, such as a large review.
- **Input it cannot get alone.** A skill asks the user a question, such as
  the test entry points or an unsure criterion.
- **A user-only skill.** The row names a skill that starts with `/`. Give the
  user its prompt.
- **Two rows fit.** Name both rows.

Otherwise go back to step 2. After a stop, the user runs nitro again, and it
reads the state and goes on.

Done when you stopped with the reason, or the state calls for the next row.

### 5. Report

```
🔴 <what blocks the PR>
🟡 <what is open>
🟢 <what is done>
```

Done when the report has one line for each of the PR, the review and the
checks.

## Do

- Read the state again after every skill. The repo is the truth.
- Run each skill alone, with its own report.
- Stop at each of the four kinds of stop, as record 0004 says, and say why.

## Don't

- Don't start nitro from another skill. Only the user types it.
- Don't run `h2xd:review-gate`, and don't merge.
- Don't run a skill that is not in the table of `next`.
- Don't start on a ticket when none is ready for an agent. Say so and stop.
