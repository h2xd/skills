# Subagent role pages

A subagent reads its brief from a skill, and no skill brief names the extra
tools of a repo. So the subagent does not use them. Setup writes one page per
role in `docs/agents/subagents/`. Each skill that starts a subagent adds the
path of its role page to the prompt.

## Roles

| Page | Role | Started by |
|---|---|---|
| `scout.md` | Finds the files a ticket touches | `h2xd:code-implement` |
| `builder.md` | Builds criteria test-first | `h2xd:code-implement` |
| `fixer.md` | Fixes review threads | `h2xd:review-fix` |
| `reviewer.md` | Reviews a diff | `h2xd:review-pr` |

## Known tools

One template per tool. Each says which roles it applies to, the question to
ask, and the lines to write.

| Tool | Template |
|---|---|
| A code-graph server | [`tool-code-graph.md`](tool-code-graph.md) |
| A library-docs server | [`tool-library-docs.md`](tool-library-docs.md) |

A tool that is not in this table is unknown. Setup asks once, in an open
question, whether the repo has one more tool that subagents must use. On yes,
it asks for the name, the load step and the exact call, and writes them into
the empty slot of each role page the user names. The user may add a template
to this folder to make the tool known.

## Steps

1. On a re-run, read each existing role page first. A `###` block of a known
   tool is that tool's answer to P, with its values. Ask only about a tool
   that has no block. Keep everything under `### Other tools` as written.
2. Ask per known tool whether the repo uses it. Ask with clickable options.
   Recommend yes only when the repo already names the tool in `CLAUDE.md`,
   `AGENTS.md`, `.mcp.json` or `.claude/settings.json`.
3. For each tool with a yes, ask for the values its template names, such as
   the load step. Propose them from the repo's own rule.
4. Write each role page from the page template below. Put the lines of each
   tool into the pages of its `Applies to` roles only, in the order of the
   known tools table. Keep the empty slot when no unknown tool applies. A page
   that exists keeps every line it has, and changes a tool's lines only when
   the user changed that tool's values.

Done when four pages exist, each has at most 40 lines, and `node
scripts/lint-docs.ts` exits 0.

## Page template

```markdown
---
type: Agent Config
title: <Role> subagent tools
description: The tools a <role> subagent must use in this repo, with the load step and the exact call.
tags: [agents, subagents]
generated: { by: "{{ACTOR}}", at: "{{DATE}}" }
---

# <Role> subagent tools

You are a <role> subagent. Use each tool on this page before you work
without it.

## Tools

<the lines of each known tool that applies, one `###` block per tool>

### Other tools

<the lines of an unknown tool, or `None.`>
```

List the four pages in `docs/index.md` under `## Agent config`. Fill every
`{{...}}` and `<...>`.
