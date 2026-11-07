# Question template

Copy to `$WORK/committee/question.md`. Write every path as an absolute path.

```markdown
# <One question, such as "Which settings variant ships, and with which changes?">

Mode: quick | full
Chapters: design | engineering | both
Dev server: <base URL, or none>
Design pages: <the design pages folder from docs/agents/design-system.md, or none>

## Options
- A: <one line>
- B: <one line>
- C: <one line>

## Material
- <absolute path or dev route for each option>
- <screenshots, notes, a diff, a plan>

## Context
- <repo>/docs/agents/design-system.md, when it exists
- <repo>/<decision records folder>
- <the design log, the issue, the earlier review>

## Constraints
- <what wins over taste, such as an accessibility need of the users>
```

## Mode

- `quick` is the default. Members vote, leads write positions, nobody calls.
- `full` lets leads and members call down their chapter, as `members.md`
  says. Use it when a vote needs a page built, a proof or a number.

The agent count and the budget of each mode are in the Cost section of
`calls.md`.
