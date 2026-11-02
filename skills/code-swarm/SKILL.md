---
name: code-swarm
description: "Split one task into independent slices, run a parallel worker for each, collect the results through files, and return one status report with every gap named. Use when the user asks to swarm a task, or wants one worker per package, file or commit, or many independent checks at once. For competing versions of one change, use code-arena."
argument-hint: "<task, and the split or N>"
disable-model-invocation: true
---

# Swarm

One agent working through forty packages fills its context and slows down.
A swarm gives each slice to its own worker and keeps the orchestrator small.

You are the orchestrator. You frame the split, brief the workers, read their
status lines and write the report. The workers do the reading.

Every hand-off goes through a file in a new folder in your scratchpad. This
skill calls that folder `$WORK`.

A **slice** is one worker's share of a split task. A **race arm** is one of N
workers given the same brief, where you keep the best result.

## Steps

### 1. Frame

Write `$WORK/plan.md` with:

- **Done predicate.** One sentence a reader can check, such as "every package
  under `packages/` passes `npm test`".
- **Shape.** Slices, a race, or both, such as two arms per slice.
- **Selection rule**, for a race only, chosen before anything starts:
  `first pass` stops the other arms at the first `PASS`, `rank all` waits for
  every arm and ranks by a named metric, `best-of` waits for every arm and
  picks by a named criterion.
- **Workers.** One row per worker: id, slice or arm, model tier, output file.
- **Pinned inputs.** When workers verify or measure commits, the exact SHAs.
  A measurement also names its method: the sample count, what one sample is,
  and the run order.

List the slices with a command, not from memory, such as
`ls packages` or `git log --format=%H <base>..HEAD`. The slices together
cover the whole task, and no two overlap.

Pick the model per worker:

- By default, use a fast model, such as Sonnet.
- For mechanical checks, use the cheapest model, such as Haiku.
- For judgment on vague intent, use the strongest model, such as Opus.
- In a model race, name each arm's model.

Done when `plan.md` exists and every slice has exactly one row.

### 2. Confirm the cost

Each worker is a full agent run, so the cost grows with N. Show the user N,
the shape, the model per tier, and the done predicate.

Ask with clickable options, through the CLI's question tool, such as
AskUserQuestion. The options are start, change the split, or cancel. When the
request already named the split and N, and the plan matches them, skip the
question.

Done when the user chose start, or the request already fixed the split and N.

### 3. Brief

Copy [`worker-brief.md`](worker-brief.md) to `$WORK/brief.md` and fill its
placeholders: the goal, the done predicate, how to verify, the pinned inputs,
and what the worker may change. Write it once for all workers. Each worker's
prompt adds only its id, its slice or arm, and its output path.

When workers write code, give each its own copy of the repo. Use the CLI's
isolation option, such as a worktree per agent. Workers that only read share
the checkout.

Done when `brief.md` has no placeholder left and every row in `plan.md` has an
output path under `$WORK/results/`.

### 4. Fan out

Start every worker in one message, in the background. Start each through the
CLI's subagent tool, such as Agent. Each prompt holds the path to
`$WORK/brief.md`, the worker id, its slice or arm, and its output file.

Paste no file content into a prompt. Wait for the completion notices. Do not poll the output files.

For a `first pass` race, stop the other arms when the first `PASS` arrives.
Use the CLI's stop tool, such as TaskStop.

Done when every worker has finished, failed, or been stopped by the rule.

### 5. Collect

Read only each result's header, the lines above `## Evidence`:

```sh
sed '/^## Evidence/q' $WORK/results/<id>.md
```

Check each header against the brief:

- No file, no `STATUS` line, or missing pinned SHAs or method: respawn that
  worker once as a fresh agent with the same prompt.
- A second miss: record a gap. A gap never counts as a pass.
- A worker that dropped out: go on with the rest and record a gap for its slice.

When more than ten results hold findings, start one subagent on a fast model,
such as Sonnet. It reads every header and writes `$WORK/merged.md`, one line
per distinct finding with the ids of every worker that found it.

Done when every row in `plan.md` has a result or a recorded gap.

### 6. Report

Apply the selection rule for a race. Merge findings that name the same defect
and keep every worker id. Answer in chat:

```
<done predicate>: met | not met. <n> workers, <shape>, rule <rule or none>.
🔴 <slice>: <proven defect or BLOCKED reason, and the next action> (<ids>)
🟡 <slice>: <risk, partial result, or gap after a respawn> (<ids>)
🟢 <n> slices passed: <ids, or "all others">
Race: <winner id and why, per the rule>
Results: $WORK/results/
```

Worst first. One line per finding, not per worker. Leave out the race line
when there was no race. Name the full path for `$WORK`.

Done when every slice appears in exactly one line and every gap is a 🔴 or 🟡.

## Do

- Pin the split, the SHAs and the selection rule before the first worker starts.
- Give every worker the brief as a file path, not pasted text.
- Read headers, never full results. Open a result's evidence only to check a 🔴.
- Respawn a missing result once as a fresh agent, then record the gap.
- Keep the worker's own wording for a finding, and add its id.

## Don't

- Don't race competing versions of one change here. Use `/h2xd:code-arena`, which scores them and grafts the best parts.
- Don't start workers on a split or N the user has not named or confirmed. Show the plan and ask.
- Don't count a missing result as a pass. Record it as a gap.
- Don't let workers start their own subagents. Split the slice in `plan.md` instead.
- Don't paste raw worker output into the report. Write one line per finding and link `$WORK/results/`.
- Don't pick the race rule after seeing results. Declare it in `plan.md`.
- Don't let two code-writing workers share one checkout. Give each its own copy.
