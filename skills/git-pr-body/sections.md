# PR body sections

The template step 4 of [`SKILL.md`](SKILL.md) fills, and the rule for each
section.

```markdown
## Summary

- <what changes, at most three bullets>

Refs #<n>

<diagram, diff sketch, or tree>

## Evidence

- **Before:** <screenshot, output, or failing test run>
  **After:** <screenshot, output, or passing test run>

## Merge danger

🟢 two-way door | 🔴 one-way door: <why>

🟡 blast radius: <one word>. <optional: what a bad merge would break>
```

- **Summary.** Pick the smallest view that makes the point, from
  [`visuals.md`](visuals.md). One view is usual. Three is the most. Drop the
  `Refs` line when the PR finishes every issue it touches.
- **Evidence.** A screenshot is best when the change is visible and the
  environment can take one. Next best is a test or command run. Name the test
  that failed before and passes now, and put long output in `<details>`. Run
  it yourself. Never write that a check passed without its output.
- **Door.** Keep one door line. A two-way door is cheap to revert. A one-way
  door is not, such as a migration that drops data, a published API or
  package version, a deleted record, or a message already sent.
- **Blast radius.** Write one word for the widest scope a bad merge reaches,
  such as `module`, `service`, `consumers` or `users`. Consider layout shift,
  broken consumers, mobile widths and stored data. For a one-way door, run
  `h2xd:prove-blast-radius` and cite its confirmed risks.
