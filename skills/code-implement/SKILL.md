---
name: code-implement
description: "Work one ticket from start to PR: read its acceptance criteria, branch, build them test-first, and commit after each. Then hand the PR body to git-pr-body. Use when the user names a ticket to work on, says implement, or picks the next ticket."
argument-hint: "[ticket number]"
---

# Code implement

A ticket that says "undo restores the last move" should end as a failing test,
a passing test and a commit that names `#42`. A ticket from `/h2xd:to-tickets`
or `/h2xd:plan-triage` already says what to build and how to check it.

This skill turns the ticket into a branch, tested commits and a PR body. It
makes no new decisions. When the ticket is not clear enough to build, it stops
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

Load `h2xd:code-rules` and `h2xd:code-quality`. Then run `h2xd:code-tdd` once
for the whole ticket:

- Give it the acceptance criteria, in the ticket's order, as its behavior
  list. The user confirms the test entry points once.
- Commit with `h2xd:git-commit` after the slices of each criterion. The
  footer says `Refs: #<n>`. The commit for the last criterion says
  `Closes: #<n>`.
- Tell code-tdd to skip its own prove-tests step. Step 4 runs it once on the
  whole branch.

Done when every criterion has a passing test and a commit.

### 4. Check the whole change

1. Run the lint, typecheck and test commands from the agent instructions file.
2. Run `h2xd:prove-tests` on the branch diff.
3. Run `h2xd:review-code-comments` on the branch diff.

Done when every check passes, and each surviving mutant has a test or a
reason.

### 5. Draft the PR

Tell the user to run `/h2xd:git-pr-body` for ticket `#<n>`. That skill writes a
body that opens with the closing line for `#<n>`. It shows the body and asks
before it pushes.

Done when the user has the command to run.

### 6. Report

```
🔴 <criterion>: <not built, and why>
🟡 <item>: <a check left open, a follow-up ticket to file>
🟢 #<n>: <criteria> criteria built, <commits> commits on <branch>
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
- Don't push or open the PR here. `/h2xd:git-pr-body` asks first.
