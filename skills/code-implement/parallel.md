# Build with more than one build worker

The orchestrator of `h2xd:code-implement` follows these steps when
`$WORK/split.md` names more than one build worker. Each build worker writes in
its own worktree, so no two of them touch the same checkout.

## The worker file

Each build worker reads `$WORK/worker-<id>.md`:

```
worktree: <absolute path>
branch: <the branch checked out there>
criteria: <numbers from split.md>
files: <files from split.md>
built: <absolute path of $WORK/built-<id>.md>
```

## Steps

### 1. Make the worktrees

On the ticket branch, run this once per build worker in `split.md`:

```sh
node scripts/implement.ts worktree <id>
```

It creates the branch `<ticket branch>-w<id>` in a new worktree, runs the
repo's worktree setup and prints the path. Write `$WORK/worker-<id>.md` with
that path and branch.

When a worktree or branch of the same ticket is left from an earlier run, run
`node scripts/implement.ts cleanup <id>` first. It removes them only when
their commits are on the ticket branch.

When the command fails, stop and report its error line. Do not build in a
shared worktree instead.

Done when `git worktree list` shows one worktree per build worker.

### 2. Start the build workers

Start all build workers in one message, so they run at the same time. Use a
fast model, such as Sonnet, through the CLI's subagent tool, such as Agent.
Give each one the paths to `ticket.md`, its `worker-<id>.md` and
[`build-worker.md`](build-worker.md).

When the tests use a fixed port, a shared database or another resource outside
the worktree, the build workers can fail each other's tests. Set
`implement.maxWorkers` to 1 in `agents.config.json` instead.

Done when every `$WORK/built-<id>.md` exists.

### 3. Cherry-pick the commits

On the ticket branch, take the build workers in the order of their ids. That
is the order of their first criterion. Before each one, record the pre-pick
sha with `git rev-parse HEAD`.

```sh
git cherry-pick -x <ticket branch>..<ticket branch>-w<id>
```

The `-x` flag adds a `(cherry picked from commit <sha>)` line to each commit.
`cleanup` reads it to know that a commit landed, also after the fix worker
resolved a conflict by hand.

Skip a build worker whose `built` file has no `built` line. It made no commit.
When a cherry-pick stops on a conflict, use the fix worker below.

Done when `git status --short` prints nothing and no cherry-pick is in
progress.

### 4. Run the tests

Run the test command from the agent instructions file on the ticket branch.
When a test fails, use the fix worker below.

Done when the tests pass, or the failure is in the report.

### 5. Remove the worktrees

For each build worker whose commits are on the ticket branch:

```sh
node scripts/implement.ts cleanup <id>
```

The command checks that every commit landed. It refuses and keeps the worktree
when one did not. It also refuses when the worktree has files that are not
committed, or has no branch. Name that worktree and the reason in the report.

Don't run `cleanup` for a build worker you reverted. Name its worktree in the
report.

Done when `git worktree list` shows only the worktrees you named in the
report.

## The fix worker

A ticket gets one fix worker, once.

1. Write `$WORK/fix.md`: the command that failed and its output. For a
   conflict, add the output of `git status` and `git diff`.
2. Start one subagent on a fast model, such as Sonnet. Give it the paths to
   `ticket.md`, `fix.md` and [`fix-worker.md`](fix-worker.md).
3. Read `$WORK/fixed.md`.

Done when `fixed.md` exists. After `fixed`, the **Done when** of the failed step
holds. For a conflict, `git status --short` prints nothing and no cherry-pick
is in progress. For a red test, the test command passes. Never run the
cherry-pick of that build worker again.

When it says `not fixed`, or a step fails again after the fix worker ran:

- For a conflict, undo the cherry-pick, then name the criteria of that build
  worker as `not built` in the report, with the conflicting files. Go on with
  the next build worker.
  1. When a cherry-pick is in progress, run `git cherry-pick --abort`.
  2. When `git rev-parse HEAD` does not print the pre-pick sha, run
     `git revert --no-edit <pre-pick sha>..HEAD`.

  Done when `git diff <pre-pick sha> HEAD` prints nothing.
- For a failing test, put the test and its output in the report as 🔴.

## Do

- Start the build workers in one message.
- Cherry-pick on the ticket branch only, one build worker after the other.
- Keep a worktree whose commits did not land, and name it.

## Don't

- Don't resolve a conflict yourself. Start the fix worker.
- Don't start a second fix worker. Report a conflict's criteria as
  `not built`, and a red test as 🔴.
- Don't push a worker branch. Only the ticket branch goes to the remote.
