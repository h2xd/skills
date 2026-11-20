---
name: review-gate
description: Final approval gate for a PR after review-fix. One strong voter reads every unresolved thread and votes approve or disagree. Three arbiters judge each disagreement, and a script tallies them. A keep majority resolves with a reply, a change majority goes to the fixer, and the gate posts APPROVE when no thread stays open. Use after the last review-fix, or when the user asks for a final check before merge.
argument-hint: "[pr-number]"
---

# Review gate

A fix lands and the thread stays open. The reviewer never comes back, and the
PR waits for a person. This skill reads each open thread against the pushed
code, closes the ones that are done, settles a dispute by vote, and approves
the PR when nothing is left.

You are the orchestrator. You gather the threads, start the voter and the
arbiters, run the tally and post. Subagents read and write files. Every
hand-off goes through a file in your scratchpad, called `$WORK` below. Do not
ask before you post, as ADR-0004 says.

## Before step 1

Run `node scripts/review.ts` with no arguments. Its `usage:` line must list
`worktree`, `threads`, `reply`, `resolve` and `tally`. When one is missing,
stop with one line: "run /h2xd:setup". Run one command per shell call.

## Steps

### 1. Gather the threads

Gather the unresolved threads as step 1 of
[`review-fix`](../review-fix/SKILL.md) does, with the same worktree rule:

```sh
node scripts/review.ts threads <pr> --worktree $WORKTREE --out $WORK/threads.md
```

When no thread is open, go to step 7.

Done when `threads.md` lists every open thread with an id.

### 2. Vote

Start one subagent on the strongest model, such as Opus, through the CLI's
subagent tool, such as Agent. Give it the paths to [`voter.md`](voter.md),
`threads.md` and `$WORKTREE`. It writes `$WORK/votes.md`.

Done when `votes.md` has one `approve` or `disagree` line for every thread.

### 3. Resolve the approved threads

```sh
node scripts/review.ts resolve --threads $WORK/threads.md <approve labels>
```

Done when each approve thread printed `resolved`.

### 4. Judge the disagreements

For each `disagree` thread, start three arbiters in one message, in the
background. One runs on a fast model, such as Sonnet, as `sonnet`. Two run on
the cheapest model, such as Haiku, as `haiku-1` and `haiku-2`. Give each the
paths to [`arbiter.md`](arbiter.md), `threads.md`, `votes.md`, the thread
label, its arbiter name, `$WORK/verdicts` and `$WORKTREE`. They never see each
other's files.

Done when `$WORK/verdicts` holds `<label>-<arbiter>.md` for every disagree
thread and every arbiter name.

### 5. Tally

```sh
node scripts/review.ts tally --threads $WORK/threads.md --verdicts $WORK/verdicts <disagree labels>
```

A `keep` majority gets a reply with the count and the reasons, and the thread
is resolved. A `change` majority is printed with its reasons, and nothing is
posted. A thread with a missing verdict file prints `error` and stays open.
Start that arbiter once more, then tally that thread again.

Done when every thread printed `keep`, `change` or `error`, and each `error`
was retried once.

### 6. Fix, then re-check once

Skip this step when no thread has a `change` majority.

1. Write `$WORK/plan.md` with one fix row per `change` thread, in the format
   of [`triage.md`](../review-fix/triage.md). The arbiters' reasons are the
   change to make. The fixer never overrules the vote.
2. Run steps 3 to 6 of [`review-fix`](../review-fix/SKILL.md) on those rows.
   It applies the change, commits, pushes and replies. Do not resolve those
   threads yet.
3. Gather the threads again. Start the voter once more, on the changed
   threads only. Resolve each `approve`. A `disagree` stays open. There is no
   second vote and no second arbiter round.

Done when each changed thread is resolved or listed as open.

### 7. Post the verdict

Count the unresolved threads, with `review.ts threads` on the PR.

- **None open:** compare `gh pr view <pr> --json author --jq .author.login`
  with `gh api user --jq .login`. Post `gh pr review <pr> --approve` with a
  one-line body. When both logins match, it is your own PR and GitHub refuses
  an approval. Post `--comment` instead.
- **Some open:** post nothing. List them in the report.

Done when the review URL is known, or the open threads are listed.

### 8. Summarize in chat

Lead with the verdict and the PR URL. Then one line per thread, worst first,
as the Reports section of [`add-skill`](../add-skill/SKILL.md) shows:

```
🔴 <label> <path:line>: still disagrees, open, <reason> (<thread URL>)
🟡 <label> <path:line>: tally error, open, <missing file>
🟢 <label> <path:line>: approved, kept by 2/3, or changed and approved
```

Done when every thread has its line.

## Do

- Give every subagent file paths, not pasted content.
- Judge each thread against the pushed code, not the comment alone.
- Run the voter once more only on threads the fixer changed.
- Leave a thread open when any step on it fails.

## Don't

- Don't resolve a thread the voter disagreed with and the arbiters did not
  keep. Leave it open.
- Don't run a second arbiter round. The re-check is one vote, then stop.
- Don't approve while a thread is open.
- Don't let the fixer overrule a `change` majority. Apply it.
