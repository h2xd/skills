---
type: Decision
title: Let agents act, then report, and ask at four kinds of stop, a one-way door, a failed check, a cost jump and input they cannot get alone
description: Why a skill may stop for input it cannot get alone, such as the test entry points or an unsure criterion, and which of git-pr-body, review-pr, review-fix, code-implement, next and git-guardrails push, post and act on their own.
tags: [skills, git, code-implement, review]
status: accepted
date: 2026-11-10
decision-makers: [h2xd]
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-10T00:00:00Z }
---

# Let agents act, then report, and ask at four kinds of stop, a one-way door, a failed check, a cost jump and input they cannot get alone

## Context and Problem Statement

[ADR-0003](0003-act-then-report.md) lets the ship skills act and report
after, and ask only at a one-way door, a failed check or a cost jump. Since
then, [`code-implement`](../../skills/code-implement/SKILL.md) works a ticket
with parallel build workers. Its scout marks a criterion `unsure` when it
cannot name the files. A person knows where that criterion belongs. The agent
does not. The skill also asks for the test entry points, because a subagent
cannot ask the user.

None of these asks is a one-way door, a failed check or a cost jump. Is a stop
for input the agent cannot get alone allowed, and where does it end?

## Decision Drivers

* The user does not want to watch each step of an agent.
* A criterion in the wrong build worker lets two build workers edit one file.
  The cherry-pick then conflicts, and the criteria come back as `not built`.
* A subagent cannot ask the user, so the orchestrator must ask once, early.
* A gate must carry a reason the user can see.

## Considered Options

* Add a fourth kind of stop, input that the agent cannot get alone
* Drop the gate and name the unsure criteria in the report
* Keep three kinds of stop and place an unsure criterion by a rule

## Decision Outcome

Chosen option: "Add a fourth kind of stop, input that the agent cannot get
alone", because a wrong split costs a conflict and rework, and a short
question before the build costs one answer.

Agents act, then report after. They ask at four kinds of stop:

1. A one-way door.
2. A failed check.
3. A cost jump.
4. Input that the agent cannot get alone. The test entry points are one
   example. A criterion that the scout marks `unsure`, when the split still
   has more than one build worker, is the other.

Each skill acts and asks as this table says.

| Skill | Acts on its own | Still asks |
|---|---|---|
| [`git-pr-body`](../../skills/git-pr-body/SKILL.md) | Commits a dirty tree, creates a missing issue, pushes, opens the PR | Never. A 🔴 one-way door opens as a draft |
| [`review-pr`](../../skills/review-pr/SKILL.md) | Sizes the diff with `review.ts fleet` and starts only the reviewers it needs, posts every review, 🔴 included | A head mismatch, or a large change |
| [`review-fix`](../../skills/review-fix/SKILL.md) | Commits, pushes, replies, resolves | An **ask** item in triage, a failing check, a diverged head |
| [`code-implement`](../../skills/code-implement/SKILL.md) | Runs the three skills above, then one more review and one more fix | The test entry points once, each unsure criterion in a split with more than one build worker, a draft or a failed check |
| [`next`](../../skills/next/SKILL.md) | Starts the next skill when only one fits | Two skills fit, or a help question |
| [`git-guardrails`](../../skills/git-guardrails/SKILL.md) | Recommends `--allow-push` | Force pushes and remote deletes stay blocked |

### Consequences

* Good, because the split puts every criterion in the right build worker, so
  no two build workers edit one file.
* Good, because the stop is rare. A ticket with fewer than 3 criteria, or
  with a `single` verdict, asks only for the test entry points.
* Bad, because a ticket with an unsure criterion waits on a second click,
  after the test entry points.

### Confirmation

[`planSplit`](../../templates/scripts/implement/split.ts) returns `ask` only when
the split has more than one build worker.
[`planning.md`](../../skills/code-implement/planning.md) acts on that verdict.
`README.md` says the skill asks for test entry points and unsure files.
`node scripts/lint-docs.ts` passes.

## Pros and Cons of the Options

### Add a fourth kind of stop, input that the agent cannot get alone

* Good, because a person places the criterion that the scout cannot place.
* Good, because the rule names the stop, so a skill needs no new case.
* Bad, because the ticket waits when the user is away.

### Drop the gate and name the unsure criteria in the report

* Good, because nothing ever waits.
* Bad, because the user rejected it. A wrong split lets two build workers edit
  one file, and the report comes after the conflict.

### Keep three kinds of stop and place an unsure criterion by a rule

* Good, because nothing waits.
* Bad, because a rule has no more facts than the scout had. It places the
  criterion by a guess, which is the wrong split again.

## More Information

This record supersedes [ADR-0003](0003-act-then-report.md). The corrected
`code-implement` row in that record keeps the test entry points as the one ask
that was in the skill when it was written.
