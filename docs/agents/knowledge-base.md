---
type: Agent Config
title: Knowledge base
description: Where this repo's pages live, which type each directory holds, and which language each page is written in.
tags: [agents, docs]
generated: { by: "claude-code/claude-opus-5-5", at: "2026-11-05" }
---

# Knowledge base

This page is the repo-specific half of the `h2xd:docs-wiki` schema. The skill
holds the rules that are the same everywhere. This page holds what differs per
repo. Change it with the human, in the same change as the pages it affects.

## Directories

| Directory | Holds | `type` |
|---|---|---|
| `glossary/` | The project and technical glossaries | `Glossary` |
| `decisions/` | Decision records, `NNNN-slug.md` with the next free number | `Decision` |
| `agents/` | Config the engineering skills read | `Agent Config` |
| `references/` | Raw sources, copied in verbatim on ingest | `Reference` |
| `research/` | Answers researched from primary sources, one question per page, with `stale_after` when they expire | `Research` |
| `concepts/` | How something works across skills, templates and decisions, such as the to-page live loop | `Concept` |

A new kind of page gets a new `type` value. Add it to this table in the same
change. A new directory needs at least three pages that fit nowhere else.

## Language

English everywhere, in ASD-STE100, per `.claude/output-styles/asd-ste100.md`.

## Outside the bundle

`README.md`, `CHANGELOG.md` and the skill files under `skills/` stay outside the bundle. `CLAUDE.md` holds the repo rules.
