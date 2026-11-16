---
name: plan-grill
description: "Interview the user in waves of at most four click-to-answer questions until no decision is open, and record settled terms and decisions as they settle. Use when the user wants to stress-test a plan, asks to be grilled, or before building something whose shape is still open."
---

# Plan grill

A plan that sounds done often hides ten guesses. "Users can export" leaves open
which format, which users, and what happens at a million rows. This skill finds
every guess and turns it into a decision the user made with one click.

## The design tree

Every decision branches into the decisions that hang off it. The **frontier**
is every open decision whose prerequisites are settled. You can ask it now
without guessing an answer you have not heard. A question that depends on an
open one waits for a later wave.

## Facts are yours, decisions are theirs

Never ask the user for something you can look up. A file, a version, what a
tool supports and how the repo does it today are facts. Ask only for choices.

## Steps

### 1. Look up the facts

In the first wave, when the user names a ticket, run **Claim** from
`docs/agents/issue-tracker.md`, when the tracker page lists it. When it fails,
stop and name the ticket as claimed. Run **Search** for `#<n>` and list each
open issue that mentions the ticket. A grill opens no PR, so run **Unclaim**
in step 6, when the page lists it.

Read the code, the docs and the tracker for every fact the frontier needs. For
a long search, start a subagent with a fresh context, through the CLI's
subagent tool, such as Agent. Only the questions downstream of a running search
wait for it.

When a customer or someone outside the team holds an answer, offer
`/h2xd:to-questionnaire` for that branch. Keep grilling the rest.

Done when the claim held or no ticket was named, and no question in the next
wave asks for something you could look up.

### 2. Ask a wave

Pick at most four questions from the frontier. When it holds more, take the
ones that unblock the most later decisions.

Before the wave, write one line: the wave number, what the last answers
settled, and about how many decisions are left. Add one or two lines on the
facts you found, so the options make sense.

Ask with clickable options, per [`wave.md`](wave.md). Put your
recommendation first, marked `(Recommended)`, and put all questions of the
wave in one call.

Done when the user answered every question in the wave.

### 3. Recompute the frontier

Each answer settles a decision and may open new ones. Drop the questions the
answers made moot. When an "Other" answer does not fit the tree, ask a
follow-up in the next wave.

When the user states how something works and the code disagrees, say so before
the next wave.

Done when the frontier holds only open decisions whose prerequisites are
settled.

### 4. Write it down as it settles

In a repo set up with `h2xd:setup`, record each result when it settles. Do not
save them for the end.

- **A term.** When the user resolves a fuzzy or clashing word, offer the entry.
  Then write it with `h2xd:docs-glossary`. When a word clashes with an existing
  entry, challenge it at once. Test a new term with a concrete edge case.
- **A decision.** Offer a record with `h2xd:docs-adr` when an answer meets all
  three tests. It is hard to reverse, it surprises a reader without context,
  and it is a real trade-off. The skill runs its own overlap check and opens
  the issue.
- **An idea.** When a branch is a good idea but not for now, offer to park it
  as an `idea` issue, per [`idea-issue.md`](idea-issue.md). Then prune it from
  the tree.

Done when every settled term, decision and parked idea was offered, and each
yes was written.

### 5. Repeat until the frontier is empty

Go back to step 1 for the next wave. When the user asks for a number of
questions, such as "ask me 40", that is the total across all waves. Still ask
at most four at a time. When the tree runs out early, stop and say so.

Done when the frontier is empty: every branch visited, nothing silently
assumed.

### 6. Close

Before the table, run `h2xd:docs-fact-check` on the settled decisions. A
decision that contradicts an accepted record goes back to the user, with the
record. Example: the user decides that `h2xd:review-pr` asks before it posts.
Record 0003 says it posts, then reports. Ask again with that record quoted.

Show the decisions as one table: the decision, the answer, and whose it was.
Mark each answer as your recommendation or the user's own choice. Then list
what step 4 wrote, one line each:

```
🟡 <idea title>: parked as <issue link>
🟢 <term>: added to the glossary
🟢 <decision>: record opened as <issue link>
```

Ask with the question tool whether the table is right. The options are
confirm, change some answers, or keep grilling. Do not act on the decisions
before the user confirms. When you ran **Claim**, run **Unclaim** now.

Done when `h2xd:docs-fact-check` ran on every decision, each contradiction went
back to the user, the user confirmed the table, and **Unclaim** ran after a
**Claim**.

## Do

- Look up every fact yourself before you ask.
- Put your recommendation first, marked `(Recommended)`.
- Say in one line what the last wave settled.
- Follow up an "Other" answer in the next wave.
- Write a settled term or decision down when it settles.

## Don't

- Don't ask more than four questions at once. Pick the ones that unblock the
  most.
- Don't ask a question whose answer depends on an open one. Ask it in a later
  wave.
- Don't add an "Other" option. The tool adds it.
- Don't ask the user for a fact. Look it up, or start a subagent to find it.
- Don't act on the decisions before the user confirms. Show the table and ask.
