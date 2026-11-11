# Resolving fix threads

The orchestrator resolves a fix thread itself when its row in `changes.md` is
applied, the checks pass, and nothing puts the fix in doubt. A fix is in doubt
when the thread has a `Choice`, when the code does not apply the suggestion as
written, or when the row says the fixer deviated.

Resolve all sure threads in one call:

```sh
node scripts/review.ts resolve --threads $WORK/threads.md T1 T3
```

When any fix is in doubt, start one subagent on the cheapest model, such as
Haiku, for those threads only. Give it the paths to `threads.md`, `plan.md` and
[`resolver.md`](resolver.md), the doubtful thread ids, the commit SHA, and
`$WORKTREE`. When no fix is in doubt, start no subagent.

Done when every sure thread printed `resolved`.
