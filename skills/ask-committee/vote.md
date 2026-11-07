# Vote and verdict format

A member writes a vote. A lead writes a chapter position, and in `full` mode
a hypothesis first. The chair writes the verdict.

## Vote

Write `<short name>.md` in the committee folder. At most 60 lines.

```markdown
# <short name>: <option>

Vote: <option>
Block: none | <option>: <the rule or path it breaks, and what lifts the block>

## Scores
| Option | Score 1 to 5 | One line why |
|---|---|---|

## Findings
1. <option>: <finding>. Evidence: <file:line, route, screenshot or record>.
2. ...

## The one change I want most
<option>: <change>
```

A member that blocks adds a block check when the chair asks for one. Write
"lifted by change" with the quoted change text, or "stands".

```markdown
## Block check
lifted by change: "<quoted change text>" | stands
Reason: <one line>
```

The rules for a vote are in `member.md`.

## Hypothesis

In `full` mode, a lead writes `<short name>-hypothesis.md` before any vote
is read. At most 30 lines.

```markdown
# <short name>: hypothesis

Hypothesis: <option> wins, because <one sentence>.
What would prove me wrong: <the result that would change my mind>

## Calls
- <calls/<short name>-1.md>: <what it tests>
```

## Chapter position

A lead writes `<chapter>-position.md` when it gets its chapter's votes. At
most 60 lines.

```markdown
# <Chapter>: <option>

Hypothesis: held | changed | wrong | none in quick mode. <one line why>
Blocks: none | <member>: <copied unchanged from the vote>

## Changes before it ships
1. <change>. Asked by <names>. Evidence: <vote, answer or file>.

## Splits inside the chapter
- <names>: <the disagreement>

## Votes
- <member>: <option>, <one line>
```

## Verdict

The chair writes `verdict.md`. The "Every vote" section is copied, not
summarized, so a minority view always reaches the user.

```markdown
# Verdict: <option>, with <n> changes

Mode: quick | full. Agents run: <count>.
<chapter>: <option>. Blocks: <none, or member, reason and block check>.

## Changes before it ships
1. <change>. Asked by <members>.

## Splits the user decides
- <members>: <the disagreement>. Chair's note: <what each side costs>.

## Positions
- <chapter> position: <option>, <one line>

## Every vote
- <member>: Vote <option>. Block <none or reason>. Wants most: <change>.
```

When the positions pick different options, the heading reads
`# Verdict: <option> or <option>, the user decides`. The verdict shows the
summed member scores for both options.
