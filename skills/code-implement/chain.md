# The review chain

Run each skill in order, without asking between them:

1. `h2xd:git-pr-body` for ticket `#<n>`. It pushes and opens the PR.
2. `h2xd:review-pr` on that PR. It posts the review.
3. `h2xd:review-fix` when the review left threads. It pushes the fixes.
4. `h2xd:review-pr` once more when step 3 pushed.
5. `h2xd:review-fix` once more when the second review left threads. Then stop.

Stop the chain early when a check fails, or when the PR opened as a draft. A
draft means `h2xd:git-pr-body` rated the change a one-way door, one that is
hard to undo. Report the draft and let the user decide.
