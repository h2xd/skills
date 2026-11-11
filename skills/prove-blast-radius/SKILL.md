---
name: prove-blast-radius
description: "Find what a change could break outside its diff, and prove the fact that makes it safe by running real code. Reports confirmed, open and cleared risks. Use when asked what a change could break, for a small diff you don't trust, or as Reviewer E of review-pr."
argument-hint: "[base branch, PR number, or files]"
---

# Blast radius

A change breaks things the diff does not show: a client that parses the old
JSON, a cache entry written by the last release, a library that behaves
differently at the pinned version. Listing the callers is not the job. A search
finds those in a second. The job is the breakage a search will not show.

A write-up that sounds right reads the same whether or not it is true. So the
result is not the write-up. Find the one or two facts the change's safety rests
on, and prove them by running code.

## How sure you are

Take each fact as far down this list as is cheap. Say where it stopped.

1. **Said.** You stated it. Worth nothing alone.
2. **Pointed.** You cited a real `file:line`, or the library's own source.
3. **Walked.** You traced the bad case step by step, and it does not get there.
4. **Ran.** A script or test calls the real code and fails loudly when you are wrong.
5. **Reproduced.** You saw it in the running app.

Level 4 is usually one small script. It calls the exact function in the library
the app ships, at the pinned version.

## Modes

- **Report only.** Use it when the caller says so, as Reviewer E of
  `h2xd:review-pr` does. Change nothing in the repo. Write findings to the
  findings file the caller names, in the shape of the caller's reviewer brief.
- **Chat.** Otherwise, step 6 gives the report in chat.

`$WORK` is a directory in your scratchpad. Proof scripts live there, never in
the repo tree.

## Steps

### 1. Read the change

Take the caller's diff or files. With a PR number, run
`gh pr view <n> --json title,body,commits,baseRefName` and `gh pr diff <n>`.
Otherwise take `git diff <base>...` and `git diff HEAD`, base `main` by default.
Read `git log <base>..HEAD` for the stated intent.

List every symbol the change adds, changes or deletes. Then list what now
behaves differently even where the diff does not say so: a default, an order,
a timing, an error type, a return shape, a stored format.

Run `node scripts/find-docs.ts --links-to <path>` for each changed file. Read
every decision record it prints. A change against an accepted record is a risk.

Done when each changed behavior is a line with its `file:line`.

### 2. Find the fact it is safe because of

Most risky-looking changes are safe because of one fact. For example, "this
call only drops cache entries that are already expired, and does nothing else".
When that fact holds, most of the risks go away at once.

When no single fact covers the change, name the two that do. When none exists,
say so. That is a finding.

Done when the fact is one sentence, with the risks it clears listed under it.

### 3. Look where a search stops

Work through [`where-search-stops.md`](where-search-stops.md). Skip a row that
cannot apply, and say why in one line. For each row that applies, read the code
or the library source, not its docs.

Done when every applicable row has a result: a `file:line`, or the exact search
command that found nothing.

### 4. Weigh each risk

For each risk, name how it breaks, the inputs or state that trigger it, how
likely that is, and what it costs. Sort each risk into one of three groups:

- **Confirmed.** The breakage is real, with a `file:line`.
- **Cleared.** It cannot happen, with the reason. A search that found nothing
  is a reason. Write it down with its command.
- **Open.** You could neither confirm nor clear it. Name the check that would.

Done when every risk is in one group, with its `file:line`, reason or check.

### 5. Prove the fact

Write a script in `$WORK/blast-radius/` that runs the real code in the repo's
own runtime. It imports the module or library the app ships and calls the
function in question with the input that would break it. It exits non-zero when
the fact is false. Run it and keep the output.

Prove the worst confirmed risk the same way when it is cheap. A failing script
is the strongest finding you can give.

When the code needs a database, a network service or credentials, stop at
level 3. Mark the fact **unproven**, and name the check that would prove it.

Done when the output is saved next to the script, or the fact is marked
unproven with the level it reached.

### 6. Report

**Report only.** Write each confirmed risk, each open risk and each unproven
fact as a finding, numbered `E-1`, `E-2` and on, in the findings file that
the reviewer brief describes. Fill every field it asks for.

- `file` and `lines` mark the breakage in the PR head version, even outside the diff.
- Use `red` for a breakage shown at level 3 or higher, with concrete inputs.
- Use `yellow` for a confirmed risk below level 3, an open risk, or an unproven fact.
- Paste the proof command and its output into `body`, with the change or the
  check that settles an open risk.
- In `status`, add `safety fact: <sentence> (level <n>)` and `cleared: <n>`,
  one string each.

**Otherwise**, answer in chat:

```
What it does: <the change, including the part that isn't obvious>
Safe because: <the fact> (level <n>, proof <path or "unproven">)
🔴 <file:line>: <how it breaks, inputs, cost, how to check>
🟡 <file:line>: <risk not yet confirmed or cleared, and the check>
🟢 <what was checked>: <why it is fine>
Before merge: <the cheapest test or repro, with the script path>
```

Write the prose to the rules in `../add-soul/SKILL.md`, read by path.

Done when the safety fact has a level, every risk has a line, and every 🔴 has
proof output.

## Do

- Spend most of the time on the one fact, not on a long list of maybes.
- Read the library source at the version in the lockfile, with any local patch.
- Quote proof output exactly, with the command that produced it.
- In chat mode, offer a second pass on another model tier for a wide change across packages or a shared contract. Merge the results, because different models catch different bugs.

## Don't

- Don't hand back a write-up you did not test. Run a script, or mark the fact unproven.
- Don't list callers as the result. Say which caller breaks, and how.
- Don't invent a caller, a field or an API. Cite the `file:line`, or say the search found nothing.
- Don't run a proof that writes to a shared database, queue or remote service. Stop at level 3 and name the check.
- Don't put the proof script in the repo tree. Keep it in `$WORK`, and offer it as a test in the report.
