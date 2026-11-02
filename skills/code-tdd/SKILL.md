---
name: code-tdd
description: "Build a change test-first when the change is already clear. Agree the test entry points, then work in vertical slices of red, green and refactor through the public interface, and end with prove-tests. Use when the user asks for TDD, test-first work or red-green-refactor, or when code-debug needs the regression test for a known cause."
---

# TDD

A test written after the code checks what the code does, bugs included. When
`total()` forgets the tax, a test copied from its output expects the wrong
total too. A test written first fails until the code does what it should.

A good test fails before the change, passes after it, and survives a refactor
of the internals.

Tests follow the Tests section of `h2xd:code-quality`. The examples of good and
bad tests, and the rules for mocks, are in [`tests.md`](tests.md).

## Steps

### 1. Check the gate

Use this skill when the user asked for TDD, a failing test or a regression
test. Also use it when the code path has a cheap local test target. That is a
test file or runner that already covers the code, where one test runs in
seconds.

Skip the new test when it needs any of these:

- broad harness setup, or large fixture changes unrelated to the change
- mocks of the code you own
- slow end-to-end infrastructure, or state that exists only in production
- timing, or global state the test cannot control
- a reproduction nobody can state in one sentence

When you skip, say so in one line with the reason. No new test is better than
a bad one. Use the closest executable check instead, such as a targeted
script, a reproduction command, browser automation or a log assertion.

Run that check before and after the change, then go to step 8.

Done when you have said "test-first" or "skipped: <reason>, checking with
<command> instead".

### 2. Read the area

- Read the code you will touch and its existing tests.
- For each file, run `node scripts/find-docs.ts --links-to <path>`. Follow the
  decision records it lists.
- Name tests and interfaces with the glossary's words, per `h2xd:docs-glossary`.
- Find the test command in the agent instructions file, or run
  `jq -r .mutation.testCommand agents.config.json`.

Done when you can name the public interface, the test file the new tests go
in, and the command that runs them.

### 3. Agree the test entry points

A test entry point is the public interface you test at. There, a caller sees the
behavior without reaching inside. Tests go only at test entry points the user
confirmed, so the effort lands on critical paths and complex logic, not on
every edge case.

Propose the test entry points. For each, write one line on what it catches and
one line on what it misses. Then list the behaviors to test at each one, in
order, one line each. For a bug, the first behavior is the bug's reproduction.

When the interface itself is in question, such as how deep the module is or
what it exposes, settle it with `h2xd:code-quality` first. Then ask with
clickable options, through the CLI's question tool, such as AskUserQuestion:

- accept the test entry points and the list, the recommended option
- change them
- test elsewhere

Done when the user confirmed the test entry points and the list of behaviors.

### 4. Red

Take the next behavior on the list. Write one test for it at its test entry
point, and run it.

Take the expected value from the spec, a worked example or a known literal.
Never take it from the code.

Done when the new test fails, and the failure message names the missing
behavior. When it passes, or fails for another reason such as a typo, a
missing import or a broken fixture, fix the test and run it again.

### 5. Green

Write the least production code that makes the test pass. Write no code for a
later behavior on the list. For a bug, make the smallest change that restores
the intended behavior and keeps the nearby contracts.

Done when the new test and every other test in the file pass.

### 6. Refactor

With the tests green, clean up the code you just wrote by the bar in
`h2xd:code-quality`. Remove duplication, rename with the glossary's words, and
collapse one-caller wrappers. Change no behavior and no test.

When this slice taught you something about the next behavior, update the list.

Done when the full test command passes and the diff of this step changes no
test. Then return to step 4 for the next behavior, until the list is empty.

### 7. Prove the tests

Run `h2xd:prove-tests` on the change. It plants plausible bugs in the changed
lines and reports each one no test catches. When it offers the missing tests,
write each one through the same test entry points. Skip this step when the
caller runs prove-tests on the whole branch later, as `h2xd:code-implement`
does.

Done when prove-tests reports no surviving mutant that breaks a behavior on
the list, or the user chose to stop at its report.

### 8. Report

Report the evidence, worst first:

```
🔴 <behavior>: <no failing-before evidence, and why>
🟡 <behavior>: <skipped or weak check, and the check used instead>
🟢 <behavior>: <test name> failed with "<message>", passes after the change
```

End with one line for the prove-tests result: killed, survived, equivalent.

Done when every behavior on the list has a line.

## Do

- Check the gate first, and say why when you skip the test.
- Confirm the test entry points with the user before the first test.
- Work one behavior at a time: one test, one change, then the next.
- Run each new test before the fix, and read why it fails.
- Mock only at system boundaries: external services, time, randomness.
- For a flaky bug, control the clock, the seed or the order so the test fails every run.

## Don't

- Don't write all the tests first and the code after. Write one test, make it pass, then write the next.
- Don't test private functions or check mock call counts. Assert what a caller can observe at the test entry point.
- Don't compute the expected value the way the code does. Use a literal or a worked example.
- Don't change a test to match wrong code. Fix the code, or confirm with the user that the behavior changed.
- Don't weaken an existing assertion to make a test pass. Find out why it fails.
- Don't mock a module you own. Use the real one, or a fake where the system meets the outside.
