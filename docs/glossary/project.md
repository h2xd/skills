---
type: Glossary
title: Project glossary
description: The words of the domain, as users, customers and the product name things.
tags: [glossary]
generated: { by: "claude-code/claude-opus-5-5", at: "2026-11-05" }
---

# Project glossary

One entry per term. The `###` heading is the name to use in code, docs and
conversation. Link a term's first use on a page to its heading here. The
`h2xd:docs-glossary` skill holds the rules, and `node scripts/lint-docs.ts` checks every
entry and every link into this page.

An entry looks like this:

```markdown
### Order

- **Meaning:** A customer's request to buy one or more products, from checkout until delivery.
- **Avoid:** Purchase, transaction
```

### Chair

- **Meaning:** The main session that runs `h2xd:ask-committee`. It routes calls between the committee agents, merges the chapter positions into the verdict, and never votes.
- **Avoid:** Moderator, orchestrator

### Chapter

- **Meaning:** One group of committee agents with one lead, its members and its workers. The committee has two: design and engineering.
- **Avoid:** Team, panel, group

### Status marker

- **Meaning:** An emoji at the start of a line that rates a finding or an item: 🔴 blocks, 🟡 needs attention, 🟤 is out of scope for the run, 🟢 is fine, ⚪ is optional. A [work-state marker](#work-state-marker) is the other scale.
- **Avoid:** Severity icon, traffic light

### Work-state marker

- **Meaning:** An emoji at the start of a line that shows where a work item stands: 🟪 blocked, 🟧 ready for a person, 🟦 ready for an agent. It replaces 🟢 in a list of tickets and tasks.
- **Avoid:** Status marker for a ticket, ready icon

### Skills page

- **Meaning:** The docs page that holds one row for each repo-local skill: its technology, the date of its last review and the date the next review is due. `node scripts/skills.ts` keeps it, and `h2xd:session-reflect` reads it.
- **Code:** [`templates/scripts/skills/page.ts`](../../templates/scripts/skills/page.ts)
- **Avoid:** Skill inventory, skill list

### Technology skill

- **Meaning:** A skill in the repo's own skill folder that holds the rules an agent gets wrong in one technology of that repo. `h2xd:session-reflect` proposes it when a record or the user adds the technology, and `h2xd:setup` offers it for each technology it finds. In this repo it is an internal skill.
- **Code:** [`skills/session-reflect/technology.md`](../../skills/session-reflect/technology.md)
- **Avoid:** Language skill, stack skill

### Documentary

- **Meaning:** The report that `h2xd:catchup` prints for a person new to a repo, in the repo scope: the story of how the repo grew, then the map of where things live, with a pointer to `/h2xd:teach`.
- **Code:** [`skills/catchup/SKILL.md`](../../skills/catchup/SKILL.md)
- **Avoid:** Overview, tour
