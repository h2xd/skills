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
