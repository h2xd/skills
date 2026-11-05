---
type: Decision
title: Add a decision page type to to-page, one decision per page with a rated criteria table
description: Why h2xd:to-page gets a third page type for one hard choice, and how its form, page and answers differ from grilling.
tags: [to-page, skills]
status: accepted
date: 2026-11-05
decision-makers: [h2xd]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-05T00:00:00Z }
---

# Add a decision page type to to-page, one decision per page with a rated criteria table

## Context and Problem Statement

[`h2xd:to-page`](../../skills/to-page/SKILL.md) has two page types for the
user: `checklist` and `grilling`. A grilling round asks many small questions,
each with options and one recommendation. A hard choice, such as a technology
with lock-in, needs more: named criteria, a comparison of every option, and
the consequences. Does that choice get its own page type, and what does its
form, its page and its answers file hold?

The user settled the shape in four grilling rounds, Q1 to Q16, on 2026-11-04.

## Decision Drivers

* The agent writes a small JSON form, and a script renders the page. A
  hand-written page costs at least 2,500 output tokens, a round about 750.
* `h2xd:docs-adr` writes a MADR record from the page, with no second interview.
* The answers file stays one shape for every type, so the agent reads it the
  same way.
* Node.js is the only dependency.

## Considered Options

* A `decision` type: one decision per page, in depth, with a rated criteria table
* More grilling rounds, with longer `why` texts and no new type
* A `decision` type with two to four related decisions per page
* A `decision` type as a decision tree

## Decision Outcome

Chosen option: "A `decision` type: one decision per page, in depth, with a
rated criteria table", because it is the only option that shows every option
against the same criteria. The form maps one to one to a MADR record.

The shape, by question:

| Area | Decision | From |
|---|---|---|
| Unit | One decision per page | Q1 |
| Comparison | A table of options against named criteria, plus pros and cons per option | Q2 |
| Ratings | The agent rates every cell from 1 to 5. The page shows the score as five squares that fill up | Q5, Q14 |
| Form fields | MADR names: context, drivers, options, consequences | Q3 |
| Rounds | One page, one round, no `previous`. Follow-up questions go to a grilling round | Q4 |
| Answers | The grilling shape, `pick` and `note`. The note is the reason | Q6 |
| Several options | The form sets `multi: true` per decision. Then `pick` is a list, such as `["a","c"]`. No limit on the picks | Q9, Q13, Q16 |
| Built-in options | "I don't know" and "Something else", as in grilling | Q7 |
| Record status | `accepted`: the pick on the page is the decision | Q8 |
| Note field | The placeholder says "Note, also with a pick", on every type | Q10 |
| End of a chain | `to-page done` builds a last page from the round chain: each settled decision and "Done" | Q11, Q15 |
| Next round | The open page loads it at once, as it does now | Q12 |

### Consequences

* Good, because a hard choice gets a full comparison, and the user picks from
  a table, not from prose.
* Good, because `h2xd:docs-adr` copies the MADR fields and the pick into the
  record, and the status is `accepted` with no review step.
* Good, because grilling stays broad and fast. A question that needs depth
  moves to its own decision page.
* Bad, because to-page has a third type to keep: a schema, a template, a
  spec and tests.
* Bad, because `pick` is a string or a list, so a reader of the answers checks
  `multi` first.
* Bad, because the agent spends tokens on every cell. A table of four options
  and five criteria has 20 scores.

### Confirmation

* `node skills/to-page/scripts/to-page.ts spec decision` prints the fields of
  this record.
* The to-page tests render the `decision` example and check the golden page,
  the 1 to 5 range and the `multi` answers.
* `to-page done` exists and builds a page from a round chain.

## Pros and Cons of the Options

### More grilling rounds

* Good, because there is no new type to keep.
* Bad, because a grilling question has no criteria table, so the user compares
  the options in their head.
* Bad, because the record needs a second interview for drivers and
  consequences.

### Two to four related decisions per page

* Good, because related choices stay on one page.
* Bad, because the page gets long, and one open choice blocks the others.

### A decision tree

* Good, because it shows the choices that depend on a choice.
* Bad, because a tree needs a new layout and new answer rules, and grilling
  rounds already order the questions that depend on each other.

## More Information

* The code lives in [`skills/to-page/scripts/`](../../skills/to-page/scripts/).
  The spec of each type is in [`skills/to-page/spec.md`](../../skills/to-page/spec.md).
* The grilling rounds that settled this record ran on the live loop of
  `to-page serve` and `to-page wait`. The rounds were not kept in the repo.
* No tracker issue: records in this repo need none, per
  [`agents.config.json`](../../agents.config.json).
