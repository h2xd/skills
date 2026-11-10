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
- **Code:** [`skills/code-implement/SKILL.md`](../../skills/code-implement/SKILL.md)
- **Avoid:** Slice, batch, chunk

### Build worker

- **Meaning:** A subagent on a fast model that builds one [criteria group](#criteria-group) test-first, in its own git worktree and branch. At most three run at once.
- **Code:** [`skills/code-implement/implementer.md`](../../skills/code-implement/implementer.md)
- **Avoid:** Implementer agent, implementation agent

### Scout

- **Meaning:** The read-only subagent on the cheapest model that maps each acceptance criterion of a ticket to the files it touches. It marks a criterion `unsure` when it cannot name them.
- **Code:** [`skills/code-implement/scout.md`](../../skills/code-implement/scout.md)
- **Avoid:** Explorer, mapper
