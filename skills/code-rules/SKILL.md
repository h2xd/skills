---
name: code-rules
description: "How an agent works, as opposed to how the code looks: when to ask, keeping the context small, scripts over hand edits, checkable steps, parallel work, rewrites and failed fixes. Use at the start of any task larger than a one-line edit, before asking the user something, and when a second fix fails the same check."
---

# Working rules

Picture an agent that asks before every choice, reads every file into one
context and edits forty files by hand. Then it tries the same idea a third
time. Its code can be good, and it still wastes the user's afternoon.

These rules cover how to work. `h2xd:code-quality` covers what the code looks
like. Read both before non-trivial work, and let the repo's agent instructions
file win on conflict.

## Asking

The user supervises later, not live. A wrong reversible choice costs a review
comment. A blocked agent costs the whole wait.

- **Proceed on reversible work.** Writing code, editing docs, splitting an
  issue and choosing between two equal designs need no permission. Do the work,
  then say what you chose and why.
- **Confirm before an irreversible or public action.** Force-pushing,
  deleting data, merging, posting to the tracker or chat, sending email and
  spending money wait for a yes.
- **Ask about product direction.** What to build, for whom, and what to drop
  belong to the user. How to build it belongs to you.
- **Ask well when you must.** Ask with clickable options, through the CLI's
  question tool, such as AskUserQuestion. Ask at most four questions, with your
  recommendation first. Keep working on everything the answer does not block.
- **Note problems you are not fixing now.** Write them in your report or as an
  issue with the tracker operations in `docs/agents/issue-tracker.md`. Fix them
  in the next round instead of stopping.

## Context

A full context window reasons worse and loses facts to compaction.

- **Size each phase.** Cap the files one phase touches. Plan a phase so it ends
  before the context is half full.
- **Read the part you need.** Search first, then read the matching lines.
  Redirect long command output to a file in the scratchpad and search it.
- **Send bulk to a subagent.** Wide searches, long logs and many-file reads go
  to a subagent. Start it through the CLI's subagent tool, such as `Agent`. It
  returns a summary with paths, not the raw text.
- **Hand off before the window runs out.** Run `h2xd:session-handoff`.

## Tools over hand edits

When the work is larger than a couple of edits you can see at a glance, write
the tool that does it or proves it. That is a codemod for edits, a generator
for repeated files, a query for analysis, or a check that reruns.

A script works the same way every time, and a reviewer reruns it instead of
trusting you. A one-off change earns a script when the script makes it
checkable. The bar is size, not repetition.

- Do the first unit by hand to learn the recipe. Then write the script, run it
  on that unit, and diff its result against your hand edit.
- Make the script safe to rerun on work it already did.
- Run one script over every unit yourself. Don't split hand edits across
  subagents.
- When subagents must share a recipe, write it as one brief file with the
  steps, the check each unit must pass, and the files they must not touch.
  Keep that file outside their write scope.
- Write the smallest script that does the job. Commit it when the work
  outlives the session.

## Sequencing

A break found at the unit that caused it is cheap to locate. A break found
after a batch is buried under work built on it.

- **Small units, each checked.** Each unit starts from a passing state, makes
  one change and runs the check. Start the next unit only when the check passes.
- **Start from a clean base.** Rebase onto the main branch before the first
  unit, so every check measures against the real baseline.
- **Commits tell the story.** Order commits so a reviewer can replay them: the
  failing test before the fix, the removal before the reshape, the baseline
  measurement before the change, the shared code before the feature. Each
  commit builds and passes alone. Write each message with `h2xd:git-commit`.

## Parallel work

Concurrent writes to one file, branch or key fail intermittently and are slow
to debug. A rule in a brief that says "take turns" does not prevent them.

- **Remove the shared target first.** Ask whether the workers need one object
  or are each reporting their own facts. Give each worker its own file, key,
  branch or worktree. Merge their results when you read them.
- **Serialize in the structure when sharing is real.** Use a lockfile,
  sequential phases, a single writer, or an atomic compare-and-swap.

## Product trade-offs

The consumer is whoever uses the work: the person using the UI, the colleague
importing the library, the engineer who maintains it next. When implementation
convenience conflicts with the consumer's experience, choose the experience.

- Justify every feature, control and option. Three finished features beat ten
  rough ones.
- Get the details right: feedback, error states, empty states, alignment.
  Cut what does not serve the main workflow.
- Settle an open design question with `/h2xd:plan-prototype` before writing
  production code.
- Explain the impact of a choice from the consumer's side.

## Rewrites and migrations

In a planned rewrite, aim for the end state. Code written only to keep each
intermediate step working tends to stay.

- Write the phases down first and name where temporary breakage is allowed.
- Converge on the target design. Do not write adapters that only keep a
  passing intermediate state alive.
- Keep fast checks on the areas you are touching during the migration.
- Finish only when the full typecheck, the tests and the real program pass.

## Failed fixes

Each failed fix is evidence against the premise it assumed. When two fixes on
one premise fail the same check, test the premise before a third fix.

- **Write the premise down.** It is the one sentence every failed fix assumed.
- **Test it directly.** Find an observation that comes out differently if the
  premise is false, and make it with a check you can rerun. Look at how the
  failures are spread, not only how large they are.
- **Follow the result.** When it contradicts the premise, look for what the
  failures share that the premise did not predict. When it confirms the
  premise, ask why once more. The earlier fixes may have treated a consequence.
- **Remove the cause.** Change what produces the failure instead of adding a
  step that cleans up after it. For a full diagnosis, run `h2xd:code-debug`.

## Do

- Make reversible choices yourself and report them with the reason.
- Send wide reads and long output to a subagent or a file, and keep summaries.
- Write a rerunnable script for edits or checks larger than a glance.
- Check each unit before starting the next, and order commits as proof.
- Give each parallel worker its own file, branch or worktree.

## Don't

- Don't ask "should I do X?" about reversible work. Do X and explain why.
- Don't read a whole large file into the main context. Search, then read the lines you need.
- Don't split hand edits across subagents. Run one script over every unit.
- Don't add a lock before asking whether the sharing can go. Separate the targets first.
- Don't keep intermediate states alive with throwaway adapters in a planned rewrite. Converge on the target.
- Don't write a third fix on a premise two fixes failed on. Write the premise down and test it.
