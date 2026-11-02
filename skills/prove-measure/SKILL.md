---
name: prove-measure
description: "Vet a measured number before you report or act on it. Run both sides alternating, find what limits the number, and rule out errors, skipped work and noise. Use before a benchmark or eval, and before trusting, reporting or committing a speedup, latency, throughput or score."
argument-hint: "[claim or benchmark command]"
---

# Measure

The new endpoint is 40 times faster. Then someone reads the log, and every
request returned a 500 in two milliseconds. A number answers the question its
script asked, which is often not the question you meant.

Ask first why the result is not twice as good. Until you can name what bounds
it, you do not know what you measured.

**Ballpark.** When the user asks for a rough figure, one run is enough. Still
do step 3's error count and work check, and say it is one run. A choice
between options is never a ballpark.

**Eval scores.** Read "side" as model, prompt or configuration, and "run" as
trial. Ask the same questions: did every trial do the task, does the gap hold
across trials and models, and does the scenario matter to a user.

## Steps

### 1. Write the claim and the decision

Write the sentence you expect to ship, with its unit, percentile and data, for
example "export is 30% faster at p50 on the 60k-row dataset". Next to it,
write the result that would change the decision, and the noise floor you
expect. The steps below test that sentence.

Done when the claim, deciding result and noise floor are written before any run.

### 2. Read the measurement script and the machine

Read the measurement script. Note what it times, what it counts, and what it
ignores. Check the load with `uptime`, and the cores with `nproc` or
`sysctl -n hw.ncpu` on macOS.

When the machine is busy, find out what runs. When you cannot stop it,
alternate the sides so both see the same noise. Say so in the report.

Done when you can say what the timed region holds and what else runs.

### 3. Run, count errors, confirm the work happened

Run each side at least 5 times, in the order A, B, A, B, so warmup, caches
and drift favor neither. Record the median and the range.

- **Errors.** Count failures and non-success responses, and check that outputs
  are correct, not only present. Rejections are fast, and timeouts and retries
  are slow. When the script does not count errors, add the count.
- **Work.** Confirm the work ran inside the timed region: the request reached
  the server, the rows were written, the bytes were read, the code used the
  result. Generators nobody iterates, promises nobody awaits, and results the
  JIT discards produce numbers for work that never happened.

Done when each side has 5 or more runs with median and range, an error count,
and evidence the work ran.

### 4. Find the limiter

Name the resource or code path that bounds the result: a core, a lock, the
disk, the network, or the load generator itself. Take it from a profile or
system counters, in a run you do not report, because profilers slow the work.
A guess from reading the code is not a limiter.

Read per-process CPU with `top` or `pidstat`. Profile with `node --cpu-prof`,
`py-spy` or `perf`. Check I/O wait, count syscalls with `strace -c` on Linux,
and map the hot spot to source.

When the load generator saturates first, you measured the load generator.
When a change did not move the number, the limiter shows why.

Done when a profile or counter shows the limiter you name.

### 5. Check tuning, limits and relevance

- **Tuning.** Run every side the way production runs it: release builds,
  production flags and env, batching, connection pools, cache state, versions
  and data. When the limiter is a setting, such as a commit per row, a debug
  build or a missing index, that side is untuned. Tune it and measure again.
- **Untuned side.** When you cannot tune a side, pick no winner from that run.
  Narrowing the claim to today's settings does not fix this when the user is
  choosing what to adopt.
- **Limits.** Compare bytes per second with disk and network bandwidth, and
  operations per second times cost per operation with the cores. Removing a
  piece that takes 10% of the run makes the run at most about 11% faster. A
  result past a limit measured a cache, a no-op or a bug.
- **Relevance.** Next to a micro result, measure the end-to-end path a user
  waits on, with realistic data sizes and concurrency. Report the micro result
  as a share of the whole. A helper that takes 1% of a request can make the
  request at most 1% faster.

Done when each side ran tuned, inside the limits, with the end-to-end share known.

### 6. Give the verdict

Pick one: faster, slower, no measurable difference, or inconclusive. A gap
smaller than the run-to-run range is no measurable difference. When the call
is close, use a rank-sum test or the measurement script's own statistics.

Call it inconclusive when you cannot name the limiter, when a side ran
untuned, or when step 3's error count or work check is missing.

Done when the verdict is one of the four words, and each check from steps 3
to 5 has evidence or names the gap that made the verdict inconclusive.

### 7. Report and record

Report in the format below. Put the full runs, the range and the limiter
evidence in a notes file, or in an issue through the **Comment** operation in
`docs/agents/issue-tracker.md`. The comment follows `../setup-tone/github-text.md`.

A PR body carries one primary number. When a commit rests on the number, put
it in the commit body as the `measurement` token of `h2xd:git-commit`. Give
the number, its unit, the run count, and what produced it.

Done when the report is written, the evidence has a home a later session can
find, and any commit that rests on the number carries it.

## Report

Lead with the verdict, then the number with its unit, run count, range and
limiter, then one line per check, worst first:

```
Verdict: faster. p50 41 ms to 33 ms, median of 7 runs per side, range 32 to 35 ms after, bound by JSON parsing on one core.
🔴 <check>: <what is missing, and the run that would fill it>
🟡 <check>: <what holds with a caveat>
🟢 <check>: <what the evidence shows>
```

## Do

- Write the deciding result before the first run.
- Alternate the sides in every multi-run comparison.
- Profile in a separate run, and report only unprofiled runs.
- Keep the run count, range and limiter with the number wherever it goes.
- Stop and say so when the run-to-run range is larger than the effect.

## Don't

- Don't name a limiter from reading the code. Take it from a profile or counter.
- Don't compare a tuned side with one on defaults. Tune both, or pick no winner.
- Don't report a single run as a result. Run 5 or more, or label it a ballpark.
- Don't trust a time saved larger than the time the changed piece took. Find the cache, no-op or bug.
- Don't call a change useless because the number did not move. Find the limiter first.
- Don't commit on a number without it in the body. Add it as the `measurement` token of `h2xd:git-commit`.
