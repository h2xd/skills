---
name: what
description: "Re-pitch your last message so it lands: the missing context first, then short plain sentences with the glossary's words. Use when the user says \"wait, what?\", \"I'm lost\", \"say that again simpler\" or \"too much jargon\", or the last message did not land."
---

# What

Your last message made sense to you, because you were inside the work. The user
was not. It is like giving directions that start at a corner only you can see.

Say it again from where the user stands. Use the words the repo has agreed on,
and keep every sentence short.

A private term is a word you made up or picked up during the task, such as a
nickname for a file or a label for an idea. The user never agreed to it.

### 1. Find the message and the gap

Take your last message to the user. Ignore tool output and earlier turns.
List what a reader who skipped the work would miss:

- The context: what you were doing, and what led to this point.
- Each private term, abbreviation, arrow or symbol-speak.
- Each step you skipped because it was obvious to you.

When the user named the part that confused them, start with that part.

Done when you have the list of missing context and private terms.

### 2. Map words to the glossary

Read `agents.config.json`. The glossary paths are under `docs.glossaries`, and
are relative to `docs.root`. Read those files. Give each private term its
glossary `###` heading. A word under an entry's **Avoid** list becomes that
entry's heading.

When a term has no entry, replace it with plain words. When the plain words take
more than a clause, define the term in one sentence on first use. When the repo
has no `agents.config.json` or no glossaries, use plain words throughout.

Done when every term on the list maps to a glossary heading or to plain words.

### 3. Re-pitch

Write the new message in this order:

1. **Where we are.** One or two sentences of context: the task, and what
   you just did or found.
2. **The point.** What the last message said, in plain words. Keep every fact,
   number, file path and command it had. Add none.
3. **What I need from you.** The decision, answer or action, if the last
   message asked for one. Leave this out when it asked for nothing.

Write it in the style of ASD-STE100 Simplified Technical English:

- One idea per sentence. At most 20 words for an instruction, 25 for a fact.
- Active voice. Name who does what.
- One word per thing. Use the glossary heading every time, never a synonym.
- Whole sentences with articles and verbs. Spell out arrows and abbreviations.
- Common words. "Use", not "leverage". "Start", not "kick off".
- Lists for sequences of three or more steps.

Keep it shorter than the original. Code, paths and commands stay in code font,
unchanged.

Done when the new message has the context first, uses only glossary headings or
plain words for terms, and says the same facts as the original.

### 4. Check against the rules

Read `../add-soul/SKILL.md` and apply it to the new message. Then send it.

Done when the message is sent, and a reader who skipped the work could act on it.

## Do

- Start from the user's position, not from the last tool call.
- Use each glossary `###` heading exactly as written.
- Keep every fact, path and number the original had.
- Ask one plain question at the end when the original asked several.
- Flag a term the glossary lacks. Suggest `h2xd:docs-glossary` to add it, but
  do not add it now.

## Don't

- Don't add new findings or new advice. Re-pitch only what was said.
- Don't drop a caveat to make it shorter. Say the caveat in plain words.
- Don't explain general programming words. Explain only the terms this task or
  this repo made up.
- Don't use a word from an entry's **Avoid** list. Use its heading.
- Don't repeat the original with small edits. Rebuild it from the context down.
- Don't open with an apology or a preface such as "To put it simply". Open with
  where we are.
