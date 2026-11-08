---
name: docs-adr
description: "Write, supersede or correct a decision record. Checks existing records and issues for overlap, opens a tracker issue, writes the MADR record that cites it, and links the PR. Use when a hard-to-reverse decision is made, the user says ADR, or a change contradicts an accepted record."
---

# ADR

Six months from now, someone asks "why Postgres and not SQLite?" and a new
session starts to undo it. A decision record answers first: what was decided,
what lost, and why. Then nobody reopens a closed question or undoes something
deliberate.

Records live in `<docs.root>/<docs.decisions>/`, `docs/decisions/` by default.
They follow [MADR 4.0](https://adr.github.io/madr/) with OKF
frontmatter. The tracker commands are in `docs/agents/issue-tracker.md`.

**Every record starts as a tracker issue.** Two branches that draft records on
one question then find each other's open `adr` issue before a second file
exists. `node scripts/lint-docs.ts` fails a record that cites no `issue-<n>`
source when its number is at or above `docs.decisionIssueRequiredFrom`.

## Steps

### 1. Is it a decision worth a record?

All three tests must pass:

1. **Hard to reverse.** A change of mind later costs real work.
2. **Surprising without context.** A reader of the code would ask "why this way?"
3. **A real trade-off.** There were alternatives, and one won for reasons.

Typical cases are an architectural shape, a technology with lock-in, where a
seam between modules goes, a deliberate deviation, a constraint the code cannot show, or a
widened vocabulary. When a test fails, say so and stop. When it is an idea and
not a decision, offer an `idea` issue, per `../plan-grill/idea-issue.md`.

Done when you can name the trade-off in one sentence, or you stopped.

### 2. Check for overlap

Search before you create anything. Use two or three sets of words: the
problem, the options, and the parts of the system.

```sh
node scripts/find-docs.ts --type Decision --search "<words>"
node scripts/find-docs.ts --type Decision --links-to <path the decision affects>
node scripts/find-docs.ts --type Decision --tag <area>
```

Then search the tracker with the **Search** and **List by label** operations.
Search open and closed issues, with the `adr` label and without it. An open
`adr` issue is a decision in progress on another branch.

Read every candidate in full. Put each in one bucket:

| Bucket | Meaning | Next |
|---|---|---|
| **same** | A record already decides this question | Stop. Point to it. Offer to comment on its issue |
| **in flight** | An open `adr` issue covers it, and no record is merged yet | Stop. Offer to add this input to that issue |
| **supersedes** | An accepted record decided it differently, and this one replaces it | Go on in supersede mode, step 5 |
| **related** | A record decides a neighboring question | Go on. Link it under `## More Information` |
| **unrelated** | A word matched, but the question differs | Drop it |

Done when the user agrees with the buckets, or there were no candidates and
you named the searches you ran.

### 3. Open the issue

Copy [`issue-template.md`](issue-template.md) to a file in your scratchpad and
fill it. An issue is public, so show the title and the body first. On a yes,
create the issue with the **Create** operation, the `adr` label and the body
file.

Done when you have the issue number `<n>` and its URL.

### 4. Write the record

1. When you are on the default branch, create the branch `adr/<n>-<slug>` first.
2. Take the next free number. That is the highest `NNNN` in the decisions
   directory, on this branch and on `origin/<default branch>`, plus one.
3. Copy [`template.md`](template.md) to `NNNN-<slug>.md` and fill it from the
   conversation. Cite the issue as `sources: [{ id: issue-<n>, ... }]`.
4. Set `status` to `accepted` when the deciders made the call in this
   conversation. Otherwise set `proposed`. List the deciders in `decision-makers`.
5. When the conversation lacks something MADR asks for, write "Not recorded."
6. Leave out an optional section that would hold only "Not recorded.". The
   optional sections are `Decision Drivers`, `Confirmation`,
   `Pros and Cons of the Options`, `Diagram` and `More Information`.
7. Link every affected file or directory with a relative link.
   `node scripts/find-docs.ts --links-to` and the review skills find the record
   through these links.
8. Name every term by its glossary heading, per `h2xd:docs-glossary`.
9. Add the record to `docs/index.md` under `## Decisions`. Add a `**Decision**`
   entry to `docs/log.md`.

Done when the record cites `issue-<n>` and `node scripts/lint-docs.ts` exits 0.

### 5. Supersede or correct

**Supersede.** A changed decision gets a new record. Set the old record's
`status` to `superseded by ADR-NNNN`, with the new number, and leave its body
as it was. Link the old record from the new one's
`## Context and Problem Statement` or `## More Information`.

`node scripts/lint-docs.ts` fails when the new record does not link the old
one. It prints a note for every page that still links the old record. Update
those pages to link the new one.

**Correct.** Change an accepted record only to fix a fact that was wrong when
written, or to rename a term to its glossary heading. Say what changed under
`## More Information`, and cite the issue or PR that found the error. A
correction needs no new issue.

Done when `node scripts/lint-docs.ts` exits 0 and prints no note about the old
record.

### 6. Link it up

1. Commit with `h2xd:git-commit`. The footer has `Refs: #<n>`. When you
   supersede, the footer also names the old record's path.
2. Comment on the issue with the record's path and status, through the
   **Comment** operation.
3. Open the PR with `h2xd:git-pr-body`. Link the issue with the
   **Link a PR** operation, which on GitHub is a `Closes #<n>` line. When the
   record ships with the code it decides, the PR body has both closing lines.

Done when the record cites the issue, the issue names the record, and the PR
closes the issue.

## Headings

Section headings are MADR's, in MADR's title case, because ADR tools parse
them. This overrides the sentence-case rule 17 in
[`../add-soul/SKILL.md`](../add-soul/SKILL.md), for these headings only.

## Do

- Search records and `adr` issues, open and closed, before you open an issue.
- Cite the issue as `issue-<n>` in `sources`.
- Link affected code with relative links, not only with backticks.
- Write "Not recorded." for what the conversation did not settle.

## Don't

- Don't open a second issue for a question already in flight. Comment on the open one.
- Don't edit an accepted record's decision. Supersede it with a new record.
- Don't invent decision-makers, options or drivers. Write "Not recorded."
- Don't ask before you push or open the PR. `h2xd:git-pr-body` opens a one-way door as a draft.
