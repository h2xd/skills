---
name: to-questionnaire
description: Turn what you need to learn from a customer or another person outside the team into a polished questionnaire page they fill in alone, then read their answers back. Broad questions grouped by theme, open answers where options do not fit, and a recommendation first where they do. Renders with the h2xd:to-page layout. Use when a plan or design waits on knowledge a customer or someone outside the session holds, or when the user says questionnaire or "ask X about this".
disable-model-invocation: true
---

# To questionnaire

Some answers sit with a customer who is not in the room. A guess about how
their team works costs a week of rework. A short page with themes, a few
clicks and room to write costs them ten minutes.

`h2xd:to-page` collects answers for the short run, from the user or the team.
This skill writes for a reader outside the team. Its questions are broad, its
words avoid the team's jargon, and it accepts open answers. It uses the
`questionnaire` page type of the to-page tool, so it has the same layout, the
same save button and the same answers file.

The tool is `../to-page/scripts/to-page.ts`, next to this folder. Call it as
`node "${CLAUDE_PLUGIN_ROOT}/skills/to-page/scripts/to-page.ts"`. When that
variable is empty, use the path relative to this file.

## Ask about the send, not the subject

The user cannot answer the subject, or there would be no questionnaire. Ask the
user only what they can always answer: who receives it, and what they need
back. The questions on the page then aim at the gap between the two.

## Steps

### 1. Look up what you can

Never ask the reader what a search answers. Read the code, the docs and the
tracker first. In a repo set up with `h2xd:setup`, run
`node scripts/find-docs.ts --search "<words>"`.

Done when every fact you could find is found, and what is left needs the
reader.

### 2. Ask who it goes to

Ask the user one wave with clickable options, through the CLI's question tool,
such as AskUserQuestion. Use the format of `h2xd:plan-grill`. Ask for:

- The reader's role, and what they know that the user does not.
- The words the reader uses for the subject, so the page avoids the team's
  words.
- The deadline.

Done when you know who reads the page, what they know, and by when.

### 3. Ask what the user needs back

List what the user wants to learn. Mark each item as a choice, with 2 to 4
options and the one you recommend, or as an open question, with your best
guess when you have one. Group the items by theme. Show the list, and ask the
user with the question tool which items go to this reader.

Done when the user confirmed a list of items, each one a choice or an open
question.

### 4. Write the form file

Run `to-page.ts spec questionnaire`, and read the fields and the rules. Then
write `<folder>/round-1.form.json`. Use the CLI's scratch or temp folder.
Without one, use `.to-page/<slug>/` in the current directory.

- Set `id`, `title` and `intro`. Put the reader in `to`, the sender in `from`, the date from step 2 in `deadline`, and the decision the answers feed in `purpose`.
- Give `context` one paragraph for a reader who was not in the conversation.
- One idea per question. Split a compound question in two.
- Use options where options fit. Use an open question for experience, numbers
  and stories, with a `guess` when you have one.
- Add `why` only where a question could be misread.
- At most eight questions per round, so the page takes about ten minutes. Set
  `minutes` to your estimate.

The page adds "I don't know", "Something else", a note per question and
"Anything else?" at the end. Do not add them.

Done when the file exists and holds every item of this round.

### 5. Render and hand over

Run `to-page.ts render <folder>/round-1.form.json`. When it exits 1, fix each
line it prints and run it again.

Give the user the path of the `.html` file to send to the reader. The file
loads nothing from outside, so it works offline. The reader clicks **Save answers** and sends back the answers file, or the JSON the page
shows.

Done when `render` exits 0, and the user has the path of the page.

### 6. Read the answers

Read the answers file or the pasted JSON. Never read the `.html` file.
`pick` is the option id, and `note` holds an open answer. `more` holds the
answer to "Anything else?".

Report the round, worst first:

```
🔴 <id>: no answer, or "I don't know". <who else might know>
🟡 <id>: "Something else", a partial answer, or a surprise. <what is still unclear>
🟢 <id>: <the answer>
```

An answer can open new questions. When items are still open, write
`round-2.form.json` with `"previous": "round-1"`, and ask the user whether to
send it. Hand each settled decision worth keeping to `h2xd:docs-adr`, and each
settled fact to `h2xd:docs-wiki`.

Done when every item is settled or the user chose to stop, and each settled
decision has a record or the user declined one.

## Do

- Look up every fact before you ask the reader for it.
- Write in the reader's words. Explain each term they may not know.
- Put your recommendation first, so agreeing costs one click.
- Give a best guess on an open question, so the reader corrects instead of
  writing from nothing.
- Number questions across rounds, so a reply can say "Q3: b".

## Don't

- Don't ask the user the subject questions. Ask who it goes to and what they
  need back.
- Don't put code paths, ticket numbers or team jargon on the page.
- Don't write HTML, CSS or JS for the page. Write the form file and run
  `render`.
- Don't send a compound question. Split it into one question per idea.
- Don't act on the answers before the user has seen the report.
