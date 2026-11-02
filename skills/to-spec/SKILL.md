---
name: to-spec
description: "Turn the conversation into a spec issue with the problem, the solution, user stories, decisions and what is out of scope. It asks only about gaps and publishes after a yes. Use when the user wants a spec, a PRD or a feature plan, or a discussed feature turned into an issue."
---

# To spec

An hour of good design talk vanishes when the session closes. This skill pins
it to the tracker as a spec: one issue that says what to build and why.
`h2xd:to-tickets` splits the spec into tickets afterwards.

- Build from the conversation and the code. Ask only about what neither
  settles.
- The tracker commands are in `docs/agents/issue-tracker.md`.
- Glossary paths are in `agents.config.json` under `docs.glossaries`.

## Steps

### 1. Gather

1. Write down the problem, the solution, and every decision the conversation
   made.
2. Check each claim the user made about the code against the code. When the
   code disagrees, note it for step 2.
3. Read the glossaries. Note each term the spec needs and its heading. Note
   each word the conversation used that no entry defines.
4. Find the decision records that touch this work. Search with two or three
   sets of words, and with the paths the work will change:

   ```sh
   node scripts/find-docs.ts --type Decision --search "<words>"
   node scripts/find-docs.ts --type Decision --links-to <path>
   ```

   Read every match in full. Keep the ones that constrain this work.
5. Search the tracker for an existing spec or issue on the same feature with
   the **Search** operation.

Done when you can list the settled decisions, the open ones, the terms, the
records, and any matching issue.

### 2. Close the gaps

- When an open issue already covers this feature, stop. Show it and ask
  whether to comment on it with the **Comment** operation or write a new spec.
- When the conversation holds no feature to spec, stop. Offer `h2xd:plan-grill`.
- When a term clashes with its glossary entry, or the code contradicts the
  user, ask which one holds.
- When an open decision blocks a section, ask about it the way `h2xd:plan-grill`
  does. Use clickable options, at most four questions per wave, and put the
  recommendation first. Ask only these. Leave the rest of the design alone.
- When the user does not want to decide now, the question goes under
  `## Open questions`.
- A new term that settles gets its entry through `h2xd:docs-glossary`.

Done when no section of the spec needs a guess.

### 3. Sketch the modules and tests

Read `h2xd:code-quality` for the bar on module shape and tests. Then sketch:

- **Modules.** Each module to build or change, and the interface it gains or
  loses. Prefer deep modules: a small interface over a lot of behavior, so
  each one can be tested on its own.
- **The test entry point.** The interface the tests call. Prefer one that
  exists over a new one. Pick the highest one that can observe the behavior.
  Fewer is better, and one is ideal.
- **What gets tests.** Which modules the tests cover, and the existing tests
  to copy.

Show the sketch and ask the user to confirm it, change it, or name the
modules they want tested.

Done when the user confirmed the modules and the test entry point.

### 4. Draft

Write the spec to a file in your scratchpad, following
[`template.md`](template.md). Title it `Spec: <the feature in a few words>`.
Name every term by its glossary heading. Put each record from step 1 under
`## Decision records`.

Done when every section is filled or says "None.", and the draft names no
term outside the glossaries.

### 5. Publish

An issue is public. Show the title and the full body. Create it only on a
yes, with the **Create** operation and the body file. Add the `spec` label
when the `## Labels` table in `docs/agents/issue-tracker.md` lists it.

Done when you have the issue number and URL.

### 6. Report

One line per item, worst first:

```
🔴 <item>: <what blocked publishing, and the next action>
🟡 <item>: <an open question, a decision that needs a record, a term without an entry>
🟢 <item>: <the issue URL, the records linked, the glossary entries added>
```

Close with the next step: run `/h2xd:to-tickets` to split the spec, and
`h2xd:docs-adr` records each decision listed as `Needs a record`.

Done when the issue URL and every open item have their line.

## Do

- Take decisions from the conversation first, then from the code.
- Check the user's claims about the code before writing them down.
- Name each term by its glossary heading.
- Link every decision record that constrains the work.
- Write many user stories, covering errors and edge cases.

## Don't

- Don't interview the user about what the conversation settled. Ask only about gaps, and take the rest from the conversation.
- Don't publish without a yes. Show the title and body first.
- Don't write file paths or code into the spec, because they go stale. Describe modules and interfaces, and inline a prototype snippet only when it states a decision best.
- Don't write a decision record inside the spec. List it as `Needs a record` and hand it to `h2xd:docs-adr`.
- Don't guess an open decision. Ask, or put it under `## Open questions`.
