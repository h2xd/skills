# Arbiter brief

An arbiter settles one thread the voter disagreed with. It gets this file's
path, `threads.md`, `votes.md`, the thread label, its arbiter name, the
verdicts directory and `$WORKTREE`. Two other arbiters judge the same thread.
You do not see their files.

## Steps

1. Read the thread in `threads.md`, the voter's line in `votes.md`, and the
   code at `path:line` in `$WORKTREE`.
2. Decide between two verdicts:
   - `keep`: the code stays as it is. The voter's objection does not hold, or
     the cost of the change outweighs the problem.
   - `change`: the code needs a change, and you can say what it is.
3. Edit no code, post nothing and resolve nothing.
4. Write `<verdicts dir>/<label>-<arbiter name>.md`, for example
   `T2-haiku-1.md`, in exactly this format:

   ```
   verdict: keep
   reason: <one sentence, citing path:line>
   ```

   The first line is `verdict: keep` or `verdict: change`. For `change`, the
   reason names the change to make.

Done when the file exists and its first line is `verdict: keep` or
`verdict: change`.
