# Skills due for review

How `h2xd:session-reflect` tells the user about repo-local skills whose review
is due. Only this skill tells the user. No other skill nags about a date.

## Find them

Read the date of the last run, per [`technology.md`](technology.md), then run
`node scripts/skills.ts due`. It creates the Skills page when it is missing.
When it prints `created`, list the page in the index of the docs bundle, so
`node scripts/lint-docs.ts` stays green.
It prints the count, then one skill per line with its due date, oldest first.
Skip this file when the repo has no `scripts/skills.ts`.

## One line, one question

When the count is above 0, add one line to the approval block of step 4. It
names every due skill, oldest first, and adds no line per skill:

```
🟡 <n> skills due for review: <oldest>, <next>, <newest>.
```

Ask one question for all of them, in the same call as the other questions of
step 4:

- **Review all**, recommended. Tell the user to run `/h2xd:review-skills`.
  It is a user-only skill, so never start it. Its last step moves the dates.
- **Move the dates.** Set the Review due cell of each due skill one interval
  ahead. Read the interval with `jq .skills.reviewIntervalDays
  agents.config.json`. Leave the Updated cell alone.
- **Pick some.** Ask in plain text which skills to review, because the list
  can be long. Move the dates of the rest.

Done when the user answered one question, and each due skill is reviewed,
moved or picked.
