---
name: plan-sharpen
description: "Make a task deeper, not bigger. Name what an expert would add, what they would start from and how they would check it, then rewrite the prompt to ask for exactly that. Use when the user says \"sharpen this\", \"make this prompt better\" or \"go deeper\", or a task reads shallow before work starts."
---

# Sharpen

"Make the checkout page faster" gets you a guess at the slow part and a tweak.
A performance engineer starts from real user traces, profiles the slowest step,
and proves the fix with a p95 number before and after. Sharpening finds that
move and rewrites the prompt to ask for it.

A prompt usually asks for the first version of a task that came to mind. It
starts from digested material, names no method, and trusts the person or the
model to say when it is right.

The task gets deeper. It does not get bigger. Deeper means the same
deliverable, done the way an expert does it. Bigger means more deliverables, so
drop an added deliverable, or offer it as a separate task.

## Steps

### 1. Take the task

Take the prompt the user names. When they name none, take their last task
message. Write its goal in one sentence, and list what it asks for: the
deliverable, the inputs it gives, and any method it names.

Done when the goal sentence and the list exist, and the user's wording is
quoted where it matters.

### 2. Look up the facts

Find what the task touches before you answer anything:

- In a repo set up with `h2xd:setup`, run `node scripts/find-docs.ts <topic>`
  and read the pages it returns.
- Read the glossary entries for the words the prompt uses. `h2xd:docs-glossary`
  says where the glossaries live.
- Read the code, data or files the prompt names.
- For a long search, start a subagent with a fresh context, through the CLI's
  subagent tool, such as Agent.

Done when every fact the four answers rely on comes from a file, a command or
a source you can name.

### 3. Answer the four questions

Answer each one for this task, in this field. Name real things: a file, a
dataset, a command, a tool, a technique. A generic answer such as "write tests"
or "check the docs" fails this step.

1. **The professional's move.** What would a top professional in this field do
   here that the prompt does not ask for? One to three moves, each one a
   change to how the task is done.
2. **The raw material.** What would they start from instead of what has
   already been digested? Logs over a summary of the logs, the source over the
   docs, the dataset over the dashboard, the user's session over a ticket about
   it, the spec over a blog post about the spec.
3. **The methods and tools.** Which specific methods and tools would they use?
   Name the technique and the tool, and say what each produces.
4. **The outside check.** What, other than you or the user, would show the
   result is right? A test that fails before and passes after, a benchmark
   number, a reference implementation, a spec, a real user, a second source.
   Say what result counts as a pass.

Then test each answer. When it adds a deliverable, drop it or move it to a
"separate task" line.

Done when all four answers name real things, and none of them adds a
deliverable.

### 4. Sort out the open decisions

List every choice the sharpened task leaves open that only the user can make:
scope, priority, a trade-off, taste, budget, who the result is for. Leave each
one open. A fact you can look up is not a decision. Look it up in step 2.

Done when each open decision is a question with two to four options, your
recommendation first, or the list is empty.

### 5. Rewrite the prompt

Write the new prompt so a fresh agent can run it without this conversation.
Use this order, and leave out a part that is empty:

```
<goal in one sentence>

Start from: <the raw material, with paths or sources>
Method: <the professional's moves, methods and tools>
Done when: <the outside check and what counts as a pass>
Deliver: <the same deliverable the original asked for>
Open: <each open decision, marked {DECIDE: question}>
```

Keep every constraint the original had. Mark each open decision in place as
`{DECIDE: <question>}`. Do not fill it with your recommendation.

Done when the prompt has a goal, raw material, a method, an outside check and
the original deliverable, and every open decision is marked.

### 6. Hand off the open decisions

Show the user the four answers, then the new prompt in a code block, then a
"Separate tasks" line when step 3 moved any there.

When the prompt has a `{DECIDE: ...}` mark, run `h2xd:plan-grill` on the open
decisions from step 4. When grill closes, replace each mark with the answer
the user confirmed, and show the final prompt.

Do not start the task. The user decides when to run the prompt.

Done when the user has the final prompt with no `{DECIDE: ...}` mark left, or
has stopped grill and has the prompt with the marks still in it.

## Do

- Ground each answer in a file, a command or a source you read in step 2.
- Name the raw material by path, URL or system, not by kind.
- Give the outside check a concrete pass condition, such as a number or a test
  name.
- Keep the original deliverable and every constraint the user set.
- Read `../add-soul/SKILL.md` and apply it to the new prompt before you show
  it.

## Don't

- Don't add deliverables. Move them to a "Separate tasks" line.
- Don't decide a choice that belongs to the user. Mark it `{DECIDE: ...}` and
  hand it to `h2xd:plan-grill`.
- Don't ask the user a fact you can look up. Look it up in step 2.
- Don't name yourself or the user as the check. Name a test, a number, a spec
  or a third party.
- Don't run the sharpened task. Hand over the prompt and stop.
