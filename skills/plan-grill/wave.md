# Ask a wave

Put all questions of the wave in one call to the CLI's question tool, such as
AskUserQuestion:

- Give each question 2 to 4 options that exclude each other.
- Never add an "Other" option. The tool adds one for free text.
- Put your recommendation first. Its label ends in `(Recommended)`.
- Write the label as the answer in 1 to 5 words. The description says what
  follows from picking it.
- Set `header` to a short topic tag of at most 12 characters.
- Set `multiSelect: true` only when the options do not exclude each other.
- Add a `preview` when the user compares concrete things, such as code,
  config, a layout or a file tree.

## Without a question tool

When the CLI has no question tool, ask the same wave of at most four as a
numbered list. Give each question its options as `a)`, `b)`, `c)`. Put the
recommended option first and mark it, so the user can reply `1a 2b 3a 4c`.
