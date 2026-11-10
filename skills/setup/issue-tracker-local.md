---
type: Agent Config
title: Issue tracker
description: Issues for this repo live as markdown files under .scratch/issues/.
tags: [agents, tracker]
generated: { by: "{{ACTOR}}", at: "{{DATE}}" }
---

# Issue tracker: local markdown

Issues live as files in `.scratch/issues/`, one per issue, named
`NNNN-slug.md` with the next free number. The number is the issue's id: `#12`
means `.scratch/issues/0012-*.md`.

Each file opens with three lines, then the body:

```markdown
# <title>

Status: open
Labels: adr
```

## Operations

| Operation | How |
|---|---|
| Create | Write `.scratch/issues/<next number>-<slug>.md` in the shape above |
| View | Read the file |
| Search | `grep -ril "<word>" .scratch/issues/`, then read the titles |
| List by label | `grep -l "^Labels:.*<label>" .scratch/issues/*.md` |
| Comment | Append under a `## Comments` heading, newest last, with the date |
| Label | Edit the `Labels:` line |
| Close | Set `Status: closed`. Post the reason with **Comment** first |
| Link a PR | Name the issue file in the commit footer as `Refs: .scratch/issues/<file>` |
| Open a PR | None. A local tracker has no PRs. Push the branch and open the PR by hand, if there is a remote |
| PR status | None. A local tracker has no PRs |

## Triage

`h2xd:plan-triage` reads this section. Each role has one label string.

| Role | Label | Meaning |
|---|---|---|
| bug | `{{LABEL_BUG}}` | Something is broken |
| enhancement | `{{LABEL_ENHANCEMENT}}` | A new feature or an improvement |
| needs-triage | `{{LABEL_NEEDS_TRIAGE}}` | The maintainer has to evaluate it |
| needs-info | `{{LABEL_NEEDS_INFO}}` | Waiting on the reporter |
| ready-for-agent | `{{LABEL_READY_FOR_AGENT}}` | Fully specified. An agent can do it |
| ready-for-human | `{{LABEL_READY_FOR_HUMAN}}` | A person has to do it |
| wontfix | `{{LABEL_WONTFIX}}` | Will not be done |

PRs in triage: no. A local tracker has no PRs.

Labels in use: `adr`, `spec` for specs from `h2xd:to-spec`, and `idea` for
ideas that are not requests yet. Triage leaves `idea` issues alone.

The `h2xd:review-pr` and `h2xd:review-fix` skills need a GitHub PR and do not
run against a local tracker.

## When a skill says "publish to the issue tracker"

Create a file under `.scratch/issues/`.

## When a skill says "fetch the relevant ticket"

Read the file at `.scratch/issues/<number>-*.md`.
