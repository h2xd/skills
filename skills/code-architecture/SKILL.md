---
name: code-architecture
description: Scan a codebase for deepening opportunities, such as shallow modules, hypothetical seams and scattered state, against the h2xd:code-quality bar and its smells, report them ranked, then grill through the one the user picks with h2xd:plan-grill. A chosen reshape that is hard to reverse goes through h2xd:docs-adr. Use when the user asks for an architecture review, wants to find refactoring targets, says the code is hard to change or test, or asks where to deepen modules.
disable-model-invocation: true
---

# Improve architecture

When renaming one field edits eleven files, the code has shallow modules.
Agents copy the shape they find, so the next change edits a twelfth. This skill
finds where merging or moving code gives a deep module: a small interface over
a lot of behavior. It turns the one the user picks into decisions.

Use the words in [`vocabulary.md`](vocabulary.md) in every candidate, report
line and question. Name domain things by their `h2xd:docs-glossary` heading.
The glossary paths are in `docs.glossaries` of `agents.config.json`.

## Steps

### 1. Scope

Deepening pays off first where code changes often. Pick the scope first.

- When the user named a module, a directory or a pain point, scope to it and
  skip the history.
- Otherwise list the most changed files in recent history:

  ```sh
  git log --since="6 months ago" --name-only --format= | sort | uniq -c | sort -rn | head -40
  ```

  Group the top files by directory. When no group stands out, scan the whole
  source tree.

For each area in scope, run `node scripts/find-docs.ts --links-to <path>`.
Note the decision records and wiki pages it lists.

Done when you have a list of paths in scope, ranked by change count, with the
records and pages that cover them.

### 2. Explore

Start one subagent with a fresh context to walk the scope. Use the CLI's
subagent tool, such as Agent. On a large scope, start one per area in
parallel. Give each one the path to [`explore-brief.md`](explore-brief.md),
its paths and hot spots, the glossary paths, and the record paths from step 1.

When the subagents return, check each candidate yourself:

1. Open its files and confirm the quoted problem is real.
2. Run the deletion test from `vocabulary.md`. Drop a candidate where deleting
   or merging moves complexity without concentrating it.
3. Drop a candidate that an accepted decision record forbids, unless the
   friction is strong enough to reopen the record. Keep that one and name the
   record.

Done when every kept candidate has confirmed files, a smell, a dependency
category and evidence.

### 3. Report

Rank the candidates and print the report, worst first:

```
🔴 <deepening>: <problem in one sentence>. <the change in one sentence>.
   Files: <paths> · Smell: <name> · Dependencies: <category>
   Wins: <locality and leverage gains, which tests get simpler>
🟡 <deepening>: ...
🟢 <area>: walked, deep enough, nothing to change.
```

- 🔴 Strong. The friction shows in recent commits or bug fixes, and the
  deletion test passes.
- 🟡 Worth exploring. The smell is clear, but recent history does not show it
  hurting yet.
- 🟢 An area walked and found deep. List these so the user sees the coverage.

When a candidate contradicts a decision record, add a line:
`Contradicts <record path>: <why it is worth reopening>.`

End with your top pick and one sentence on why. Propose no interface yet.
Ask which candidate to explore, with clickable options, through the CLI's
question tool, such as AskUserQuestion. Your top pick is the first option.

Done when the user picked a candidate, or said none.

### 4. Grill the pick

Read the picked candidate's files in full. Then run `h2xd:plan-grill` on its
design tree. Cover at least:

- The constraints the deepened module must keep.
- Which modules merge, and which callers move to the new interface.
- Where the seam goes, and which adapters sit at it.
- What the implementation hides.
- Which old tests are deleted and which new tests sit at the interface.

When the user wants to compare interfaces, follow
[`design-it-twice.md`](design-it-twice.md). Its result is one more decision in
the tree.

While grilling, keep the glossaries current with `h2xd:docs-glossary`:

- A deepened module named after a concept with no entry gets an entry.
- A term the conversation sharpened gets its entry updated.

Done when the user confirmed the decision table from `h2xd:plan-grill`.

### 5. Record

Run step 1 of `h2xd:docs-adr` on the confirmed reshape. When the reshape is
hard to reverse, surprising without context and a real trade-off, write the
record with `h2xd:docs-adr`.

When the user rejected the candidate for a reason a later review would need,
ask: "Record this as a decision so later reviews do not suggest it again?"
Write it with `h2xd:docs-adr` on a yes. Skip reasons that only hold today,
such as "no time this sprint".

Done when the record exists and `node scripts/lint-docs.ts` exits 0, or
`h2xd:docs-adr` step 1 said no record is needed, or the user declined.

### 6. Hand over

Summarize the confirmed decisions and the record path. Offer to make the
change. When the user says yes, follow `h2xd:code-quality`: move every caller
in the same change, replace the old tests as `vocabulary.md` says, and run
`h2xd:prove-tests` on the new ones.

Done when the user has the summary and chose to build now, later or never.

## Do

- Scope by recent change before scanning anything.
- Quote the code or count the commits behind every candidate.
- List the areas that passed, so the report shows its coverage.
- Ask which candidate to explore before proposing any interface.

## Don't

- Don't write "component", "service", "API" or "boundary". Use "module",
  "interface" and "seam" from `vocabulary.md`.
- Don't propose a seam with one adapter. Name the second adapter, or merge.
- Don't list every refactor a decision record forbids. Keep only the ones worth
  reopening it, and name the record.
- Don't keep the old shallow-module tests next to the new ones. Delete them
  once the interface tests cover the behavior.
- Don't change code during the review. Change it in step 6, after the user
  confirms.
