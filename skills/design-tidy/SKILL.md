---
name: design-tidy
description: "Audit the design system against the code: missing, dead and copied elements, literal values and stale intent entries. Fix the safe findings and ask about the rest. Use every few weeks, after a burst of UI work, or when the user says tidy, clean up or audit the design system."
---

# Design tidy

Six weeks of UI work later, the app has a `PillToggle`, a `ToggleChip` and a
`SegmentPill`. They do the same thing, and only one is in the inventory. This
skill finds that drift and closes it, so the inventory still answers "what do
we have?"

The checks are in [checks.md](checks.md). Each finding is either safe to fix,
or a decision for the user. The words are in `../design-setup/words.md`.

## Steps

### 1. Read the config

Read `docs/agents/design-system.md`, the inventory, the page list and the
last tidy entry in the design log. When the config page is missing, run
`h2xd:design-setup` first.

Done when you know the inventory path, the token source and the date of the
last tidy.

### 2. Run the checks

Run every check in [checks.md](checks.md). When the config page names the
package script that runs `<generator> --check`, run it first. Then run the
other checks for what it cannot see.

For a large codebase, start one subagent per check, in parallel, through
the CLI's subagent tool, such as Agent. Use a general-purpose subagent that
writes only its output file, on a fast model, such as Sonnet. Give each one
the path of `checks.md`, the path of the config page, the check number and
the output file.

Write every finding to a scratch file, one line each, with the check number,
the paths and the proposed fix.

Done when every check ran and each finding has a proposed fix.

### 3. Sort the findings

- **Safe.** A dead `source` path after a rename, a missing `avoid`, a broken
  link. A literal value in a stylesheet or a `style` attribute that matches
  one token exactly. Fix these without asking.
- **Decision.** Two elements that may be one, a candidate for the inventory,
  a stale `intent` entry, an entry nothing uses. Any other literal value. Ask
  about these.

When there are more than three decisions, put them on a page with
`h2xd:to-page`. Otherwise ask with clickable options, through the CLI's
question tool, such as AskUserQuestion.

Done when every finding is marked safe or decision, and every decision has an
answer.

### 4. Fix

Apply the safe fixes and the answered decisions. A merge of two elements
changes every call site to the one that stays, then deletes the other. Log
each decision with `h2xd:design-log`. It decides whether a record is needed.

Run the agent view generator. Reuse a running dev server, else start one
with the command on the config page. Open the overview page. Stop the dev
server only when you started it.

Done when the typecheck, the lint and the tests pass, the generator's
`--check` exits 0, and the overview page still loads.

### 5. Close the run

Add a dated tidy entry with the counts through `h2xd:design-log`. When the
inventory changed, tell the user to run `/h2xd:design-mirror`.

Done when the log has the tidy entry and the report is sent.

## Report

```
🔴 <check>: <what is broken, and the next action>
🟡 <check>: <a decision the user postponed>
🟢 fixed <n> safe findings, <n> decisions applied
🟢 inventory: <before> to <after> elements
```

## Do

- Read the code, not only the inventory. Drift lives in the code.
- Count call sites before a merge, and name them in the question.
- Keep the user's answer for a postponed decision in the log, so the next run
  does not ask again.
- Prefer the element with more call sites when two merge, unless the user
  says otherwise.

## Don't

- Don't delete an element that has call sites. Merge it or ask.
- Don't change a token value. Report it, and let the user decide.
- Don't promote `intent` to `decided` on your own. Ask.
- Don't redesign during a tidy. Tell the user to run
  `/h2xd:design-variants` for ideas.
