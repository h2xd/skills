# Split the fix items

Group the **fix** items, so several fixers work at the same time:

```sh
node scripts/review.ts split $WORK/threads.md $WORK/plan.md --out $WORK/split.md
```

A group holds at most 5 items, unless one file or one plan group holds more,
or the `review.fixMaxWorkers` cap forces more. Items share a group when their
plan rows have the same cell in the `Group` column, or when they name the
same file. The row of a mutation item names its code file, so the
item stays with the fixes to that code. At most `review.fixMaxWorkers`
groups come out.

The command also writes `plan-<id>.md` next to `split.md` for each fixer. It
holds the lines of `plan.md` above the table, the table header and the rows
of that fixer.
When no `plan-<id>.md` exists after the command, stop and tell the user to
run `/h2xd:setup`.

Start one subagent per group in one message, on a fast model, such as Sonnet,
through the CLI's subagent tool, such as Agent. Give each the paths to
`threads.md`, its `$WORK/plan-<id>.md`, [`fixer.md`](fixer.md),
`$WORK/fixer-tools.md`, its group id and its worktree, `<path>` in place of
`$WORKTREE`. Tell it the patch command below.

- Many groups: create each fixer worktree with
  `node scripts/worktree.ts <path> --base <sha>`, where `<sha>` is the
  commit that `git -C $WORKTREE rev-parse HEAD` prints. It runs the
  `worktreeSetup` commands and links the `worktreeLinks` files. When
  `scripts/worktree.ts` is
  missing, stop and tell the user to run `/h2xd:setup`. The fixer leaves its
  changes uncommitted and writes `changes-<id>.md`. It writes a patch that
  holds new files too: `git -C <path> add -A`, then
  `git -C <path> diff --cached --binary > $WORK/<id>.patch`.
- Apply the patches in order in `$WORKTREE` with `git apply`. On a conflict,
  stop and name the two groups. Remove each worktree with
  `git -C $WORKTREE worktree remove --force <path>` after its patch applies.
- Run the lint, typecheck and test commands once on the joined result. Join
  the `changes-<id>.md` files into `changes.md`.

Done when `changes.md` accounts for every fix item and each check has an exit
code.
