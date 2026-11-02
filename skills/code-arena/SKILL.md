---
name: code-arena
description: Run N candidates at one coding task in parallel, each in its own git worktree, score them against a rubric built from h2xd:code-quality and the tests, pick a base, and graft the best parts of the others into it. Use when the user asks for an arena, or for several competing attempts at a non-trivial change whose shape one attempt would lock in.
argument-hint: "[n] <task>"
disable-model-invocation: true
---

# Arena

Give one task to three engineers and you see which choices were real, and
which were just the first idea that worked. An arena runs N attempts, each in
its own git worktree, and builds the result from the strongest one plus the
best ideas of the rest. It costs N full builds, so only the user starts it.

`$WORK` is a scratchpad directory, and every hand-off is a file in it. Run one
command per shell call.

## Steps

### 1. Frame

When the working tree is dirty, stop and ask the user to commit or stash.
Set `$BASE` to the output of `git rev-parse HEAD`. Set `N` to the argument, or
3, and at most 5.

Write `$WORK/task.md`: what the change must do and where, `$BASE`, the
acceptance criteria and the check commands. Read the criteria from the linked
issue, as `docs/agents/issue-tracker.md` says. The checks are the tests, lint
and typecheck the agent instructions file names, or `mutation.testCommand` in
`agents.config.json`.

Write `$WORK/rubric.md` with 3 to 6 criteria a reader can grade on this task.
Always include "the checks pass" and the parts of `../code-quality/SKILL.md`
the task touches, such as data first, deep modules, or tests through the
interface. Candidates never see the rubric.

When the task has open design questions, run `h2xd:plan-grill` first, or the
candidates diverge on guesses.

Done when `task.md` and `rubric.md` exist and `N` is set.

### 2. Create the worktrees

For each candidate `n` from 1 to `N`, run
`git worktree add -b arena/<slug>-<n> ../<repo>-arena-<slug>-<n> $BASE`.
In each, run every command that
`jq -c '.worktreeSetup[]' agents.config.json` lists.

Done when `git worktree list` shows `N` arena worktrees at `$BASE`.

### 3. Fan out

Start `N` background subagents in one message, through the CLI's subagent
tool, such as Agent, on the strongest model, such as Opus. When the CLI offers
a model from another vendor, put some candidates on it, because one model
repeats one shape. Each prompt holds only absolute paths:
[`candidate.md`](candidate.md), `task.md`, `../code-quality/SKILL.md`, the
worktree, and the rationale file `$WORK/candidate-<n>.md`.

When a candidate fails or leaves no commit, note the dropout and go on. With
fewer than two left, stop and report.

Done when each surviving candidate has a commit and a rationale file.

### 4. Score

Run the check commands in each surviving worktree. Record pass or fail per
command in `$WORK/checks.md`.

Start one read-only judge subagent with the paths to [`judge.md`](judge.md),
`task.md`, `rubric.md`, `checks.md`, `../code-quality/SKILL.md`,
`../code-quality/smells.md`, and the output `$WORK/verdict.md`. Label the
worktrees by letter, A, B, C, never by model. When the CLI offers another
model than the candidates', run the judge on it, so it does not favor its own
shape.

While the judge runs, read every diff end to end with
`git -C <worktree> diff $BASE`, and its rationale. In `$WORK/scores.md`, score
each criterion for each candidate, one criterion at a time, not by feel.

Done when `scores.md` and `verdict.md` score every criterion for every
candidate.

### 5. Pick the base

- A candidate with failing checks is not the base while another passes.
- Compare your scores with the verdict. Where they disagree, read both
  reasons. One of you misread, or a criterion is vague.
- Pick the candidate a maintainer can extend without breaking an invariant.
  On a tie, take the smaller interface.
- When all candidates share one shape, ship that shape with no grafts.
- When they share almost nothing, the task was under-specified. Reframe in
  step 1 and run again. Do not average them.

Done when `$WORK/synthesis.md` names the base and why.

### 6. Graft

Read each other candidate once more for what beats the base: a test it lacks,
a better name, a missed edge case, a simpler function. Expect one or two
grafts per candidate. Port each graft by hand in the base worktree, in the
base's types and names. Commit each graft with `h2xd:git-commit`, and name the
source candidate in the body.

Done when `synthesis.md` lists each graft with its source, and each rejected
idea with why.

### 7. Verify

In the base worktree, run the check commands. Run the changed code and read
its real output. Run `h2xd:prove-tests` with `$BASE` as the base.

A defect no candidate handled means the frame was wrong, so go back to step 1.
A defect one candidate handled means a missed graft, so go back to step 6.

Done when every check passes and no surviving mutant marks a behavior the
task asked for.

### 8. Hand over

Report in chat in the format below. Keep the base branch and worktree. Ask
before you remove the others with `git worktree remove` and `git branch -D`.

Done when the user has the report and chose what happens to the others.

## Report

One line per item, worst first, then the checks run and their result.

```
🔴 check: <command>: <what still fails, and the next action>
🟡 dropout: <label>: <why>
🟡 judge: <where the verdict disagreed, and how it was settled>
🟢 base: <label> on arena/<slug>-<n> at <path>: <why>
🟢 graft: <what> from <label>
```

## Do

- Give every candidate the same task file and nothing about the others.
- Write your scores before you read the verdict.
- Keep the base worktree until the user has merged or dropped it.

## Don't

- Don't start more than 5 candidates. Split the task or sharpen the frame.
- Don't pick a failing base while one passes. Port its idea as a graft.
- Don't paste hunks or cherry-pick. Rewrite each graft in the base's shape.
- Don't show candidates the rubric. Give them the task and its criteria.
- Don't remove worktrees without asking. List them and let the user choose.
