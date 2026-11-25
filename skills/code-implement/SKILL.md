---
name: code-implement
description: "Work one ticket from start to PR: read its acceptance criteria, branch, build them test-first with parallel build workers, and commit after each. Then open the PR with h2xd:git-pr-body, review it with h2xd:review-pr and fix the threads with h2xd:review-fix and close them with h2xd:review-gate, without stopping between them. Use when the user names a ticket to work on, says implement, or picks the next ticket."
argument-hint: "[ticket number] [pr-only]"
---

# Code implement

A ticket that says "undo restores the last move" should end as a failing test,
a passing test and a commit that names `#42`. A ticket from `/h2xd:to-tickets`
or `/h2xd:plan-triage` already says what to build and how to check it.

This skill turns the ticket into a branch, tested commits and a reviewed PR.
It makes no new decisions. You orchestrate. Build workers on a fast model write
the code, and reviewers on the strongest model check it. Hand-offs go through
files in your scratchpad, called `$WORK` below. An unclear ticket stops it.

A **build worker** builds one **criteria group**: criteria that share files
or need each other. Groups run at once, each in its own worktree.

## Before step 1

Run the checks in [`preflight.md`](preflight.md). When one says stop, stop.

## Steps

### 1. Read the ticket

Read the ticket and its comments with **View** in
`docs/agents/issue-tracker.md`. Read its parent and the decision records it
names. Check each blocker in its `## Blocked by` section, and the ones a
**Block** operation records, when the tracker page lists it.

- When a blocker is still open, stop and name it.
- When the ticket has no acceptance criteria, or a criterion you cannot check,
  stop. Offer `h2xd:plan-grill` to settle them, or `/h2xd:plan-triage` to write
  a brief.
- A spec is the one exception. It has the label that the tracker page gives a
  spec, and it says that the user builds it as one PR. Its user stories are
  then the acceptance criteria, in their order. Take the test entry points
  from its testing decisions. Add a ⚪ line that says so.

Then check who holds the ticket. Read its assignees from **View**. Run the
tracker page's **Open PRs closing a ticket** lookup. Run **Search** for `#<n>`
and list each open issue that mentions the ticket.

- When another person is the assignee, stop and name them.
- When an open PR closes the ticket, stop and name its number and URL.
- When the user is the assignee already, look for a branch and an open PR for
  the ticket. When one exists, stop and name it. Otherwise go on.

When these checks pass, run **Claim** when the tracker page lists it. When it
fails, stop. Name the ticket as claimed, the `in-progress` label and the
**Unclaim** command, so the user can clear a stale label. Then run **Assign**
when the page lists it. When **Assign** fails, go on and add a 🟡 line to the
report.

Done when you can list the acceptance criteria, every blocker is closed, no
other person or open PR holds the ticket, and **Claim** and **Assign** ran or
the page lacks them.

### 2. Make the branch

When the tree is dirty, stop and ask. Otherwise start from the up-to-date
default branch:

```sh
git fetch origin
git switch -c <type>/<n>-<slug> origin/$(git symbolic-ref --short refs/remotes/origin/HEAD | sed 's|^origin/||')
```

`<type>` is the commit type most of the work will have, such as
`feat/42-undo-last-move`.

Done when `git branch --show-current` prints the new branch.

### 3. Plan the build workers

1. Write `$WORK/ticket.md`: the ticket number, the branch, and the acceptance
   criteria in the ticket's order, numbered from 1.
2. Agree the test entry points with the user once, per step 3 of
   `h2xd:code-tdd`, and add them to `ticket.md`. Copy them when the ticket
   names them. A subagent cannot ask.
3. Skip the scout and the split when the ticket has fewer than 3 criteria, or
   `implement.maxWorkers` in `agents.config.json` is 1. Plan one build worker
   with all of them, go to [step 4](#4-build), and add a ⚪ line.
4. Start one scout and group the criteria, per
   [`planning.md`](planning.md). It ends with `$WORK/split.md`.
5. For a spec, the verdict is often `single`, because its stories share a
   settings file or a catalog. Say so in one line before step 4. Name
   `/h2xd:to-tickets` as the way to more than one build worker. Do not stop.

Done when every criterion belongs to exactly one build worker, or to step 5
as a checks criterion.

### 4. Build

For one build worker, write `$WORK/worker-1.md` per
[`parallel.md`](parallel.md): the repo root, the ticket branch, every
criterion, `files: unknown` without a scout, and `built: $WORK/built-1.md`.
Start one subagent on a fast model, such as Sonnet. Give it the paths to
`ticket.md`, `worker-1.md`, [`build-worker.md`](build-worker.md) and
`<repo root>/docs/agents/subagents/builder.md`. For more than one, see
[`parallel.md`](parallel.md). For a missing page, see
[`missing-page.md`](missing-page.md).

Then read every `$WORK/built-<id>.md` and the commits since `origin/HEAD`. A
criterion marked `not built` goes to the report.

Done when every criterion that has a build worker has a passing test and a
commit on the ticket branch, or a reason in a `built` file.

### 5. Check the whole change

1. Run the lint, typecheck and test commands from the agent instructions file.
   Never skip them.
2. Run `h2xd:prove-tests` on the branch diff. Skip it when the diff has no
   logic lines, such as skill prose or docs only. Add a ⚪ line.
3. Run `h2xd:review-code-comments` on the branch diff. Skip it when the diff
   adds no code comment. Add a ⚪ line.

Done when every check passes, and each surviving mutant has a test or a
reason.

### 6. Open, review, fix and gate

Never skip this chain. Follow [`chain.md`](chain.md). It runs the PR body,
the review, the fixes and the gate in order, without asking between them. With
the argument `pr-only`, it ends after the PR opens.

Done when no step is left whose condition is true, or the chain stopped early
with a reason.

### 7. Report

When no PR opened, run **Unclaim** first, when the tracker page lists it.
After a PR, the label stays until the issue closes.

Give the user the report in chat, in the layout of [`report.md`](report.md).
Its first line says if the PR can merge. 🔴 blocks the merge and 🟡 does not.

Done when every acceptance criterion has its line, the counts match, and a
stop before a PR ran **Unclaim**.

## Do

- Build only what the acceptance criteria ask for.
- Commit after each criterion, so the history shows the slices.
- File what you find outside the ticket as a new issue, after a yes.
- Stop when the ticket is unclear. A guess becomes a wrong PR.

## Don't

- Don't start on a ticket with an open blocker. Name the blocker.
- Don't change the acceptance criteria to fit the code. Ask the user.
- Don't fold an unrelated fix into the branch. File it as its own ticket.
- Don't start a third review, or a fix round outside `h2xd:review-gate`.
- Don't ask about a `split` verdict. Split, and name the workers in the report.
