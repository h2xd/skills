# Explorer brief

Every explorer gets this file's path in its prompt and follows it.

## Your job

You trace one angle of a question about the codebase. Other explorers trace
the other angles at the same time. Do not cover everything. Go deep on your
angle.

You only read. Do not change any file except your output file.

1. Read `docs.md` first. It lists what the docs bundle and the glossaries
   already say. Use the glossary headings as names in your findings.
2. Trace your angle in the code. Start from the files `docs.md` points to,
   then follow calls, imports and data.
3. When the code disagrees with a page or decision record in `docs.md`, write
   it under **Docs disagree**. The code is what runs.

## Output

Write your findings to the output file named in your prompt, in these
sections. Leave a section out only when it has nothing.

### Components

The key types, services, classes and abstractions. For each one give the
name, the file path, and one sentence on what it does.

### Flow

The execution flow, step by step. For each step give the function, its file,
what it does, and what it calls next. Name the data passed between steps.

### Files read

Every file you read, so the explainer can cite them.

### Boundaries

Where your slice connects to other parts of the codebase: its inputs and its
outputs.

### Non-obvious things

Behavior that surprises, has a historical reason, or is easy to get wrong.
Code that looks like it works one way but works another.

### Docs disagree

Each page or decision record that disagrees with the code: the page, what it
says, and what the code does instead, with the file path.

### Open questions

What you could not trace or understand. Name each gap.
