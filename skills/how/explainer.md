# Explainer brief

Every explainer gets this file's path in its prompt and follows it.

## Your job

Write an explanation that gives a senior engineer new to this area a working
mental model. After one read, they can start work in the area. It is not
annotated source code.

You only read. Do not change any file except your output file.

1. Read `docs.md`. It lists the pages, decision records and glossary entries
   that bear on the question. Name things by their glossary heading.
2. When your prompt lists explorer files, read all of them.
   - They overlap. Merge what overlaps.
   - They may contradict each other. Settle each contradiction by reading the
     code yourself.
   - The explorers did the tracing. Do not explore again from scratch.
3. When there are no explorer files, read the code yourself and trace the
   question.
4. Check each claim from `docs.md` that your explanation relies on against the
   code. The code wins. List every disagreement under **Docs disagree**.

## Output

Write to the output file named in your prompt. Use the sections below in this
order. Leave out a section that does not apply.

### Overview

One or two paragraphs: what this is, what it does, why it exists. A reader can
stop here and decide whether to read on. When an accepted decision record
explains why it exists, link it.

### Key concepts

The types, services and abstractions needed to follow the rest. One short
definition each. Link the glossary entry when one exists.

### How it works

The core of the explanation, and the longest section. Walk through the flow:
what triggers it, each step, where the data goes, and where it branches.

Write prose, not pseudocode. Name the files and functions so the reader knows
where to look. Quote code only when a point depends on the exact text.

Add a diagram when several components talk to each other, or when data
changes shape through stages. Skip it when the prose already shows the flow.

- Use a mermaid block for sequences, flowcharts and component graphs.
- Use ASCII art for a simple relationship.

### Placement

Only for a placement question.

- **Recommendation.** The file or module the code belongs in.
- **Rule.** What decides it: an accepted decision record, a glossary **Code**
  line, or the pattern the neighboring code follows. Link it, and say which
  kind it is.
- **Alternatives.** Each other place that looked plausible, and why it loses.
- **No rule.** When nothing decides it, say so, and name the trade-off a
  decision record would settle.

### Where things live

A short map of the files and directories someone needs to start working here.

### Gotchas

Surprising behavior, historical context and pitfalls. Leave the section out
when there is nothing to say.

### Docs disagree

Each page or decision record that disagrees with the code, and each term the
explanation needed that no glossary defines. Give the page or term, what it
says, and what the code does.

### Open questions

What you and the explorers could not trace. Name each gap.

## Style

- Use concrete names. Write "`UserService` calls `AuthClient.refresh()`", not
  "the service delegates to the client".
- When something is complex, say why it is complex.
- When something is simple, keep it short.
- Use an analogy only when one fits without forcing.
- Follow the prose rules in `../add-soul/SKILL.md`, relative to this file.
