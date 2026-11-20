# Split the fix items

Group the **fix** items, so several fixers work at the same time:

```sh
node scripts/review.ts split $WORK/threads.md $WORK/plan.md --out $WORK/split.md
```

A group holds at most 5 items. Items on the same file share a group, and a
mutation item shares the group of the item for its code. At most
`review.fixMaxWorkers` groups come out.

Start one subagent per group in one message, on a fast model, such as Sonnet,
through the CLI's subagent tool, such as Agent. Give each the paths to
`threads.md`, its rows of `plan.md`, [`fixer.md`](fixer.md) and
`$WORK/fixer-tools.md`.

- Many groups: each fixer works in its own worktree of the PR branch, made as
  `h2xd:code-implement` makes one for a build worker. It leaves its changes
  uncommitted, writes `changes-<id>.md`, and writes a patch with
  `git diff > <id>.patch`.
- Apply the patches in order in `$WORKTREE`. On a conflict, stop and name the
  two groups.
- Run the lint, typecheck and test commands once on the joined result. Join
  the `changes-<id>.md` files into `changes.md`.

Done when `changes.md` accounts for every fix item and each check has an exit
code.
