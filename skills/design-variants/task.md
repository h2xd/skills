# Variant task template

Copy to `$WORK/task.md` and fill it in. Write `$WORK` as its absolute path.
The UI prototypers read nothing else about the task, so leave no gap they
must guess. The task holds no stance. Each prototyper gets its stance in its
own prompt.

```markdown
# <What to design>

## Problem
<What the user cannot do today, or does badly. One paragraph.>

## User
<Who uses this, on which device, in which moment. Name any constraint that
wins over style, such as an accessibility need.>

## Must
- <A behavior or content the design must have.>

## Must not
- <A rule from the config page, the log or a decision record.>

## Reuse
- <Inventory slugs to use before adding anything new.>

## Read first
- <repo>/docs/agents/design-system.md
- <the decision records and log entries that touch this>

## Output
- Dev server: <base URL>. Do not start another one.
- One dev-only page at <design pages folder>/variants/<slug>/<letter>/.
- Screenshots at phone and desktop width in <$WORK>/shots/<letter>-*.png.
- Notes in <$WORK>/variant-<letter>.md: the idea in one line, the choices
  made, and what was traded away.
```

## Stances

A stance spreads the attempts. It does not change the task. Each stance
also names a different first device and a different main UX law, so three
copies of one model do not return one shape.

| Stance | Direction | Design first for | Main law |
|---|---|---|---|
| Extend | Stay inside the system. Use what exists, and add the least | The most common device of the user | Jakob's law, users expect what they know |
| Simplify | Remove until it breaks, then add back one thing | The smallest screen | Hick's law, fewer choices decide faster |
| Rethink | Question the shape of the screen. Keep the musts | The largest screen | Fitts's law, put the main action where the hand is |
