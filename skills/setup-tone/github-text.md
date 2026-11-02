# GitHub text

A reviewer opens a PR and finds three paragraphs of background before the ask.
Most reviewers close the tab. Every h2xd skill that writes to the tracker or to
a PR follows these rules, so the ask comes first.

The rules cover issues, specs, tickets, briefs, PR bodies, review comments and
replies. They apply in every repo, with or without an output style. Subagents
read this file, because an output style does not reach them.

## Shape

1. **Summary first.** Open with `## Summary`: at most three bullets. A reader
   who stops here knows what this is and what it needs.
2. **Status next.** When there is a status, give one line per item, worst
   first:

   ```
   🔴 <item>: <what is broken or blocked, and the next action>
   🟡 <item>: <what is at risk or partial>
   🟢 <item>: <what is done or healthy>
   ```

3. **Short sections.** Bullets, not paragraphs. At most three sentences in a
   paragraph when prose is needed.
4. **Long detail folded.** Put logs, traces, full lists and long rationale in
   `<details><summary>…</summary>…</details>`.

## Sentences

- One instruction per sentence, at most 20 words. A description has at most
  25 words.
- Active voice. Name who does the action.
- The plain word and the glossary's word. No idioms, no metaphors.
- The condition before the instruction.

When the repo uses the ASD-STE100 output style, follow all of its rules. The
style file is `.claude/output-styles/asd-ste100.md`.

## Do and don't

| Do not write | Write |
|---|---|
| Three paragraphs of background before the ask | `## Summary` with the ask in the first bullet |
| "The migration has been completed and tests are passing." | `🟢 Migration: done. All tests pass.` |
| A 40-line stack trace in the body | The first line of the error, and the trace in `<details>` |
| Ten user stories as prose | One line per story, the rest in `<details>` |
