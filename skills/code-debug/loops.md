# Feedback loops

A feedback loop is one command that runs the code path of the bug and reports
pass or fail on the user's symptom. Step 1 of `SKILL.md` builds one. This page
lists the ways to build it and how to make it tight.

## Ways to build a loop

Try them in this order. Take the first one that reaches the bug.

1. **Failing test** at the seam that reaches the bug: unit, integration or
   end to end.
2. **HTTP script** with curl or a short script against a running dev server.
3. **CLI run** with a fixture input. Diff stdout against a known good snapshot.
4. **Headless browser script**, for example with Playwright. Drive the UI and
   assert on the DOM, the console or the network.
5. **Replayed trace.** Save a real request, payload or event log to disk.
   Replay it through the code path on its own.
6. **Throwaway harness.** Start the smallest part of the system that reaches
   the bug, one service with mocked dependencies, and call it once.
7. **Property or fuzz loop.** When the output is sometimes wrong, run 1000
   random inputs and look for the failure.
8. **Bisection harness.** When the bug appeared between two known states,
   such as two commits, datasets or versions, script "boot at state X, check"
   and run it with `git bisect run`.
9. **Differential loop.** Run one input through the old and the new version,
   or through two configs, and diff the outputs.
10. **Human in the loop.** The last resort, when a person must click. Copy
    [`hitl-loop.template.sh`](hitl-loop.template.sh), edit its steps, and run
    it. The person follows the prompts and the script prints what they saw as
    `KEY=VALUE` lines for you to read.

## Tighten the loop

Once a loop runs, make it tight. Ask three questions.

- **Faster?** Cache setup, skip unrelated startup, run only the tests that
  reach the bug.
- **Sharper?** Assert on the exact symptom, not on "did not crash".
- **Deterministic?** Pin the clock, seed the random generator, isolate the
  filesystem, block the network.

A loop that takes 30 seconds and flakes is barely better than none. A loop
that takes 2 seconds and gives the same verdict every run is tight.

## Bugs that do not reproduce every run

Raise the reproduction rate. A clean repro is not the goal yet.

- Run the trigger 100 times, or in parallel.
- Add load, narrow the timing windows, or insert sleeps.

A bug that fails half the runs can be debugged. A bug that fails one run in a
hundred cannot yet, so keep raising the rate.

## Performance regressions

Logs rarely help here. Measure a baseline first with a timing harness, a
profiler or the query plan. Then bisect between the fast and the slow state.
The loop asserts on the measured time, with a threshold between the two.

## When no loop can be built

Stop and tell the user. List what you tried. Ask for one of these:

- access to an environment that reproduces the bug,
- a captured artifact with secrets redacted, such as a HAR file, a log dump, a
  core dump or a screen recording with timestamps,
- permission to add temporary instrumentation in production.

Do not form hypotheses without a loop.
