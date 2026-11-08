---
type: Decision
title: Let the ship skills act, then report, and ask only at a one-way door, a failed check or a cost jump
description: Why git-pr-body, review-pr and review-fix push, open, post and reply without a yes, and which few cases still stop for the user.
tags: [skills, git, review]
status: accepted
date: 2026-11-08
decision-makers: [h2xd]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-08T00:00:00Z }
---

# Let the ship skills act, then report, and ask only at a one-way door, a failed check or a cost jump

## Context and Problem Statement

From a finished ticket to a reviewed PR, the user clicked a yes up to six
times: commit the dirty tree, create the issue, open the PR, post the review,
commit the fixes, start the next skill. `git-pr-body`, `review-pr` and
`review-fix` were user-only, so `code-implement` could not chain them. The
default push guard blocked every push, so the chain stopped at the first push
too. The user had to watch the agents.

Which steps stop for the user, and which run on their own?

## Decision Drivers

* The user does not want to watch each step of an agent.
* A PR, a review and a reply are public, but cheap to edit or close.
* A one-way door, such as a dropped table or a published version, is not cheap.
* A failing check means the agent is about to publish a wrong claim.
* A full five-reviewer run on a big diff costs a lot.

## Considered Options

* Act, then report, with a gate only at a one-way door, a failed check or a cost jump
* A gate before every public step, the old default
* No gates at all

## Decision Outcome

Chosen option: "Act, then report, with a gate only at a one-way door, a
failed check or a cost jump", because each remaining gate stops a step that
is expensive to undo, and every other step is cheap to undo.

| Skill | Acts on its own | Still asks |
|---|---|---|
| [`git-pr-body`](../../skills/git-pr-body/SKILL.md) | Commits a dirty tree, creates a missing issue, pushes, opens the PR | Never. A 🔴 one-way door opens as a draft |
| [`review-pr`](../../skills/review-pr/SKILL.md) | Sizes the diff with `review.ts fleet` and starts only the reviewers it needs, posts every review, 🔴 included | A head mismatch, or a large change |
| [`review-fix`](../../skills/review-fix/SKILL.md) | Commits, pushes, replies, resolves | An **ask** item in triage, a failing check, a diverged head |
| [`code-implement`](../../skills/code-implement/SKILL.md) | Runs the three skills above, then one more review | Stops on a draft or a failed check |
| [`next`](../../skills/next/SKILL.md) | Starts the next skill when only one fits | Two skills fit, or a help question |
| [`git-guardrails`](../../skills/git-guardrails/SKILL.md) | Recommends `--allow-push` | Force pushes and remote deletes stay blocked |

### Consequences

* Good, because a ticket goes from code to a reviewed PR with no clicks.
* Good, because the gates that remain carry a reason the user can see.
* Bad, because a wrong review comment is public before a person reads it.
  `review-fix` and the reviewer can still answer it on the thread.
* Bad, because a repo that keeps the block-all push guard stops the chain at
  the first push. `git-pr-body` then names the fix.

### Confirmation

`node scripts/lint-skills.ts` passes. The three skills no longer carry
`disable-model-invocation: true`. No Don't in them asks for a yes before a
push, a post or a reply.

## Pros and Cons of the Options

### A gate before every public step

* Good, because a person reads each text before GitHub shows it.
* Bad, because the user watches every step, and no skill can chain another.

### No gates at all

* Good, because nothing ever waits.
* Bad, because a one-way door merges into review with no draft, and a big diff
  starts five strong-model reviewers with no warning.
