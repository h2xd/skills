---
name: review-fix
description: Address the unresolved review threads on a PR, the given number or the current branch's. Triages the threads, has a subagent apply the fixes and prove mutation fixes, removes narrating comments with h2xd:review-code-comments, then commits, pushes, replies on each thread and resolves the fulfilled ones, without asking while the checks pass. Use after a review, from review-pr or a person.
argument-hint: "[pr-number]"
---

# Review fix

A reviewer leaves ten comments. Nine are right, one is wrong, and every one
needs an answer on the thread. This skill fixes the nine, declines the one with
a reason, and closes only the threads the pushed code really answers.

You are the orchestrator. You gather the threads, triage them, check the fixes
and summarize. You ask only about an **ask** item, a failing check, a dirty
tree or a diverged head. A subagent makes the code changes. Every hand-off goes
through a file in your scratchpad, called `$WORK` below.

`node scripts/review.ts` from `h2xd:setup` does the mechanical work. Run one
command per shell call. Chain only stage and commit, as `h2xd:git-commit` does.

## Steps

### 1. Gather the threads

`<pr>` is the PR number passed as the argument. Without one, leave it out and
`gh` picks the current branch's PR. The fixes land on the PR's branch.

Run `gh pr view <pr> --json headRefName`. When `headRefName` differs from the
current branch, work in a worktree of it:

```sh
node scripts/review.ts worktree <headRefName>
```

It prints the path. Run every later command in that directory, through
`git -C <path>`, `node <path>/scripts/review.ts` or absolute paths. `$WORKTREE`
is that path, or the current directory.

```sh
node scripts/review.ts threads <pr> --worktree $WORKTREE --out $WORK/threads.md
```

- **No PR found:** stop. Tell the user to pass its number.
- **"Dirty tree" warning:** stop and ask. The fixes must be the commit's only
  changes.
- **"Head mismatch" warning:** comment line numbers refer to the pushed head.
  When only the local branch is ahead, run `git push`. When only the remote is
  ahead, run `git pull --ff-only`. When both moved, stop and ask.

Done when `threads.md` lists every open item with an id. Threads are `T1`,
`T2`. Outside-the-diff findings are `S1`, `S2`, each with a stable `Item id`.

### 2. Triage

Sort each item into fix, decline or ask, by the rules in
[`triage.md`](triage.md).

Write `$WORK/plan.md`: one row per item with id, bucket, `path:line`, and the
change or the reason. Show it as a table. Take each **ask** item to the user
with clickable options, through the CLI's question tool, such as
AskUserQuestion. Ask at most four per call, recommendation first.

Done when every item is fix or decline, and each **ask** item has the user's
answer.

### 3. Apply the fixes

Start one subagent on a fast model, such as Sonnet, through the CLI's subagent
tool, such as Agent. Give it the paths to `threads.md`, `plan.md` and
[`fixer.md`](fixer.md), which holds its instructions, and `$WORKTREE`.

Then read `changes.md` and `git diff`. Check each fix row against the diff, not
only the suggestion. A `not applied` fix goes back to triage. A row on code
that is not a test goes to the fixer when it lists no pinning tests or reason.

Run `h2xd:review-code-comments` on the uncommitted diff in `$WORKTREE`. It
removes narration such as "per review".

When a check in `changes.md` fails, show it with `git diff --stat`. Ask with
clickable options: fix it first, or stop with the changes uncommitted.

Done when every fix row matches the diff, the comment report is accepted, and
the checks in `changes.md` pass.

### 4. Draft the replies

Draft one reply per item into `$WORK/replies.md`, in the formats of
[`replies.md`](replies.md).

Done when `replies.md` has one reply per item.

### 5. Commit, push, reply

1. Commit with `h2xd:git-commit`. Add `Refs: #<issue>` and `Refs: <PR URL>`.
2. Run `git push`. When the remote moved ahead, stop and ask.
3. Re-read the PR body with `gh pr view <pr> --json body -q .body`. A fix
   that changes a number, a word or a file the body names makes that
   sentence untrue. Write the new body to `$WORK/body.md`, run
   `PR_BODY="$(cat $WORK/body.md)" node scripts/lint-pr-body.ts`, then
   `gh pr edit <pr> --body-file $WORK/body.md`.
4. Post the replies:

   ```sh
   node scripts/review.ts reply <pr> $WORK/replies.md --sha <short sha> --threads $WORK/threads.md
   ```

   It fills `<sha>`, replies on each thread, and posts the `S…` items as one PR
   comment, one section per item id. It posts nothing and exits 1 when a
   `<sha>` would remain or an id is missing.

Done when the PR body is true to the pushed head and every item has a reply
URL.

### 6. Resolve fulfilled threads

When every fix row is applied and the checks pass, resolve the fix threads
yourself in one `review.ts resolve` call. Start a subagent only for a thread
whose fix is in doubt, per [`resolving.md`](resolving.md).

Done when every fix thread printed `resolved` or is in `resolved.md`.

### 7. Summarize in chat

Lead with the commit SHA and the PR URL. Then one line per item, worst first:

```
🔴 <id> <path:line>: <fix not applied, or a check still failing>
🟡 <id> <path:line>: declined or left open, <why> (<reply URL>)
🟢 <id> <path:line>: fixed and resolved, <what changed> (<reply URL>)
```

Name any failure already on the base branch. Name a worktree you created.
`git worktree remove <path>` cleans it up.

Done when every item has its line.

## Do

- Read each thread's code before choosing a bucket.
- Use the engineer's `Choice` letter when there is one.
- Prove each mutation fix by planting the mutant again.
- Check the diff against the plan, not only against the suggestion.

## Don't

- Don't commit, push or reply while a check fails. Show the failure and ask.
- Don't force-push. Stop and ask when the remote moved ahead.
- Don't resolve a declined thread. Leave it open for the reviewer.
- Don't change production code to kill a mutant. Write the test.
- Don't commit unrelated changes. Stop on a dirty tree and ask.
