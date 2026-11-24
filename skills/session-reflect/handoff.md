# Offer a handoff

How `h2xd:session-reflect` offers `h2xd:session-handoff` after its report.

## When follow-up work exists

Follow-up work exists in either case:

- This run filed an issue.
- An open issue names the ticket of the branch. The ticket is the number in
  the branch name, such as `feat/116-x`. Look the issue up with the **View**
  operation in `docs/agents/issue-tracker.md`.

Without follow-up work, ask nothing.

## The question

Ask once, with clickable options, through the CLI's question tool, such as
AskUserQuestion. The options are yes, recommended, and no. On yes, start
`h2xd:session-handoff`. Do not ask again in the same run.
