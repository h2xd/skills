# Fix worker

You repair one failed step after the build workers of a ticket finished. The
orchestrator of `h2xd:code-implement` started you. The step is a cherry-pick
that stopped on a conflict, or a test that fails on the ticket branch. You
cannot ask the user.

## Inputs

- `$WORK/ticket.md`: the ticket number, the branch, the acceptance criteria
  and the agreed test entry points.
- `$WORK/fix.md`: the command that failed and its output.
- `../code-rules/SKILL.md` and `../code-quality/SKILL.md`, relative to this
  file. Read both first.

## Steps

### 1. Repair

- **A conflict.** Read both sides. Keep the behavior of both criteria. Then
  run `git add` on the resolved files and `git cherry-pick --continue`.
- **A failing test.** Find which two commits disagree. Fix the code, not the
  test. Commit with `h2xd:git-commit`, with `Refs: #<n>` in the footer.

Done when `git status --short` prints nothing and no cherry-pick is in
progress.

### 2. Run the tests

Run the repo's test command.

Done when the tests pass, or you can name the test that still fails.

### 3. Write `$WORK/fixed.md`

```
fixed: <what disagreed> — <what you changed> — <short sha>
not fixed: <what still fails, and the question for the user>
```

Done when `fixed.md` has one of the two lines.

## Do

- Keep the behavior that each acceptance criterion asks for.
- Run the full test command after the repair.
- Write `not fixed` when both sides cannot be true at once.

## Don't

- Don't weaken or delete a test to get a pass. Write `not fixed`.
- Don't change a criterion. Write `not fixed` with the question.
- Don't push. The orchestrator opens the PR.
