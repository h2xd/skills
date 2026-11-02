---
type: Glossary
title: Technical glossary
description: The words of the code base, its modules, layers and patterns, and where each one lives.
tags: [glossary]
generated: { by: "{{ACTOR}}", at: "{{DATE}}" }
---

# Technical glossary

One entry per term the code base gives a specific meaning. General programming
words stay out. The `###` heading is the name to use. `**Code:**` points at
where the term lives, so a reader can go from the word to the file.

An entry looks like this:

```markdown
### Session Store

- **Meaning:** Where a signed-in user's session lives between requests.
- **Code:** [`src/auth/session-store.ts`](../../src/auth/session-store.ts)
- **Avoid:** Session cache, auth store
```
