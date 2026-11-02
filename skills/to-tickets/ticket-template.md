# Ticket template

`h2xd:to-tickets` writes one file per ticket in this shape, then creates it
with the **Create** operation in `docs/agents/issue-tracker.md`. On a local
tracker, the file also opens with the title, `Status:` and `Labels:` lines the
tracker page describes. The title is the ticket's name, in the glossary's
words. Follow [`../setup-tone/github-text.md`](../setup-tone/github-text.md):
summary first, bullets, no walls of text.

```markdown
## Summary

- <What works when this ticket is done, in one line.>
- Part of #<parent>. 🟢 Can start now | 🔴 Blocked by #<n>

## What to build

- <The behavior this ticket makes work, end to end, from the user's side.>
- <One to three bullets.>

## Acceptance criteria

- [ ] <input or action> gives <the result a caller sees>
- [ ] <input or action> gives <the result a caller sees>

## Blocked by

- #<n> <title>

## Out of scope

- <what belongs to another ticket or to none>
```

## Sections

| Section | Holds | Leave it out when |
|---|---|---|
| `## Summary` | One line on the result, the parent when there is one, and whether it can start | Never |
| `## What to build` | One to three bullets. Modules, types and interfaces, never file paths or line numbers | Never |
| `## Acceptance criteria` | Three to six checkable criteria, per [`slicing.md`](slicing.md) | Never |
| `## Blocked by` | One line per blocker. "None, can start now" when nothing blocks it | The edges were recorded with the **Block** operation |
| `## Out of scope` | What a reader might expect here that another ticket covers | Nothing sits near the edge |

A prototype snippet goes under `## What to build` only when it settles a type
shape, schema or state machine more precisely than prose. Trim it to the
decision and add one line saying it came from a prototype.
