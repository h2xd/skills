---
type: Decision
title: <short title naming the problem and the chosen option>
description: <one sentence for someone choosing what to open>
tags: [<area>]
status: proposed                 # proposed | rejected | accepted | deprecated | superseded by ADR-NNNN
date: YYYY-MM-DD                 # when the decision was last updated
decision-makers: [<login>]
consulted: [<login>]             # omit when not recorded
informed: [<login>]              # omit when not recorded
generated: { by: <cli>/<model id>, at: <ISO 8601 UTC> }
sources:
  - id: issue-<n>
    resource: <issue URL, or .scratch/issues/<file> on a local tracker>
    title: <issue title>
---

# <title>

## Context and Problem Statement

<Two to four sentences. State the problem, ideally as a question. Name the
parts of the system in scope. Footnote facts to their source.[^issue-<n>]>

## Decision Drivers

* <quality, constraint or force that decides between the options>

## Considered Options

* <option 1>
* <option 2>

## Decision Outcome

Chosen option: "<option 1>", because <justification tied to the drivers>.

### Consequences

* Good, because <positive consequence>
* Bad, because <negative consequence>

### Confirmation

<How to check that the code follows the decision: a test, a lint rule, a
review step, a file to look at.>

## Pros and Cons of the Options

### <option 1>

* Good, because <argument>
* Neutral, because <argument>
* Bad, because <argument>

### <option 2>

* Good, because <argument>
* Bad, because <argument>

## Diagram

<Optional. Leave this section out when the decision needs no picture. Use it
when the decision has more than two moving parts: one mermaid block, at most
about 15 nodes, labeled arrows, structure only, never a literal value.>

## More Information

<Links to related records and issues, follow-up work, when to revisit, and any
fact corrections made after acceptance.>

[^issue-<n>]: <issue title>
