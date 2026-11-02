---
name: to-questionnaire
description: Turn a decision you cannot fully answer into a Markdown questionnaire for the person who can, then read their answers back. Asks at most four questions per round, puts a recommendation first, and offers tick-box options instead of open text where it can. Use when a plan or design waits on knowledge someone else holds, when the user says questionnaire or "ask X about this", or when h2xd:plan-grill hits a question the user cannot answer.
disable-model-invocation: true
---

# To questionnaire

Some decisions wait on a person who is not in the room. A guess about their
database costs a week of rework, and one ticked box costs ten seconds. This
skill writes them a Markdown questionnaire to fill in alone, or to go through
with the user in a meeting.

It asks the way `h2xd:plan-grill` does. Each round has few questions. Each
question puts a recommendation first. The recipient ticks a box wherever a box
can hold the answer.

## Ask about the send, not the subject

The user cannot answer the subject, or there would be no questionnaire. Ask the
user only what they can always answer: who receives it, and what they need
back. The questions in the document then aim at the gap between the two.

## Steps

### 1. Look up what you can

Never ask the recipient what a search answers. Search the code, the issue
tracker and the knowledge base. The tracker commands are in
`docs/agents/issue-tracker.md`.

- Search the knowledge base with `node scripts/find-docs.ts --search "<words>"`.
- List accepted decisions with
  `node scripts/find-docs.ts --type Decision --status accepted`.
- Note what you found in one or two lines.

Done when every fact you could find is found, and what is left needs a person.

### 2. Ask who it goes to

Ask the user one wave with clickable options, through the CLI's question tool,
such as AskUserQuestion. Use the format of `h2xd:plan-grill`. The wave covers:

- The recipient's role and expertise.
- What they know that the user does not.
- Async in writing, or filled in together in a meeting.
- The deadline.

Without a question tool, ask the same as a numbered list with `a)`, `b)`
options.

Done when you know who the recipient is, what they know, how they answer, and
by when.

### 3. Ask what the user needs back

List the decisions and facts the user cannot settle alone. For each one, draft
2 to 4 options and pick the one you recommend. Show the list to the user. Ask
with the question tool which items go to this recipient.

Done when the user confirmed a list of items, each with options or a reason it
has none.

### 4. Pick the round

Order the items as `h2xd:plan-grill` orders its frontier. An item whose answer
depends on another open item waits for a later round. From the rest, take at
most four, the ones that unblock the most later decisions.

Done when the round holds at most four items, and none depends on an open one.

### 5. Write the questionnaire

Fill in [`template.md`](template.md), one question per item:

- One idea per question. Split a compound question in two.
- Options as tick boxes, your recommendation first and marked `(recommended)`.
  Each option says in one line what follows from it.
- Open text only for a fact no option can hold. Then give your best guess for
  the recipient to correct.
- A `Why this matters` line only where the question could be misread.
- Write for the recipient from step 2. Explain terms they may not know. Skip
  context they already have.

Write the file to `questionnaire-<slug>.md` in the current directory, with the
slug from the topic, unless the user names a place. Report the path.

Done when the file exists, every item of the round has a question, and every
question has options or a best guess.

### 6. Read the answers back

When the user brings the filled-in file or meeting notes, read every answer.

- A ticked option settles its item, the recommended one or another.
- "Something else" that does not fit the options, "I don't know", or a blank
  stays open.
- An answer can open new items. Add them to the list from step 3.

Report the round, worst first:

```
🔴 <item>: no answer, or "I don't know". <who else might know>
🟡 <item>: "Something else" or a partial answer. <what is still unclear>
🟢 <item>: <the answer>
```

When items are still open, go back to step 4 for the next round. Ask the user
whether to send it. Hand each settled decision worth keeping to
`h2xd:docs-adr`, and each settled fact to `h2xd:docs-wiki`.

Done when every item is settled or the user chose to stop, and each settled
decision has a record or the user declined one.

## Do

- Look up every fact before you ask the recipient for it.
- Put your recommendation first, so agreeing costs one tick.
- Keep each round to four questions or fewer, most important first.
- Offer "I don't know" and "Something else" on every option question.
- Number questions across the document, so a reply can say "3: b".

## Don't

- Don't ask the user the subject questions. Ask who it goes to and what they need back.
- Don't ask a question that depends on an open one. Hold it for the next round.
- Don't write an open question when options fit. Draft the options and recommend one.
- Don't send a compound question. Split it into one question per idea.
- Don't act on the answers before the user has seen the report. Show it first.
