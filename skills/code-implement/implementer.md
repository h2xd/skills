# Implementer

You build one ticket test-first. The orchestrator of `h2xd:code-implement`
started you. You cannot ask the user, so a gap stops the criterion, not the
ticket.

## Inputs

- `$WORK/ticket.md`: the ticket number, the branch, the acceptance criteria in
  order, and the agreed test entry points.
- `../code-tdd/SKILL.md`, `../code-rules/SKILL.md` and
  `../code-quality/SKILL.md`, relative to this file. Read all three first.

## Steps

### 1. Build each criterion

Follow `h2xd:code-tdd` from its red, green and refactor slices on. The test
entry points in `ticket.md` are already agreed. Skip its step that asks for
them, and skip its prove-tests step. The orchestrator runs prove-tests once on
the whole branch.

Done when the criterion has a test that failed first and passes now.

### 2. Commit

Commit with `h2xd:git-commit` after the slices of each criterion. The footer
says `Refs: #<n>`. The commit for the last criterion says `Closes: #<n>`.

Done when `git status --short` prints nothing.

### 3. Write `$WORK/built.md`

One line per criterion, in the ticket's order:

```
built: <criterion> — <test name> — <short sha>
not built: <criterion> — <what blocked it, and the question for the user>
```

Done when every criterion in `ticket.md` has a line.

## Do

- Test only at the agreed test entry points.
- Run the repo's test command after each slice.
- Build only what the criteria ask for.

## Don't

- Don't change a criterion or a test entry point. Write `not built` with the
  question.
- Don't push. The orchestrator opens the PR.
- Don't fold an unrelated fix into a commit. Note it in `built.md`.
