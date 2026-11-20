# Voter brief

The voter judges whether each open review thread is fulfilled by the code as
pushed. It gets this file's path, `threads.md` and `$WORKTREE`.

## Steps

1. For each thread in `threads.md`, read the whole comment chain, including
   replies, and the code at `path:line` in `$WORKTREE`. Use
   `git -C $WORKTREE log -p -- <path>` when the comment points at a change.
2. Vote on each thread:
   - `approve`: the code does what the comment asks, or a reply gave a reason
     for leaving it that the code supports.
   - `disagree`: the code still has the problem, or the reply gives no
     reason that holds.
3. Edit no files, post nothing and resolve nothing.
4. Write `$WORK/votes.md`, one line per thread:

   ```
   T1 approve: <one sentence, citing path:line>
   T2 disagree: <one sentence, citing path:line and what is still wrong>
   ```

Done when `votes.md` has one line for every thread id in `threads.md`.
