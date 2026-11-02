---
name: plan-prototype
description: Build throwaway code that a person runs to answer one design question before anything is committed. A clickable HTML file for a state model or logic, or switchable variants on a real page for a UI. Builds two or three competing variants when the repo has no precedent for the design. Use when the user wants to check whether a state model, data shape or flow feels right, wants to see what a screen could look like, or faces a new interaction or architecture with nothing similar in the codebase.
disable-model-invocation: true
---

# Prototype

A refund flow reads fine in the spec. Then someone clicks "refund" twice on a
page, and the order pays out twice. Ten minutes with a prototype finds that.
Two weeks of production code hides it until a customer finds it.

A prototype is throwaway code that answers one question. A person runs it,
clicks through it, and says what feels wrong. The question decides the shape,
so the question comes first.

This skill is for a person who tries designs. To have agents build competing
versions of production code, suggest `h2xd:code-arena`. Only the user starts it.

## Steps

### 1. State the question

Write the question in one or two sentences. Name the module, page or flow it
is about. Take it from the user's request and the surrounding code. When the
user is around and the question is unclear, ask.

Then pick the branch:

| Question | Branch | Result |
|---|---|---|
| Does this logic, state model or data shape hold up? | [logic.md](logic.md) | One HTML file with buttons and guided scenarios |
| What should this look like? | [ui.md](ui.md) | Variants on one route, switched by `?variant=` |

When the question fits both and the user is away, pick by the code it touches.
A backend module gets logic. A page or component gets UI. Write the assumption
down, so it goes at the top of the prototype.

Done when the question and the branch are written down, and the user agreed or
the assumption is written down.

### 2. Check for precedent

Search the repo for a design that already answers a similar question. Look for
a state machine of the same kind, a page with the same job, or a recorded
decision.

```sh
node scripts/find-docs.ts --type Decision --search "<words>"
node scripts/find-docs.ts --search "<words>"
git grep -n "<words>"
```

When a record already decides the question, stop the skill and point to it.
Otherwise:

- **A precedent exists.** Build one prototype that follows it. Name the
  precedent at the top of the prototype.
- **No precedent.** Build two or three competing variants. They disagree on
  structure, such as different states, hierarchy or primary action. A variant
  that differs only in color, copy or naming is not a variant.

Done when you can name the precedent by path, or you named the searches that
found none and the variant count is set.

### 3. Build it

Follow the branch file. Both branches share these rules:

1. **Mark it throwaway.** Put the prototype next to the code it is for. Put
   `prototype` in every file or route name. Follow the project's routing and
   folder conventions.
2. **One step to run.** A logic prototype opens by double-click. A UI
   prototype starts with one task-runner command the project already has.
3. **State in memory.** When the question is about persistence, use a scratch
   database or file whose name contains `prototype`.
4. **No polish.** No tests, no abstractions for later. Handle errors only as
   far as it takes to keep the prototype running.
5. **Show the state.** After every action or variant switch, render the full
   relevant state.
6. **Domain words.** Labels use the words of the project glossary, as
   `h2xd:docs-glossary` defines it. Then a non-developer can drive it.

Done when the prototype runs with the one documented step and every variant
renders.

### 4. Hand it over

Give the user the file path, or the URL with each `?variant=` key, and the
command that starts it. Name what to watch for in each scenario or variant.

Listen for "that should not be possible", "I assumed X", and "the header from
B with the list from C". Those are the findings. Add the scenario, action or
variant the user asks for, and hand it over again.

Done when the user stated a verdict: a winner, a merge of parts, or a rejected
idea. When the user is away, done when the report says where the prototype is
and the question waits for them.

### 5. Capture the answer

1. **Keep the prototype off the default branch.** Create `prototype/<slug>`
   from the current commit. Commit only the prototype files there with
   `h2xd:git-commit`. The message gives the question and the verdict. Then
   switch back to the working branch. Pushing is public, so ask first.
2. **Fold the decision into real code.** On the working branch, rewrite the
   winner to production standard. The logic branch lifts its pure module. The
   UI branch rewrites the winning variant. The switcher and the losing
   variants stay only on `prototype/<slug>`.
3. **Record the verdict.** When an issue tracks the work, write a comment with
   the **Comment** operation in `docs/agents/issue-tracker.md`. Give the
   question, the verdict, the reason and the `prototype/<slug>` branch name.
   The comment follows `../setup-tone/github-text.md`. A comment is public, so
   show it first and post it only on a yes.
4. **Hand off hard-to-reverse choices.** Some verdicts settle a choice that is
   hard to reverse, surprising without context, and a real trade-off. For
   those, run `h2xd:docs-adr`. The losing variants are its considered options.

Done when the default and working branches hold no prototype file, the
`prototype/<slug>` branch exists, and the verdict is in its commit message and
in the issue, when one exists.

## Report

```
🔴 <question>: <blocked, and the next action>
🟡 <question>: prototype ready at <path or URL>, waiting for a verdict
🟢 <question>: <verdict>, kept on prototype/<slug>, ADR <number or "not needed">
```

## Do

- Write the question at the top of the prototype, where the user sees it.
- Build two or three variants when nothing in the repo answers the question.
- Keep logic in a pure module that the page only calls into.
- Put real data and the real page around a UI variant when a host page exists.
- Keep the full prototype on `prototype/<slug>` as the source of the decision.

## Don't

- Don't build variants that differ only in color, copy or names. Change the structure, or build one.
- Don't wire a prototype to real mutations or the real database. Use memory or a scratch store named `prototype`.
- Don't merge prototype code into production. Rewrite the winner with tests.
- Don't leave the switcher or losing variants on the working branch. Move them to `prototype/<slug>`.
- Don't use this to compare agent-built production candidates. Suggest `h2xd:code-arena` to the user.
- Don't keep a hard-to-reverse verdict only in a comment. Record it with `h2xd:docs-adr`.
