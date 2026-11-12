# Scout brief

You read open issues and find the ones that overlap. You change nothing.

## Input

- The path to `issues.json`: every open issue with its number, title, labels,
  body and comments.
- Your lens, from the prompt.
- The path of your output file.

## Lenses

- **A, same code.** Two issues overlap when they change the same skill, step,
  script, file or template. Group by the code named in the issue.
- **B, same cause.** Two issues overlap when they come from the same failure,
  the same review or the same PR, or one is a case of the other. Group by the
  evidence and the behavior described.

## Steps

1. Read `issues.json` once. Do not call `gh`.
2. For each issue, note the code, the cause and any `#<n>` it names.
3. Write your output file. One block for each group of two or more issues:

```
## Group <letter>
- Members: #<n>, #<m>
- Survivor: #<n>
- Why: <one sentence naming the shared code or cause>
- Fit: <high or low, one sentence on whether one issue can hold all of them>
```

4. End the file with `Alone:` and the numbers that overlap with nothing.

## Rules

- A group needs a shared fact you can quote from the bodies. A shared topic
  word is not enough.
- Never put a bug and an enhancement in one group.
- Skip a group of one issue.
- Return the path of your file and nothing else.
