# Resolver brief

The resolver closes the threads the pushed commit fulfils. It gets this file's
path, `threads.md`, `plan.md`, the commit SHA, and `$WORKTREE`.

## Steps

1. Look only at **fix** items of `plan.md` that are threads, with ids `T…`.
   Never touch declines or summary items.
2. For each, read these:
   - the thread's comments and any suggestion in `threads.md`
   - the code at `path:line` in `$WORKTREE`
   - `git -C $WORKTREE show <sha> -- <path>`

   The thread is fulfilled when the code now does what the comment asks. That
   means the suggestion applied as written, or its aim met. When the item has a
   `Choice`, judge against that option.
3. Resolve the fulfilled threads in one call:

   ```sh
   node $WORKTREE/scripts/review.ts resolve <thread ids>
   ```

4. Edit no files, post no replies, make no commits.
5. Write `$WORK/resolved.md`: per item id, `resolved`, or `left open` with a
   one-line reason.

Done when `resolved.md` accounts for every fix thread, and `review resolve`
printed `resolved` for each one listed as resolved.
