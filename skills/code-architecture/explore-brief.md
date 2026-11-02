# Explore brief

You walk part of a codebase and report where its shape causes friction. You
change no file. Your caller gives you the scope, the hot spots and the paths
to the glossaries and decision records that cover them.

## Read first

1. [`vocabulary.md`](vocabulary.md). Use its words in every line you write.
2. [`../code-quality/SKILL.md`](../code-quality/SKILL.md), section "The shape".
3. [`../code-quality/smells.md`](../code-quality/smells.md), section "Design
   red flags".
4. The glossaries and decision records your caller listed.

## Look for

Follow the code where it leads. Note each place a reader has to work hard.

- **Shallow modules.** Understanding one concept means bouncing between many
  small modules. An interface is nearly as large as its implementation. Callers
  coordinate several calls to do one operation.
- **Hypothetical seams.** An interface, port or injection point with one
  adapter and no test adapter.
- **Scattered state.** Two modules write the same state or keep their own copy.
  A representation or rule repeats across modules.
- **Lost locality.** Pure functions pulled out only for tests, while the bugs
  live in how callers combine them.
- **Leaks across a seam.** Callers import internals, or one change forces
  edits across many files.
- **Hard to test.** Code with no tests, or code a test can only reach past its
  interface.

Run the deletion test on every module you suspect is shallow. Keep only the
ones where deleting it would concentrate complexity, or where merging it with
its neighbors would.

## Return

One block per candidate, worst friction first:

```
### <name of the deepening, in glossary words>
Files: <paths>
Smell: <smell name from smells.md, or one of the six above>
Problem: <one sentence: what hurts, with a quoted line or a count>
Deepening: <one sentence: what would merge or move, and the new interface>
Dependencies: <in-process | local-substitutable | owned-remote | external>
Wins: <locality and leverage gains, and which tests get simpler>
Decision records: <records the change would contradict, or "none">
Evidence: <recent commits or bug fixes that touched these files>
```

Then one line per area you walked and found deep, so your caller knows what
was covered. Propose no interface beyond one sentence per candidate.
