# Release notes layout

Step 4 of [`SKILL.md`](SKILL.md) writes the notes in this layout. The release
title is the heading text without the `#`.

```markdown
# <version> · <summary>

<tldr>

---

<description>

| Skill | Change | PR | Issue |
|---|---|---|---|
| `<skill or area>` | <change> | #<pr> | #<issue> |

<joke>
```

## Parts

| Part | What it holds |
|---|---|
| `<summary>` | The biggest change, at most eight words, with a capital first letter. |
| `<tldr>` | One or two sentences. What a user of the plugin gets from this version. |
| `<description>` | One to three short paragraphs. Why the change exists and how it works now. |
| `<skill or area>` | The skill name in code font, such as `git-commit`. For a change outside a skill, the area, such as `scripts` or `install`. |
| `<change>` | One sentence on what a user sees now. |
| `#<pr>` and `#<issue>` | The PR that made the change and the issue it closed. Write `-` when none exists. |
| `<joke>` | One line in italics, in the voice of a court jester, about this release. |

## Rules

- The `·` is the middle dot, U+00B7, with one space on each side.
- One row per change a user sees. Order the rows by skill name.
- A row with several issues lists them all, such as `#4, #5`.
- The joke is kind, fits one line, and makes fun of the change, never of a
  person. It has no emoji.
- No other headings, no other sections and no closing summary.
