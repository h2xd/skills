# Keep the PR body true

Re-read the PR body with `gh pr view <pr> --json body -q .body`. A fix that
changes a number, a word or a file the body names makes that sentence untrue.
Write the new body to `$WORK/body.md`, run
`PR_BODY="$(cat $WORK/body.md)" node scripts/lint-pr-body.ts`, then
`gh pr edit <pr> --body-file $WORK/body.md`.
