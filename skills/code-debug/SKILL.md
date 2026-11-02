---
name: code-debug
description: "Find and fix a bug whose cause is not known yet, or a performance regression. Build a command that goes red on the bug, narrow it to the first place the system went wrong, fix it there, and lock it with a regression test. Use when something is broken, throwing, failing, flaky or slow, or the user says debug or diagnose."
---

# Debug

Reading the code tells you where a bug could be. A command that goes red tells
you where it is. This skill builds that command first, then fixes the fault
where it starts.

The **loop** is one command that runs the bug's code path and fails on the
user's symptom. The **root cause** is the first place the system did something
it should not do, or failed to handle a state it should handle.

## Redact

Show every secret as `<REDACTED>`. The loop reads credentials from the
environment. Quote only the artifact lines that carry the signal.

## Steps

### 1. Build the loop

Read the area first with `node scripts/find-docs.ts --search "<words>"` and
`node scripts/find-docs.ts --type Decision --links-to <path>`. Use the terms
from `h2xd:docs-glossary`. Then build the loop. [`loops.md`](loops.md) lists ten
ways to build one, how to tighten it, and what to do for flaky bugs, slow code
or no loop.

The loop must be all four of these.

- **Red-capable.** It asserts the user's exact symptom, not "it runs".
- **Deterministic.** Same verdict every run, or a high, pinned failure rate.
- **Fast.** It runs in seconds, not minutes.
- **Unattended.** A person joins only through `hitl-loop.template.sh`.
Done when you have run one named command and shown its redacted output.

### 2. Reproduce and minimize

Run the loop several times. Check that it fails with the user's symptom, not a
nearby failure. Record the exact error, output or timing.

Then shrink the scenario. Remove one input, caller, config value, data row or
step at a time, and run the loop after each cut. Keep the cuts that stay red.
Done when removing any remaining element turns the loop green.

### 3. Hypothesize

Write three to five ranked hypotheses before you test any. A single hypothesis
locks you onto the first idea that looks right. Give each one a prediction in
this form.

> If <X> is the cause, then changing <Y> makes the bug disappear, and changing
> <Z> makes it worse.

Discard or sharpen a hypothesis with no prediction. Show the ranked list to the
user, who may know that one is ruled out. When the user is away, do not wait.
Done when each hypothesis has a prediction and the user has seen the list.

### 4. Probe

- Test one prediction at a time, and change one variable per run.
- Prefer a debugger or a REPL. Otherwise log at the boundaries that separate
  two hypotheses. Never log everything and search the output.
- Tag each debug log with one unique prefix, such as `[DEBUG-a4f2]`, so cleanup
  is one search.
- Read the actual error and the actual state. Do not guess.
Done when one hypothesis predicted the result and the others did not.

### 5. Find the root cause

The confirmed hypothesis names where the symptom comes from. That is often not
the root cause. Ask "why" at each step until the answer is a wrong decision in
the code, not a consequence of an earlier one.

Then ask whether the state that triggered the symptom is legitimate.

- **The system may be in that state.** The code that broke on it is the root
  cause. Handling the state there is the fix.
- **The state should never exist.** A guard where it broke hides the bug. Find
  the code that produced the state and fix that.

Guards, retries, swallowed errors, clamped values and discarded state are the
usual ways a fix hides a bug. When the bug appears only after a restart, check
persisted state first, such as config files, caches and lock files. Search
the codebase for the same fault and list every instance.
Done when you can name the file and line of the first wrong decision, say
whether the triggering state is legitimate, and list every instance.

### 6. Fix with a regression test

A seam is correct when a test there triggers the bug the way the call site
does. When the only seam is too shallow, such as one caller when the bug needs
two, skip the test and report the missing seam. With a correct seam, follow
`h2xd:code-tdd`.

1. Turn the minimized repro into a test at that seam.
2. Run it and watch it fail with the recorded symptom. When you forced the
   failure by editing code or a fixture, `diff` against a clean copy to prove
   the edit landed.
3. Fix the root cause and every other instance. Hold the change to
   `h2xd:code-quality`.
4. Run the test and watch it pass. Run the original loop from step 1 on the
   unminimized scenario.

When two fixes that share one premise have failed, stop fixing. The premise is
the one sentence every failed fix assumed. Write it down.

- **Test it.** Find an observation that comes out differently when the premise
  is false, and make it. Look at how the failures are spread, not only how
  large they are.
- **Follow the result.** When the evidence contradicts the premise, go back to
  step 3 with what the failures share. When it confirms the premise, go back
  to step 5 and ask the next "why".
Done when the regression test passes, or the missing seam is written down, and
the original loop is green.

### 7. Clean up and report

Remove every hit for the debug prefix and the throwaway harnesses. When the
deciding fact took a deep search, propose a cheap, always-on signal, such as a
log line. Commit per `h2xd:git-commit`: the root cause as the `cause` token in
the body, the ruled-out hypotheses as `rejected` in the footer.
Done when a search for the debug prefix finds nothing and the report exists.

## Report

```
🔴 <item>: <what is still broken, and the next action>
🟡 <item>: <what is partial, such as a missing seam or an unfixed instance>
🟢 <item>: <what is done>
```

Cover the loop, the root cause at file and line, each instance, the test and
any proposed signal.

## Do

- Keep the user's exact symptom as the assertion, from the loop to the test.
- Change one variable per probe.
- Fix every instance of the fault, not only the one the user hit.

## Don't

- Don't hypothesize without a loop. Build one, or ask for access or an artifact.
- Don't guard a state that should never exist. Fix the code that produced it.
- Don't write a third fix on a premise two fixes failed on. Test the premise.
- Don't test at a seam that cannot reproduce the bug. Report the missing seam.
- Don't justify a workaround with a long comment. Fix the code it works around.
