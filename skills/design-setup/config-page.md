# Config page template

Write this to `docs/agents/design-system.md` in the target repo. Fill every
value, or write `none`. Use the frontmatter the repo's docs lint requires.

```markdown
---
type: Agent Config
title: Design system
description: Where the design system lives and how the design skills reach it.
tags: [agents, design]
generated: { by: "<agent/model>", at: "<YYYY-MM-DD>" }
---

# Design system

The repo-specific half of the h2xd design skills. Change it only with the user.

| Key | Value |
|---|---|
| Inventory entries | `<path>:<export>` |
| Inventory groups | `<path>:<export>` |
| Inventory standings | `<path>:<export>` |
| Page list | `<path>` |
| Components folder | `<path>` |
| Token source | `<path>` |
| Design pages | `<folder>`, gated by `<recipe from gating.md>` |
| Dev server | `<command>`, base `<URL>` |
| Overview route | `<route>` |
| Agent view | `<generator command>`, files in `<folder, design/ by default>`, checked by `<package script>` in `<workflow or hook>` |
| Design log | `<path>` |
| Decision records | `<folder>` |
| Export command | `<command>`, writes `<bundle folder>`, or `none` |
| Mirror state | `<folder>`, or `none` |
| Checks | `<typecheck>`, `<lint>`, `<tests>` |

## Rules the design skills must keep

- <One rule per line that an agent breaks without it, such as "No token
  value under docs/".>
```
