---
name: to-tickets
description: Break a spec, plan or the current conversation into tracer-bullet tickets, each with acceptance criteria and the tickets that block it. Shows the breakdown, then publishes it with the tracker operations in docs/agents/issue-tracker.md after the user approves. Use when a plan or spec is settled and the work needs splitting into tickets, or when the user asks for tickets, issues or a task breakdown.
argument-hint: "[spec path, ticket number or URL]"
disable-model-invocation: true
---

# To tickets

A plan is too big for one session and too vague to check. Nobody can say
"the plan is done". Someone can say "the draft saves and reloads".

This skill cuts a plan into tickets an agent can pick up cold. Each ticket is
one issue in the tracker and one tracer bullet: a narrow path through every
layer that works end to end. Each names the tickets that block it and the
acceptance criteria that say it is done. `h2xd:prove-tests` and
`h2xd:review-pr` read those criteria from the ticket a PR closes.

The tracker commands live in `docs/agents/issue-tracker.md`, written by
`h2xd:setup`. When that file is missing, stop and tell the user to run setup.

## Steps

### 1. Gather the source

Work from the conversation. When the argument names a spec file, read it in
full. When it names a ticket, fetch it with the **View** operation, comments
included. That ticket is the **parent**.

Done when you can state in one paragraph what the finished work does for its
user, and what is out of scope.

### 2. Explore

Read the code the work touches. Find the pages about it:

```sh
node scripts/find-docs.ts --search "<words>"
node scripts/find-docs.ts --type Decision --links-to <path the work touches>
```

Use the words in the project and technical glossaries for titles and criteria,
per `h2xd:docs-glossary`. A ticket that would break an accepted decision record
needs a new record first, per `h2xd:docs-adr`. Make that record a ticket of its
own, blocking the rest.

Look for a **prefactor**: a change to the existing code that makes the new
work easy. It becomes the first ticket.

Done when you can name the modules each slice crosses, the glossary terms you
will use, and each record that constrains the work.

### 3. Draft the slices

Cut the work by the rules in [`slicing.md`](slicing.md):

- Each ticket crosses every layer it needs such as schema, API, UI and tests, narrowly.
- A finished ticket can be shown working or checked on its own.
- Each ticket fits one fresh agent session.
- Prefactors come first. A file that two tickets create is a prefactor. Make it
  its own ticket that the others are blocked by, or give each ticket its own
  file. Two tickets that both say "create it when it does not exist" conflict
  on every rebase.
- A wide refactor is the exception. Sequence it as expand, migrate, contract.

Give each ticket its **blocking edges**: the tickets that must be done before
it can start. A ticket with none can start now.

Write three to six acceptance criteria per ticket. Each is one observable
behavior, phrased as input and expected result, checkable by a test or a
command. "Saving a draft with an empty title shows 'Title required' and
writes nothing" is a criterion. "Validation works" is not.

Done when every ticket has a title, blockers, what it delivers, and criteria,
and the edges form no cycle.

### 4. Ask

Show the breakdown as a numbered list, in dependency order. Per ticket: the
title, `Blocked by` with numbers from this list, what it delivers in one or two
sentences, and its criteria.

Then ask with clickable options, through the CLI's question tool, such as
AskUserQuestion:

- Granularity: right, too coarse, or too fine.
- Blocking edges: right, or name the wrong ones.
- Publish now, revise first, or stop at the list.

Apply each change, show the new list, and ask again.

Done when the user chose publish or stop. On stop, end here.

### 5. Publish

Write each ticket from [`ticket-template.md`](ticket-template.md) into a file
in your scratchpad. Then create them with the **Create** operation, blockers
first, so each `## Blocked by` names real ticket numbers. Tickets with no edge
between them can go in any order.

- When the tracker page lists a **Block** operation, record each edge with it
  and leave out the `## Blocked by` section.
- When it lists a **Sub-issue** operation and there is a parent, attach each
  ticket to it. Otherwise the `## Summary` line names it.
- Apply a label only when the tracker page's `## Labels` table defines one for
  tickets.

Done when every approved ticket exists in the tracker, and each `Blocked by`
names a ticket number that exists.

### 6. Report

One line per ticket, worst first, in dependency order within each status:

```
🔴 <title>: <the create or link that failed, and the command to retry>
🟡 <title> #<n>: <edges written as text, or a criterion the user left vague>
🟢 <title> #<n>: blocked by <#n, #n> or none
```

Then name the **frontier**: the tickets with no open blocker. Remind the user
that the PR finishing a ticket links it with the **Link a PR** operation, so
`h2xd:review-pr` reads its criteria.

Done when every approved ticket has its line and the frontier is named.

## Do

- Use the glossary's words in every title and criterion.
- Phrase each criterion as an input and the result a caller sees.
- Create blockers before the tickets they block, so references are real.
- Describe behavior and interfaces. Inline a snippet only when a prototype
  settled a type shape, schema or state machine, and say so.
- Make a record a decision needs, per `h2xd:docs-adr`, a blocking ticket.

## Don't

- Don't publish before the user approves the list. Show it and ask.
- Don't slice by layer, such as "the schema ticket" and "the UI ticket". Cut one thin path through all of them.
- Don't write a criterion a test cannot check. Name the input and the expected result.
- Don't name file paths or line numbers in a ticket. They go stale. Name the module, type or behavior.
- Don't close or edit the parent ticket. Reference it from each new ticket.
- Don't put every ticket in one issue. Create one per ticket.
