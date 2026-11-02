---
name: docs-wiki
description: "Maintain the docs bundle, an LLM wiki in Open Knowledge Format. Use when adding, moving or updating a page under docs/, after a code change that a page describes, when ingesting a new source, when answering from the docs, or for a docs health check."
---

# Wiki

A page says the timeout is 30 seconds. The code says 10. The next session
believes the page. This skill keeps `docs/` true, so the next session can trust
what it reads.

`docs/` is an [LLM wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
stored as an [Open Knowledge Format v0.2](https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md)
bundle. You write and maintain the pages. The human curates sources and asks
questions.

- Knowledge goes into pages once and stays current. Do not derive it again
  from raw sources on every question.
- `node scripts/lint-docs.ts` checks conformance. It runs in `pre-commit` and CI.
- `docs/agents/knowledge-base.md` holds this repo's directory table and
  language rules. Read it before you write a page.
- The bundle root is `docs.root` in `agents.config.json`. The default is `docs/`.

## Layers

| Layer | Where | Who edits |
|---|---|---|
| Raw sources | `docs/references/` | Nobody after ingest. Copy in verbatim, never rewrite. |
| Wiki pages | every other `.md` under `docs/` | You. Keep them current. |
| Schema | this skill, its sibling files, and `docs/agents/knowledge-base.md` | You and the human, together. |

## Keep it current

A page that disagrees with the code is worse than no page. Three habits keep
pages true:

- **Same change.** A code change that alters what a page says updates the page
  in the same commit. Before you commit, run
  `node scripts/find-docs.ts --links-to <path>` for each changed file. Read
  every page it prints.
- **Same words.** Name things by their glossary heading. A new term gets an
  entry through `h2xd:docs-glossary` before a page uses it.
- **No copies.** Link a value that lives in code or config, such as a limit, a
  color or a timeout. Never retype it, because a copy drifts.

## Page format

Every page except `index.md` and `log.md` opens with frontmatter.
[`page-format.md`](page-format.md) has every field and the rules for claims,
links and shape. The short version:

```yaml
---
type: Runbook                     # required, a value from docs/agents/knowledge-base.md
title: Deployment
description: One sentence. index.md copies it, so write it for someone choosing what to open.
tags: [deployment]
status: stable                    # draft | stable | deprecated, omit for stable
generated: { by: <cli>/<model id>, at: 2026-10-31T10:00:00Z }
sources:
  - id: issue-42
    resource: https://github.com/<owner>/<repo>/issues/42
    title: Move deploys to the new host
---
```

Only a human who confirms the page against its sources adds `verified`.

Decision records have their own rules. Use `h2xd:docs-adr` to write, supersede
or correct one. It searches for overlap and opens the tracker issue first.

## Finding pages

`node scripts/find-docs.ts` reads frontmatter and links, never the prose.
Filters combine with AND. It exits 1 when nothing matches.

| Question | Command |
|---|---|
| Which decisions hold now? | `node scripts/find-docs.ts --type Decision --status accepted` |
| Is there a page about X already? | `node scripts/find-docs.ts --search "<words>"` |
| What documents this code? | `node scripts/find-docs.ts --links-to src/payments` |
| What links to this page? | `node scripts/find-docs.ts --backlinks decisions/0009-x.md` |
| Which pages carry a tag? | `node scripts/find-docs.ts --tag deployment` |
| Which pages are past `stale_after`? | `node scripts/find-docs.ts --stale` |
| Which pages does no other page link to? | `node scripts/find-docs.ts --orphans` |

## Operations

### Ingest

When a new source arrives, follow [`ingest.md`](ingest.md) step by step.

Done when `node scripts/lint-docs.ts` exits 0 after the last step of `ingest.md`.

### Query

1. Read `docs/index.md`, then only the pages it points to. For a question about
   code, a status or a tag, use `node scripts/find-docs.ts` instead.
2. Answer with links to the pages you used.
3. When the answer took several pages to build and will come up again, offer
   to file it as a new page. The next query then reads one page.

Done when the answer links every page it used.

### Lint

Run a lint on request, after an ingest that touched more than three pages, and
before a release. Follow [`lint.md`](lint.md) step by step.

Done when `docs/log.md` has the `**Lint**` entry from the last step of `lint.md`.

## index.md and log.md

`docs/index.md` lists every page under a heading per directory, one line each:
`* [Title](/dir/page.md) - description`. Only the root index exists. Its
frontmatter holds `okf_version: "0.2"` and nothing else. The lint fails when a
page is missing from it, or when its description drifted.

`docs/log.md` is append-only, newest first, under `## YYYY-MM-DD` headings.

- Each entry is one `* ` line that starts with a bold verb: `**Ingest**`,
  `**Creation**`, `**Update**`, `**Move**`, `**Deprecation**`, `**Decision**`
  or `**Lint**`.
- Give the verb, the linked page, and what changed in about 20 words. The
  details go in the page and the commit.
- `node scripts/lint-docs.ts` notes an entry over 300 characters.

## After a merge

A merge of `main` conflicts in `index.md`, `log.md`, `generated:` lines and
decision numbers. When `git merge` or `git rebase` stops, run
`node scripts/resolve-docs.ts`. It fixes those four and lists what is left for
a human.

## Do

- Read `docs/agents/knowledge-base.md` before you write a page.
- Run `node scripts/find-docs.ts --links-to <path>` for each changed file before you commit.
- Copy raw sources into `docs/references/` verbatim.
- Link values that live in code or config.
- Offer to file an answer that took several pages to build.

## Don't

- Don't rewrite a raw source. Write a wiki page that cites it.
- Don't retype a limit, a color or a timeout from code. Link the file.
- Don't add `verified` yourself. Only a human who checked the sources adds it.
- Don't write a decision record here. Use `h2xd:docs-adr`.
- Don't log a query that filed nothing. Log only changes to pages.
