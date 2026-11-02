# Idea issue

An idea is not a request and not a decision yet. Park it as a tracker issue
with the `idea` label, so the backlog keeps it for ideation, voting and later
grilling. `/h2xd:plan-triage` leaves `idea` issues alone until someone removes
the label.

## Create it

Ask the user first. After a yes, create the issue with the **Create** operation
in `docs/agents/issue-tracker.md`, and give it the `idea` label.

- **Title.** The idea as a short noun phrase, in the glossary's words, such as
  "CSV export for invoices".
- **Body.** Use the template below. It follows
  [`../setup-tone/github-text.md`](../setup-tone/github-text.md).

```markdown
## Summary

- <The idea, in one line.>
- <Why it came up, in one line.>

## Idea

- <What it would do for the user. One to three bullets.>
- <Variants, when there are several: one bullet each.>

## Cost

🔴 <what makes it expensive or risky>
🟡 <what is unknown>
🟢 <what is cheap or already in place>

## Open questions

- <A question that has to be answered before it becomes a ticket.>

## Related

- <Issues, decision records and pages it touches.>
```

## Promote it

1. Remove the `idea` label.
2. Run `h2xd:plan-grill` on the idea.
3. Run `h2xd:to-spec` or `/h2xd:to-tickets` on the result.
