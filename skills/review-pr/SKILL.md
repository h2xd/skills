---
name: review-pr
description: Review a PR, the given number or the current branch's, with up to five reviewers picked from the diff, then post one GitHub review that approves or requests changes, without asking. The reviewers cover correctness, standards, comments, tests by mutation check, and blast radius. Findings become Conventional Comments. Use for a code review of a PR, or after opening one. review-fix acts on the result.
argument-hint: "[pr-number]"
---

# Review PR

One reviewer reads the diff and sees the diff. Up to five reviewers, each with
one lens, also see the caller that breaks, the test that proves nothing and the
comment that lies. You brief them, merge what they find, and post one review.

You are the orchestrator. You gather context, pick and brief the reviewers,
post and summarize. Subagents do the reading and writing. Every hand-off goes
through a file in your scratchpad, called `$WORK` below, so file dumps stay out
of your context.

Severity is the finding's status for the merge. 🔴 blocks it, 🟡 needs
attention, 🟢 is fine to leave. [`reviewer-brief.md`](reviewer-brief.md) has the
full scale.

The `node scripts/review.ts` subcommands from `h2xd:setup` do the mechanical
work. Run one command per shell call, never chained with `&&` or `;`.

## Steps

### 1. Gather context

`<pr>` is the PR number passed as the argument. Without one, leave it out and
`gh` picks the current branch's PR. With a number, read the PR's
`headRefName` with `gh pr view <pr> --json headRefName` and compare it with
`git branch --show-current`. On a mismatch, review from a worktree:

```sh
node scripts/review.ts worktree <headRefName>
```

It prints the path. It creates the worktree and runs `worktreeSetup`
when needed. The shell stays in the session's directory, so run every later
command against that path, with `git -C <path>`, `node <path>/scripts/review.ts`
or absolute paths. `$WORKTREE` is that path, or the current directory.

```sh
node scripts/review.ts context <pr> --worktree $WORKTREE --out $WORK/context.md
```

- **No PR found:** stop. Tell the user to open one or pass its number.
- **"Head mismatch" warning:** the local head differs from the pushed head.
  Ask whether to push first. This is one of the two times you ask.
- **"Dirty tree" or "Wrong branch" warning:** go on. The reviewers read the
  pushed head. Say so in the summary.

Done when `context.md` names `$WORKTREE`, the PR number and URL, owner and
repo, the base branch, the head SHA, the PR author, the `gh` login, every
changed file, every linked issue with its text, every page that links a changed
file, and the existing review threads.

### 2. Pick the reviewers

Follow [`reviewer-pick.md`](reviewer-pick.md). `node scripts/review.ts fleet`
sizes the diff and picks the reviewers and the effort for Reviewer A. You ask
only for a large change.

Done when `$WORK/pick.md` exists.

### 3. Launch the reviewers

Start the picked reviewers in one message, as background subagents, through
the CLI's subagent tool, such as Agent. Each prompt holds the paths to
`context.md` and [`reviewer-brief.md`](reviewer-brief.md), and its worktree,
lens, model and findings file from [`reviewers.md`](reviewers.md). Reviewer D
runs in its own `git worktree add` of the head SHA, removed after the run.
Reviewer B also gets the path of [`reviewer-b.md`](reviewer-b.md). A later
review needs no exclusion list in the prompts, because `merge` drops a finding
that a thread holds.

Before step 4, `ls` each started reviewer's findings file and name a missing
one. Retry it as [`reviewers.md`](reviewers.md) says.

Done when every findings file exists or is named missing, and the extra
worktree is gone.

### 4. Merge the findings

A script builds the review. No subagent writes `review.json`.

```sh
node scripts/review.ts merge $WORK/review-*.json --worktree $WORKTREE --pick $WORK/pick.md --out $WORK/review.json --preview $WORK/preview.md
```

It checks each findings file first. When one fails, retry that reviewer as
in step 3, then delete its file and merge without it. It joins duplicates, moves a line
outside the diff to "Outside the diff", writes the Conventional Comments and
sorts worst first. It drops a finding that overlaps an existing thread and
prints it with the thread URL. The event is `REQUEST_CHANGES` with a 🔴,
otherwise `APPROVE`, and `COMMENT` on your own PR.

Then start one subagent on the cheapest model, such as Haiku. Give it the
paths to [`summary-bullets.md`](summary-bullets.md), `review.json` and
`$WORK/bullets.md`. It words the summary bullets and writes nothing else. Run
the merge again with `--bullets $WORK/bullets.md` added, and check the result:

```sh
node scripts/review.ts options --validate $WORK/review.json
```

Done when the merge printed `wrote`, and `options --validate` prints a line
that starts with `ok`.

### 5. Post

```sh
gh api repos/<owner>/<repo>/pulls/<n>/reviews --method POST --input "$WORK/review.json" --jq .html_url
```

A 422 names the comment GitHub rejected. The diff changed since the merge, so
run step 4 again. When the 422 comes back, stop and report it.

Done when the call returns a review URL.

### 6. Summarize in chat

Lead with the verdict, the review URL and the reviewers that ran. Then give
one line per finding, worst first. The `wrote` line has the counts:

```
🔴 or 🟡 <path:line>: <action to take>, reviewer <A-E>
🟢 <n> optional comments, <n> merged, <n> dropped, <n> moved out of the diff
```

When you created a worktree, name its path. `git worktree remove <path>`
cleans it up.

Done when every 🔴 and 🟡 finding has its line.

## Do

- Give every subagent file paths, not pasted content.
- Let `review.ts merge` join duplicates and keep every `found-by` model.
- Quote a Reviewer D mutant exactly, so `h2xd:review-fix` can plant it again.

## Don't

- Don't ask before you post, 🔴 included. Post, then summarize. Ask only for a
  head mismatch or a large change.
- Don't mark a smell 🔴 on its own. Name the concrete failure, or make it 🟡.
- Don't approve your own PR. GitHub refuses it. Post `COMMENT` with the
  verdict in the first line.
- Don't write or edit `review.json` by hand, and don't let a subagent do it.
- Don't paste reviewer output into your context. Read the counts and subjects.
