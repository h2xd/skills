# The two bars

How `h2xd:catchup` counts the two progress bars of its report. Draw each one
with `node scripts/catchup.ts bar <label> <done> <total>`.

## The loop

The label is `Loop`. The total is 8, the steps of the main flow in
[`../next/catalog.md`](../next/catalog.md). Count a step as done when:

| Step | Done when |
|---|---|
| `plan-grill`, `to-spec`, `to-tickets` | The branch names a ticket, or the conversation shows the step. Count all three together |
| `code-implement` | A PR is open for the branch |
| `review-pr` | The PR has a review |
| `review-fix` | A review exists, and no thread is unresolved |
| `review-gate` | The review decision is approved |
| `session-reflect` | The PR is merged |

Read the PR with `gh pr view --json state,reviewDecision` and the threads with
`node scripts/review.ts threads`. With no PR and no ticket, no step is done.

## The criteria

The label is `Criteria`. Draw it only when the ticket has numbered acceptance
criteria. The ticket number is the `ticket` line of the facts. Read the ticket
with the **View** operation in `docs/agents/issue-tracker.md`.

The total is the number of criteria. Count a criterion as done when a commit on
the branch built it, judged from the commit messages. When you are unsure,
count it as open.
