---
name: docs-research
description: "Answer a question from primary sources, such as official docs, source code and specs, with a background agent. File the sources and the answer in the docs bundle. Use when the user wants a topic researched, facts about a library or API, or a stale page checked again."
---

# Research

A rate limit quoted from memory is last year's number, said with full
confidence. This skill sends a background agent to the sources that own the
facts, and you keep working while it reads.

The result lands in the docs bundle the `h2xd:docs-wiki` way. The raw sources
go under `docs/references/`, and one page cites them. The next session reads
that page and does not research again.

The bundle root is `docs.root` in `agents.config.json`, or `docs/` when that
key is not set. Read `docs/agents/knowledge-base.md` for its directories and
`type` values.

## Steps

### 1. Pin the question

Restate the question in one sentence, with its scope. The scope names the
library and version, the vendor plan, or the jurisdiction. Say what the answer
is for.

When the scope is unclear, ask one question with clickable options, through
the CLI's question tool, such as AskUserQuestion.

Then look for an answer the bundle already has:

```sh
node scripts/find-docs.ts --search "<words>"
node scripts/find-docs.ts --stale
```

When a page answers the question and is not past `stale_after`, answer from it
with a link and stop. Pages on the topic that are stale or partial become
`$KNOWN` for the researcher.

Done when the user agreed to the one-sentence question, or a current page
answered it.

### 2. Start the researcher

Create an empty directory `$OUT` in your scratchpad. Start one background agent
with a fresh context, through the CLI's subagent tool, such as `Agent`. Run it
on the strongest model, such as Opus.

Give it [`researcher.md`](researcher.md) to read, plus `$QUESTION`, `$OUT` and
`$KNOWN`. Do not paste the brief into the prompt.

Tell the user it is running, then go on with other work. Never predict its
result.

Done when the agent is running and the user knows.

### 3. Check the findings

When the agent reports, read `$OUT/findings.md` and its 🔴 and 🟡 lines.

- Pick two claims at random. Find their wording in the cited
  `$OUT/references/` file. A claim the file does not support is unconfirmed.
- A blog post, forum answer or tutorial is a secondary source. Send the agent
  back for the primary source, or mark the claim unconfirmed.
- An `## Expires` date becomes `stale_after`. "Never." means no `stale_after`.

Done when every claim is backed by a file in `$OUT/references/` or marked
unconfirmed.

### 4. Propose the filing

Choose the home for the answer. Run
`node scripts/find-docs.ts --search "<words>"` again.

- Prefer an existing page that the answer extends or corrects.
- Create a page only when none fits. It takes a directory and `type` from
  `docs/agents/knowledge-base.md`.
- When no row in that table fits, ask the user. Add the row in the same change.

Show the user these items, per `h2xd:docs-wiki` ingest step 2:

- The answer, in at most five sentences.
- The three to five takeaways and the pages they change, glossary entries
  included.
- The reference files to add, and the `stale_after` date with its reason.

Done when the user gave a go-ahead, or chose to keep the answer out of the
bundle.

### 5. Ingest

Follow [`../docs-wiki/ingest.md`](../docs-wiki/ingest.md) with these specifics:

1. Copy each `$OUT/references/<slug>.md` to `docs/references/<slug>.md`
   unchanged. When the slug exists, add the retrieval date to the new slug,
   such as `stripe-rate-limits-2026-11-02`. Never overwrite a reference.
2. Write or update the page. Add each reference to `sources` with
   `id: <slug>` and `resource: /references/<slug>.md`.
3. Copy the footnotes from `findings.md`. When step 1 renamed a slug, rename
   its footnote labels to match. Keep `(unconfirmed)` claims marked, or leave
   them out.
4. Set `stale_after: <YYYY-MM-DD>` when the findings gave a date. On a page you
   research again, replace the old date and rewrite the claims that changed.
   Leave the old references in place.
5. Set `generated: { by: <cli>/<model id>, at: <now> }`. Never add `verified`.
6. Send new terms through `h2xd:docs-glossary`. Send a decision the answer
   leads to through `h2xd:docs-adr`.

Done when `node scripts/lint-docs.ts` exits 0 and `docs/log.md` has an
`**Ingest**` entry naming every page touched.

### 6. Report

One line per item, worst first:

```
🔴 <claim>: <unconfirmed or conflicting, and where the answer would be>
🟡 <page>: <stale_after date and why it expires, or a secondary source kept>
🟢 <page>: <filed, with the number of references added>
```

Done when every page touched and every unconfirmed claim has its line.

## Do

- Search the bundle before you start the researcher.
- Pin the version, plan or jurisdiction in the question.
- Give the researcher its brief as a file.
- Set `stale_after` for prices, limits, beta features, laws in transition and "latest version" facts.
- Prefer updating an existing page over creating a new one.

## Don't

- Don't answer from memory. Start the researcher, or answer from a current page.
- Don't cite a blog post or forum answer. Find the primary source it points to.
- Don't edit a file in `docs/references/`. Add a new reference and update the page.
- Don't file before the user's go-ahead. Show the takeaways first.
- Don't predict the background agent's result. Wait for its report.
- Don't add `verified`. Only a human who checked the sources adds it.
