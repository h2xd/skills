---
name: code-implement
description: "Work one ticket from start to PR: read its acceptance criteria, branch, build them test-first with parallel build workers, and commit after each. Then open the PR with h2xd:git-pr-body, review it with h2xd:review-pr and fix the threads with h2xd:review-fix, without stopping between them. Use when the user names a ticket to work on, says implement, or picks the next ticket."
argument-hint: "[ticket number]"
---

# Code implement

A ticket that says "undo restores the last move" should end as a failing test,
a passing test and a commit that names `#42`. This skill turns the ticket into
a branch, tested commits and a reviewed PR. It makes no new decisions. You
orchestrate. Build workers on a fast model write the code, and reviewers on the
strongest model check it. Hand-offs go through files in your scratchpad, called
`$WORK` below. When the ticket is not clear enough to build, stop and say why.

A **build worker** builds one **criteria group**, the criteria that share files
or need each other. Groups run at the same time, each in its own worktree.

## Steps

### 1. Read the ticket

Read the ticket and its comments with the **View** operation in
`docs/agents/issue-tracker.md`. Read its parent and the decision records it
names. Check each blocker in its `## Blocked by` section, and, when the page
lists a **Block** operation, the blockers it records.

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

### 3. Plan the build workers

1. Write `$WORK/ticket.md`: the ticket number, the branch, and the acceptance
   criteria in the ticket's order, numbered from 1.
2. Agree the test entry points with the user once, per step 3 of
   `h2xd:code-tdd`. Add them to `ticket.md`. A subagent cannot ask the user.
3. When the ticket has fewer than 3 criteria, or `implement.maxWorkers` in
   `agents.config.json` is 1, plan one build worker with every criterion and
   go to [step 4, Build](#4-build).
4. When `scripts/implement.ts` is missing, plan one build worker with every
   criterion, go to [step 4, Build](#4-build), and add
   `🟡 scripts/implement.ts: missing, run /h2xd:setup` to the report.
5. Start one scout on the cheapest model, such as Haiku, through the CLI's
   subagent tool, such as Agent. Give it the paths to `ticket.md` and
   [`scout.md`](scout.md). It writes `$WORK/map.md`.
6. Group the criteria:

   ```sh
   node scripts/implement.ts split $WORK/map.md --criteria <count> --out $WORK/split.md
   ```

The command writes `split.md` and prints its verdict. Act on it per
[`planning.md`](planning.md).

Done when every criterion belongs to exactly one build worker.

### 4. Build

For one build worker, write `$WORK/worker-1.md` per
[`parallel.md`](parallel.md): the repo root as its worktree, the ticket branch,
`criteria:` with every criterion, `files: unknown` without a scout, and
`built: $WORK/built-1.md`. Start one subagent on a fast model, such as Sonnet.
Give it the paths to `ticket.md`, `worker-1.md` and
[`build-worker.md`](build-worker.md).

For more than one, follow [`parallel.md`](parallel.md). It makes the
worktrees, starts the build workers together and cherry-picks their commits.

Then read every `$WORK/built-<id>.md` and `git log --oneline origin/HEAD..HEAD`.
A criterion marked `not built` goes to the report.

Done when every criterion has a passing test and a commit on the ticket
branch, or a reason in a `built` file.

### 5. Check the whole change

1. Run the lint, typecheck and test commands from the agent instructions file.
2. Run `h2xd:prove-tests` on the branch diff.
3. Run `h2xd:review-code-comments` on the branch diff.

Done when every check passes and each surviving mutant has a test or reason.

### 6. Open, review and fix

Run each skill in order, without asking between them:

1. `h2xd:git-pr-body` for ticket `#<n>`. It pushes and opens the PR.
2. `h2xd:review-pr` on that PR. It posts the review.
3. `h2xd:review-fix` when the review left threads. It pushes the fixes.
4. `h2xd:review-pr` once more when step 3 pushed.
5. `h2xd:review-fix` once more when the second review left threads. Then stop.

Stop the chain early when a check fails, or when the PR opened as a draft. A
draft means `h2xd:git-pr-body` rated the change a one-way door, one that is
hard to undo. Report the draft and let the user decide.

Done when no step is left whose condition is true, or the chain stopped early
with a reason.

### 7. Report

```
<merge state>: <x> blocking, <y> non-blocking
🔴 <criterion>: <not built, and why>
🟡 <item>: <a check left open, a follow-up ticket to file>
🟡 <n> threads still open: <why each one is open>
🟡 <worktree path>: kept, because its commits did not land
🟢 split: <n> build workers, criteria <numbers per worker>
🟢 #<n>: <criteria> criteria built, <commits> commits, <PR URL>, <last review verdict>
```

The first line says if the PR can merge. Write it per
[`report.md`](report.md). 🔴 blocks the merge and 🟡 does not.

Done when every acceptance criterion has its line and the counts match.

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
- Don't ask about a `split` verdict. Split, and name the workers in the report.
