# Slicing

How `h2xd:to-tickets` cuts work into tickets.

## Tracer bullets

A tracer bullet is a ticket that cuts one narrow path through every layer the
feature needs: schema, API, UI and tests. When it is done, the path works end
to end and someone can show it working.

- Slice vertically. "Store and show one comment" is a ticket. "Add the
  comments table" is not.
- Make the first ticket the thinnest path that proves the design: one case, no
  options, no edge cases. Later tickets widen it.
- Size each ticket for one fresh agent session. When a ticket needs the whole
  spec to make sense, split it.
- Put prefactors first. A prefactor changes existing code so the new work
  becomes a small change. It ships green on its own and blocks the slices that
  need it.
- Draw an edge only when one ticket cannot start without the other's result.
  Two tickets that touch the same module do not block each other.

## Wide refactors

A **wide refactor** is one mechanical change whose edits fan out across the
code base, such as renaming a column or retyping a shared symbol. One edit breaks every
call site at once, so no vertical slice can land green. Sequence it in three
phases instead:

1. **Expand.** One ticket adds the new form beside the old. Nothing breaks.
2. **Migrate.** One ticket per batch of call sites, such as one per package or
   per directory. Each is blocked by the expand. The
   build stays green after each batch, because the old form still exists.
3. **Contract.** One ticket deletes the old form once no caller uses it. It is
   blocked by every migrate ticket.

When a batch cannot stay green on its own, keep the sequence. Let the batches
share one integration branch, and add a final integrate-and-verify ticket that
every batch blocks. Only that ticket promises a green build. Say so in its
criteria.

## Acceptance criteria

`h2xd:prove-tests` ranks mutants by the criterion they would break, and
`h2xd:review-pr` checks the PR against them. A criterion they can use:

- names one observable behavior: an input, an action, and the result a
  caller sees.
- can be checked by a test or a command, without reading the code.
- stands alone, so a reviewer can tick it without the others.

| Weak | Checkable |
|---|---|
| Comments work | Posting a comment on a post shows it under the post after a reload |
| Validation is added | Posting an empty comment returns 400 and stores nothing |
| Handles errors | When the store is down, posting shows "Try again" and keeps the draft |

Add one criterion per edge case the spec names. Leave out what the spec puts
out of scope, and list it under `## Out of scope` instead.
