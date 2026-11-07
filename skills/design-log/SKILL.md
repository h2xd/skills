---
name: design-log
description: "Record a small design decision as one dated entry in the design log, and link it from the inventory entries it touches. Also answers why an element looks the way it does. Use when a design choice is made in a conversation, a review or a committee verdict, or when the user asks why an element looks that way."
---

# Design log

"Why is the switch green and not blue?" Someone decided that in a chat in
August, and the chat is gone. A decision record is too heavy for a call that
small, so nobody wrote anything. The design log is where it goes: one entry,
one date, one reason.

The words are in `../design-setup/words.md`.

## Steps

### 1. Find the log

Read the design log path from `docs/agents/design-system.md`. When the
config page is missing, run `h2xd:design-setup` first. When the log does not
exist, create it from [log-template.md](log-template.md). Then list it in
`docs/index.md` with its description, as `h2xd:docs-wiki` does.

When the user asks why an element looks the way it does, read the entries
with its slug and the decision records they link. Answer with the entry and
its source, and stop here.

Done when you read the log, or answered the question. A new log is listed in
`docs/index.md`.

### 2. Decide the weight

Apply the three tests in `../docs-adr/SKILL.md`. When all three pass, it is
a decision record. Run `h2xd:docs-adr`, then add a log entry that links it.
Otherwise it is a log entry.

Search the log and the decision records for earlier entries with the same
slug. When the new decision reverses one, the decision starts with
`Reverses <id>:`.

Done when the weight is chosen and any earlier entry is found.

### 3. Write the entry

Add the entry at the top of the current month, in the format of
[log-template.md](log-template.md). Create the `## YYYY-MM` heading when it
is missing. One decision per entry. Write the rule, not the value: "The
switch uses the accent token", not a hex code.

Done when the entry has an id, the slugs, the decision, the reason and the
source.

### 4. Link it

Read the type of `related` in the inventory first. When it has a `path`
form, add `{ path: "<log path>#<id>", label: "<decision>" }` to `related`
on each inventory entry the log entry names. A slug that is not an inventory
entry, such as `tidy`, skips this. The label is the decision sentence,
shortened.

When the type has no `path` form, do not change the type. Leave the link
out, and give the `related` line of the report.

When the decision changes a page or an element, make that change in the same
commit, or mark the entry `todo`.

Done when every named inventory entry links the log entry, or the report
has the `related` line.

## Report

```
🟡 related: the inventory has no path form, run h2xd:design-setup
🟢 logged: <id> in <log path>, linked from <n> entries
```

## Do

- Write the reason, even when it is "the user preferred it".
- Name the source, such as a conversation date, a PR, an issue or a
  committee verdict.
- Use the inventory slug for each element, so the tidy checks can match it.
- Batch the decisions of one session into one commit.

## Don't

- Don't write a token value into the log. Name the token.
- Don't edit an old entry to change its decision. Add a new entry that
  reverses it.
- Don't log what the code already says plainly. Log the choice and the
  reason.
- Don't skip a decision record when the three tests pass. Run
  `h2xd:docs-adr`.
