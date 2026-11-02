# Spec template

The body of the spec issue. Keep the headings and their order, so
`h2xd:to-tickets` can find each section. Replace every `<...>`. Write
"None." under a section the conversation left empty. Follow
[`../setup-tone/github-text.md`](../setup-tone/github-text.md): summary first,
bullets, no walls of text.

Name every term by its glossary heading. Leave out file paths and code. They
go stale before the work ships. One exception: when a prototype produced a
snippet that states a decision more precisely than prose, inline the
decision-rich lines and say they came from a prototype. A state machine, a
schema or a type shape are examples.

```markdown
## Summary

- <The problem, in one line.>
- <What changes once this ships, in one line.>
- <What this spec needs next: decisions, a record, or tickets.>

🔴 <a blocker, such as a missing decision record>
🟡 <an open question>
🟢 <what is settled>

## Problem

- <The problem as the user experiences it, in their words. One to three bullets.>

## Solution

- <What changes for the user once this ships. One to three bullets.>

## User stories

1. As a <actor>, I want <feature>, so that <benefit>.
2. ...

<details><summary>More stories</summary>

6. ...

</details>

## Implementation decisions

- <Each module built or changed, and what its interface gains or loses.>
- <Architecture, schema and API contract decisions, and the interactions between modules.>
- <Clarifications the developer gave in the conversation.>

## Testing decisions

- **Test entry point:** <the interface the tests call, and why it is the highest one that works.>
- **Modules under test:** <each module that gets tests.>
- **Prior art:** <existing tests of the same kind to copy.>
- Tests check behavior a caller can observe, never internals.

## Decision records

- `<decisions path>`: <title>. <One line on how it constrains this spec.>

## Out of scope

- <What this spec does not do, and where it goes instead when known.>

## Open questions

- <A question the conversation did not settle, and who decides it.>
```

## User stories

Cover every actor, the happy path, each error the user can hit, empty and
first-use states, permissions, and what happens to existing data. One story
per line. Show the five most important. Put the rest in the `<details>` block.
A story names a person or role as the actor, never a module.

## Decision records

List every record `node scripts/find-docs.ts` returned that constrains this work. When the
conversation made a decision that passes the bar in `h2xd:docs-adr` and no record
holds it, add a line `Needs a record: <the decision>` here.
