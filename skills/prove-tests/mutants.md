# Mutants and findings

The catalog `prove-tests` picks mutants from, and the shape of its findings.

## Kinds of mutant

Pick one plausible bug per place, the kind a person could have written.

| Kind | Example |
|---|---|
| Boundary | `<` ↔ `<=`, `>=` ↔ `>`, off by one on a constant |
| Condition | Negate it, replace it with `true` or `false`, `&&` ↔ `\|\|` |
| Removed effect | Delete a call, an assignment, an `await`, an event emit |
| Return value | `true` ↔ `false`, `null`, `undefined` or empty for the value, the input unchanged |
| Arithmetic | `+` ↔ `-`, `*` ↔ `/`, drop a term |
| Guard | Delete an early return or a validation |

Skip mutants that cannot compile, and mutants of logging or messages.

## Test smells

Flag these in the tests that ran against the changed code:

| Smell | Sign | Fix to suggest |
|---|---|---|
| Asserts internals | Checks mock call counts, private state or call order | Assert what a caller can observe |
| Asserts nothing | Runs code without an assertion, or snapshots logic output nobody reads | Assert the result |
| Hidden by a mock | A mutant survived because a mock swallows the effect it removed | A fake, or the real collaborator |
| Kills nothing | A new or changed test kills none of the mutants in the code it covers | Rewrite it to pin behavior, or delete it |

To find a test that kills nothing, run the killed mutants again. Pass their ids
to `--only`, and set `--test` to a command that runs only that test file.

## Finding

Use the shape the caller gives. As Reviewer D of `h2xd:review-pr`, that is its
reviewer brief, a findings file. The finding below has the same content as that
finding in the file, with `what` and `why` joined in `body`. Without a shape, use this
one:

```
### D-<n> <🔴|🟡> <title>
- file: <repo-relative path>
- line: <n> or <start>-<end>
- found-by: <your model name, as your system prompt states it>
- what: Mutant <kind> survived: `<original>` → `<mutant>`. `<test command>` still passes.
- why: <the input where behavior differs, and what goes wrong for a user>
- fix: A test that <calls what, with which input> and expects <observable result>.
```

The `what` line carries the mutant. In the JSON, `body` starts with that
line. With it, `h2xd:review-fix` or a person can
plant the mutant again without this run's files.

## Severity

Severity is the finding's status for the merge.

- 🔴 blocks the merge. The mutant breaks an acceptance criterion of a linked
  issue, and no test fails. A red baseline is also 🔴.
- 🟡 needs attention. Use it for any other survivor and for every test smell.
