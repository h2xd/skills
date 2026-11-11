---
name: prove-tests
description: "Check that the tests would catch a wrong change. Plant plausible bugs in the changed lines, run the tests, and report each survivor with a sketch of the test that would kill it. Use after writing tests for logic, before review, or as Reviewer D of review-pr."
argument-hint: "[files or base branch]"
---

# Prove tests

Flip `total > limit` to `total >= limit`, run the suite, and watch it stay
green. That green run is a missing test. This skill plants the bugs a person
could plausibly write, called mutants, and reports every one no test notices.

Each survivor marks a behavior nothing pins down. The test that kills it is
the next one to write.

## Settings

Read the `mutation` block with `jq .mutation agents.config.json`. The scripts
in `scripts/` come from `h2xd:setup`. `prove-tests.sh` needs only `sh` and
`git`. `$WORK` is a directory in your scratchpad.

When the file is missing, or `enabled` is `false`, say so. Ask whether to run
once with runner `sh` and the test command the agent instructions file names.
In report-only mode, run once that way without asking.

**Report only.** When the caller says so, as Reviewer D of `h2xd:review-pr`
does, write findings and change nothing. The run then ends with step 5.

## Steps

### 1. Scope

Take the caller's files or diff. Otherwise take the diff against the base
branch, `main` by default, with the working tree and untracked files:
`git diff --unified=0 <base>...`, `git diff --unified=0 HEAD`, and
`git ls-files --others --exclude-standard`.

Keep added or changed lines in source files. Drop test files, generated code,
type-only files, config, docs, and paths that match a `mutation.exclude` glob.

Count the **logic lines**, the lines that compute, branch, call or return. The
budget is `ceil(logic lines / linesPerMutant)`, clamped to
`minMutants`..`maxMutants`. One file gets at most `ceil(budget × maxFileShare)`.

**Test-only change.** When there are no logic lines but new or changed tests,
mutate the code those tests exercise. Plant two mutants per new test.

Done when you can list each file with its changed line ranges and the budget.

### 2. Pick the mutants

Read each changed hunk and its callers. Rank the places by what a missed bug
costs, such as branches, error handling, boundaries, money, auth and data
writes. When the caller passed linked issues, rank first the lines that
implement an acceptance criterion. Pick one mutant per place from
[`mutants.md`](mutants.md).

**Runner `sh`.** Write each mutant as a unified diff against the working tree,
`$WORK/mutants/NNN.patch`. List each in `$WORK/mutants.md` with its id,
`path:line`, kind, the one-line change, and the acceptance criterion it breaks.

**Runner `native`.** The tool makes the mutants, and you pick where. Fill
`{ranges}`, as `path:start-end,...`, and `{files}` in `nativeCommand`.

Done when each patch passes `git apply --check`, plus `--unidiff-zero` when
it has no context lines, or `nativeCommand` is filled.

### 3. Run

Runner `sh`. Leave out `--check` or `--setup` when its setting is `null`:

```sh
sh scripts/prove-tests.sh --mutants $WORK/mutants --test "<testCommand>" --check "<checkCommand>" --setup "<setupCommand>" --timeout-factor <timeoutFactor> --out $WORK/results.tsv
```

The script works in a throwaway worktree that copies your uncommitted work.
Each line of `results.tsv` holds the id, a status and the seconds.

- `killed` or `timeout`: the tests failed or ran too long. Both count as killed.
- `survived`: the tests passed, so no test noticed.
- `invalid`: the patch did not apply, or `--check` failed on it. Drop it.
- Exit 3, a `baseline red` line: the tests fail before any mutation. Stop and
  report one 🔴 that names the failing command.
- Exit 2: a usage error, or the setup command failed. Fix it and run again.

Runner `native`:

```sh
sh scripts/prove-tests.sh --native "<filled nativeCommand>" --setup "<setupCommand>"
```

It prints `worktree`, a tab and the path. Read the tool's report there, and
keep only mutants on your ranges. Then run `git worktree remove --force <path>`.

Done when every mutant has a status.

### 4. Judge the survivors

For each survivor, name an input where the original and the mutant behave
differently. That input starts the missing test. When no such input exists, the
mutant is equivalent. Drop it and count it.

Then check the tests that ran on the changed code for the smells in
[`mutants.md`](mutants.md).

Done when every survivor is a finding or a counted equivalent.

### 5. Report

Write each finding in the shape the caller gives. As Reviewer D, that is the
reviewer brief: a JSON file with the mutant quoted in each `body`, and the
status lines below in `status`. Without a shape, use the one in
[`mutants.md`](mutants.md). Put the status lines after the findings:

```
🔴 <n> mutants break an acceptance criterion untested
🟡 <n> mutants survived, <n> test smells
🟢 <n> killed, <n> equivalent, <n> invalid
```

Leave out a line whose count is zero. The counts are information, never a gate.

Done when every survivor and smell has a file, a line and a fix.

### 6. Write the missing tests

Ask with clickable options, through the CLI's question tool, such as
AskUserQuestion. Offer to write the missing tests, which is recommended, to
pick which ones, or to stop at the report.

Write each test through the public interface, per the Tests section of
`h2xd:code-quality`. Then plant the same mutants again: run the step 3 command
with `--only <id,id>` added.

Done when each chosen mutant is `killed` and the tests pass on the unmutated tree.

## Do

- Mutate only the changed lines, riskiest first.
- Name the input that tells original and mutant apart before you report it.
- Quote the mutant in the finding, so anyone can plant it again.
- Sketch the missing test as an input and an expected result.

## Don't

- Don't run mutants in the user's working tree. Use `prove-tests.sh`, which makes a worktree.
- Don't report an equivalent mutant. Drop it and count it.
- Don't change production code to kill a mutant. Write the test. Delete the code only when the mutant shows it is dead.
- Don't suggest tests that check internals or mock call counts. Assert what a caller sees.
- Don't gate on the score. Report the survivors.
