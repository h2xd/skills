---
type: Glossary
title: Technical glossary
description: The words of the code base, its modules, layers and patterns, and where each one lives.
tags: [glossary]
generated: { by: "claude-code/claude-opus-5-5", at: "2026-11-05" }
---

# Technical glossary

One entry per term the code base gives a specific meaning. General programming
words stay out. The `###` heading is the name to use. `**Code:**` points at
where the term lives, so a reader can go from the word to the file.

An entry looks like this:

```markdown
### Session Store

- **Meaning:** Where a signed-in user's session lives between requests.
- **Code:** [`src/auth/session-store.ts`](../../src/auth/session-store.ts)
- **Avoid:** Session cache, auth store
```

### Call file

- **Meaning:** A file in which a committee agent asks a lower agent of its chapter for one task. The [Chair](/glossary/project.md#chair) routes it, because a subagent cannot start a subagent.
- **Code:** [`skills/ask-committee/calls.md`](../../skills/ask-committee/calls.md), written as `calls/<short name>-<n>.md` in the committee folder
- **Avoid:** Request file, message

### Findings file

- **Meaning:** The JSON file in which one `review-pr` reviewer lists its findings, written as `review-<x>.json`. `review.ts findings --validate` checks it, and `review.ts merge` joins all of them into one review.
- **Code:** [`templates/scripts/review/findings.ts`](../../templates/scripts/review/findings.ts), [`skills/review-pr/reviewer-brief.md`](../../skills/review-pr/reviewer-brief.md)
- **Avoid:** Review file, report

### Item id

- **Meaning:** The `out-<8 hex>` tag on one finding outside the diff in a `review-pr` summary. It is a hash of the finding's file, lines and subject, so the same file, lines and subject keep the id in every review, and two different findings do not share one. A finding that a reviewer words again with other lines or another subject gets a new id. A reply comment answers an item with a `## <item id>` heading.
- **Code:** [`templates/scripts/review/findings.ts`](../../templates/scripts/review/findings.ts), [`templates/scripts/review/threads.ts`](../../templates/scripts/review/threads.ts)
- **Avoid:** Finding id, S id

### T label

- **Meaning:** The `T1`, `T2` name that `review.ts threads` gives to one review thread in `threads.md`. Replies and `review.ts resolve` take it in place of the thread's node id.
- **Code:** [`templates/scripts/review/resolve.ts`](../../templates/scripts/review/resolve.ts), [`templates/scripts/review/reply.ts`](../../templates/scripts/review/reply.ts)
- **Avoid:** Thread number

### S label

- **Meaning:** The `S1`, `S2` name that `review.ts threads` gives to one unanswered outside-the-diff item in `threads.md`. Each S label carries an item id, and a reply to it posts as a section of one PR comment.
- **Code:** [`templates/scripts/review/reply.ts`](../../templates/scripts/review/reply.ts), [`templates/scripts/review/threads.ts`](../../templates/scripts/review/threads.ts)
- **Avoid:** Summary number

### Task copy

- **Meaning:** The copy of a call file that the callee reads. The chair writes it with every line of the call except the caller's hypothesis.
- **Code:** [`skills/ask-committee/calls.md`](../../skills/ask-committee/calls.md), written as `tasks/<call id>.md` in the committee folder
- **Avoid:** Task file, brief

### Committee folder

- **Meaning:** The scratchpad directory, `$WORK/committee/`, that holds every file of one committee run: the question, votes, calls, task copies, answers, positions and the verdict.
- **Code:** [`skills/ask-committee/calls.md`](../../skills/ask-committee/calls.md)
- **Avoid:** Committee directory, work folder

### Criteria group

- **Meaning:** The acceptance criteria of one ticket that one [build worker](#build-worker) gets, because they share files or depend on each other. A criterion is in exactly one criteria group.
- **Code:** [`templates/scripts/implement/split.ts`](../../templates/scripts/implement/split.ts)
- **Avoid:** Slice, batch, chunk

### Build worker

- **Meaning:** A subagent on a fast model that builds one [criteria group](#criteria-group) test-first, in its own git worktree and branch. At most `implement.maxWorkers` run at once, 3 by default.
- **Code:** [`skills/code-implement/build-worker.md`](../../skills/code-implement/build-worker.md)
- **Avoid:** Implementer agent, implementation agent

### Fix worker

- **Meaning:** The one subagent on a fast model that repairs a failed cherry-pick or a red test on the ticket branch, once per ticket.
- **Code:** [`skills/code-implement/fix-worker.md`](../../skills/code-implement/fix-worker.md)
- **Avoid:** Repair agent, merge worker

### Scout

- **Meaning:** The read-only subagent on the cheapest model that maps each acceptance criterion of a ticket to the files it touches. It marks a criterion `unsure` when it cannot name them.
- **Code:** [`skills/code-implement/scout.md`](../../skills/code-implement/scout.md)
- **Avoid:** Explorer, mapper
