# Design it twice

Use this when the user wants to compare interfaces for the chosen deepening.
The first design is rarely the best one.

## 1. Frame the problem

Write a short note to the user before any subagent starts:

- The constraints any new interface has to meet.
- Each dependency and its category from [`vocabulary.md`](vocabulary.md).
- A rough code sketch that makes the constraints concrete. Say it is not a
  proposal.

Show it, then start the subagents at once. The user reads while they work.

Done when the user has the note and the subagents are running.

## 2. Start three or four designers

Start the designers in parallel, each with a fresh context. Use the CLI's
subagent tool, such as Agent. First write one brief file to your scratchpad
with:

- the file paths and the coupling you found,
- the dependency categories and what sits behind the seam,
- the glossary terms that apply.

Give each designer the brief path and one constraint:

1. Make the interface as small as possible: one to three entry points.
2. Cover many use cases and allow extension.
3. Make the most common call trivial.
4. When a dependency is `owned-remote` or `external`: build around ports and
   adapters.

Each designer returns:

1. The interface: types, functions, invariants, ordering, error modes.
2. A caller using it.
3. What the implementation hides behind the seam.
4. The adapters, and which ones tests use.
5. Where leverage is high and where it is thin.

Done when every designer returned all five parts.

## 3. Compare and recommend

Show the designs one at a time. Then compare them on depth, locality and seam
placement. Name the design you would build and why. When parts of two designs
combine well, propose the mix.

Done when the user has your recommendation and the choice goes back into the
grilling as one decision.
