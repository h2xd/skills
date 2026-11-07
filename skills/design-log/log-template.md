# Design log template

Write the page with the frontmatter the repo's docs lint requires. Newest
month first, newest entry first in each month.

The log path may have any name but `log.md` or `index.md`, such as
`docs/design-log.md`.

```markdown
---
type: Concept
title: Design log
description: Small design decisions, one dated entry each, newest first.
tags: [design, decisions]
generated: { by: "<agent/model>", at: "<YYYY-MM-DD>" }
---

# Design log

Small design decisions that do not need a decision record. Each entry names
the elements by inventory slug. A reversed decision stays, and a new entry
says what reversed it. Values live in the token source, never here.

## 2026-11

- <a id="2026-11-06-switch"></a>**2026-11-06** `switch`, `setting-row`. The
  switch sits right of the label, never left. Reason: the eye scans labels
  first. Source: committee verdict, PR #42.
- <a id="2026-11-04-tidy"></a>**2026-11-04** `tidy`. 2 safe fixes, 1 merge:
  `toggle-chip` into `pill`. Source: h2xd:design-tidy.
- <a id="2026-11-02-card"></a>**2026-11-02** `card`. Reverses
  2026-10-12-card: the drop shadow is gone. Reason: it hid the focus ring.
  Source: [<n>-<slug>](<decision records folder>/<n>-<slug>.md). `todo`
```

## Entry rules

- Start with an anchor whose id is `<date>-<first slug>`. Add `-2` when the
  id exists.
- Then the date in bold, then the slugs in code font.
- Then the decision, as a rule, in one sentence.
- Then `Reason:` and `Source:`.
- The decision of a reversal starts with `Reverses <id>:`.
- End with `todo` while the change is not in the code. Remove it when the
  change lands.
- A tidy run uses the slug `tidy` and gives the counts.
