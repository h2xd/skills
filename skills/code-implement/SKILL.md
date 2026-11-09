---
name: code-implement
description: "Work one ticket from start to PR: read its acceptance criteria, branch, build them test-first, and commit after each. Then open the PR with h2xd:git-pr-body, review it with h2xd:review-pr and fix the threads with h2xd:review-fix, without stopping between them. Use when the user names a ticket to work on, says implement, or picks the next ticket."
argument-hint: "[ticket number]"
---

# Code implement

A ticket that says "undo restores the last move" should end as a failing test,
a passing test and a commit that names `#42`. A ticket from `/h2xd:to-tickets`
or `/h2xd:plan-triage` already says what to build and how to check it.

This skill turns the ticket into a branch, tested commits and a reviewed PR. It
makes no new decisions. You orchestrate. A subagent on a fast model writes the
code, and reviewers on the strongest model check it. Hand-offs go through files
in your scratchpad, called `$WORK` below. When the ticket is not clear enough to build, it stops
and says why.

## Steps

### 1. Read the ticket

Read the ticket and its comments with the **View** operation in
`docs/agents/issue-tracker.md`. Read its parent and the decision records it
names. Check each blocker in its `## Blocked by` section. When the tracker page
lists a **Block** operation, also check the blockers it records.

- When a blocker is still open, stop and name it.
- When the ticket has no acceptance criteria, or a criterion you cannot check,
  stop. Offer `h2xd:plan-grill` to settle them, or `/h2xd:plan-triage` to write
  a brief.

Done when you can list the acceptance criteria and every blocker is closed.

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

### 3. Build each criterion

1. Write `$WORK/ticket.md`: the ticket number, the branch, and the acceptance
   criteria in the ticket's order.
2. Agree the test entry points with the user once, per step 3 of
   `h2xd:code-tdd`. Add them to `ticket.md`. A subagent cannot ask the user.
3. Start one subagent on a fast model, such as Sonnet, through the CLI's
   subagent tool, such as Agent. Give it the paths to `ticket.md` and
   [`implementer.md`](implementer.md), which holds its instructions.
4. Read `$WORK/built.md` and `git log --oneline <base>..HEAD`. A criterion
   marked `not built` goes to the report.

Done when every criterion has a passing test and a commit, or a reason in
`built.md`.

### 4. Check the whole change

1. Run the lint, typecheck and test commands from the agent instructions file.
2. Run `h2xd:prove-tests` on the branch diff.
3. Run `h2xd:review-code-comments` on the branch diff.

Done when every check passes, and each surviving mutant has a test or a
reason.

### 5. Open, review and fix

Run each skill in order, without asking between them:

1. `h2xd:git-pr-body` for ticket `#<n>`. It pushes and opens the PR.
2. `h2xd:review-pr` on that PR. It posts the review.
3. `h2xd:review-fix` when the review left threads. It pushes the fixes.
4. `h2xd:review-pr` once more when step 3 pushed.
5. `h2xd:review-fix` once more when the second review left threads. Then stop.

Stop the chain early when a check fails, or when the PR opened as a draft. A
draft means `h2xd:git-pr-body` rated the change a one-way door, one that is
hard to undo. Report the draft and let the user decide.

Done when the second review has no open threads or the second fix pushed,
or the chain stopped with a reason.

### 6. Report

```
🔴 <criterion>: <not built, and why>
🟡 <item>: <a check left open, a follow-up ticket to file>
🟢 #<n>: <criteria> criteria built, <commits> commits, <PR URL>, <review verdict>
```

Done when every acceptance criterion has its line.

## Do

- Build only what the acceptance criteria ask for.
- Commit after each criterion, so the history shows the slices.
- File what you find outside the ticket as a new issue, after a yes.
- Stop when the ticket is unclear. A guess becomes a wrong PR.

## Don't

- Don't start on a ticket with an open blocker. Name the blocker.
- Don't change the acceptance criteria to fit the code. Ask the user.
- Don't fold an unrelated fix into the branch. File it as its own ticket.
- Don't start a third review or a third fix. Report the threads still open.
