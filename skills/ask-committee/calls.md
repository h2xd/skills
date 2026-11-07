# Calls

A subagent cannot start another subagent. So an agent that wants work from a
lower tier writes a call file and ends its turn. The chair starts or resumes
the callee, then resumes the caller with the answer.

## Words

- **Chair.** The agent that runs `ask-committee`. It routes calls and merges
  the positions. It never votes.
- **Short name.** An agent name without `committee-`, such as
  `design-ui-prototyper`. A call file's `to` and `from` hold short names.
- **Committee folder.** `$WORK/committee/`. The chair passes its absolute
  path in every prompt.

Every `calls/`, `tasks/`, `answers/`, `shots/` and vote path is relative to
the committee folder. The brief files sit in the skill folder, and the chair
passes them as absolute paths.

## Who is started and resumed with what

| Tier | Started with | Resumed with | Ends its turn with |
|---|---|---|---|
| Lead, `full` mode | `question.md`, `members.md`, this file, `lead.md`, `vote.md` | Its answers and "votes are not in yet", or its chapter's votes and answers | `CALLS PENDING: <count>`, or `HYPOTHESIS DONE`, or `POSITION DONE` |
| Lead, `quick` mode | The same files, plus the paths of its chapter's votes, after every member ended with `VOTE DONE` | Never. It writes its position in one turn | `POSITION DONE` |
| Member | `question.md`, `members.md`, this file, `member.md`, `vote.md` | Its answers, or the task copy of a call from its lead, or a block question | `CALLS PENDING: <count>`, or `VOTE DONE`, or `ANSWER DONE` |
| Worker | Its task copy `tasks/<call id>.md`, this file, `worker.md`, `../design-setup/words.md`, and the material the copy names. The performance tester also gets the absolute path of `../prove-measure/SKILL.md` | Never. A worker runs once per call | `ANSWER DONE` |

## Rules

- Call only the agents in your "Can call" cell of `members.md`.
- In `quick` mode, nobody calls. Members vote, then leads write positions.
- Stay inside the call budget in the Cost section.
- A call is one task with one answer. Split two asks into two calls.
- Never call to get a vote. Members vote on their own.
- A call may wait for another with `after: <call id>`. The chair runs it
  after the first call has an answer.

## Call file

Write `calls/<short name>-<n>.md`. `<n>` starts at 1 and counts up across
resumes. Then end your turn with `CALLS PENDING: <count of new calls>`.

```markdown
to: design-ui-prototyper
from: design-director
kind: build | check | measure | opinion
after: none | <call id>
hypothesis: <what you think is true, in one sentence>
ask: <the one task, with the paths it needs>
done when: <what the answer must contain>
```

The call id is the file name without `.md`, such as `design-director-1`. The
answer goes to `answers/<call id>.md`.

## The chair's loop

1. Collect every call file that has no answer. Skip a call whose `after`
   call has no answer yet.
2. Refuse a call that breaks a rule. Write the reason as its answer.
   Refuse a `build` call to `design-ui-prototyper` while `design pages` is
   `none`. Its reason is "run h2xd:design-setup first".
   Refuse a `build` call to `design-ui-prototyper` while `dev server` is
   `none`. Its reason is "the question has no dev server". A spike builder
   call is not refused for that reason.
3. Hold a lead's call to a member until that member ended with `VOTE DONE`.
4. Write the task copy `tasks/<call id>.md` for each valid call, in the
   format below. When `after` names a call id, add
   `material: <absolute path of answers/<after id>.md>` to the copy.
5. Start each worker callee new, with its task copy. Resume each member
   callee with the absolute path of its task copy. Resume the same agent that
   voted, through the CLI's message tool, such as SendMessage. Run them all
   in one message.
6. Resume a caller only when every one of its call files has an answer or a
   refusal. Give it the paths of those answers. For a lead, also say "votes
   are not in yet".
7. Go back to step 1 while a call file has no answer and the loop budget
   allows.

When the loop budget is spent and a call is still open:

1. Write "refused: budget spent" into the answer file of each open call.
2. Resume every caller with the paths of its refusals. Wait until each one
   ends with `VOTE DONE`, `HYPOTHESIS DONE` or `POSITION DONE`.

The task copies live outside `calls/`, so step 1 never collects a copy.

## Task copy

The chair copies every line of the call except `hypothesis`. The callee
never sees the caller's guess. The chair adds this header on top:

```markdown
answer: <absolute path of answers/<call id>.md>
committee folder: <absolute path>
dev server: <base URL, or none>
design pages: <the design pages folder from docs/agents/design-system.md, or none>
```

## Answer file

The callee writes `answers/<call id>.md`, at most 40 lines. A `check`
answer may have up to 25 lines per page checked. It holds the
result, the evidence, and what was not done. A build answer gives the route
or the branch. A measure answer gives the number, the method and the noise.

## Cost

These are the only agent counts and budgets of the committee. Other files
point here.

- **Quick mode.** Each convened chapter runs 1 lead and 2 members. Nobody
  calls.
- **Full mode.** Quick mode, plus calls to workers and members.
- **Call budget.** In one run of `ask-committee`, a lead makes at most 4
  calls and a member at most 2.
- **Loop budget.** In one run, the chair runs its loop at most 3 times.
- **Base agent count.** Each convened chapter runs 3 agents, so both
  chapters run 6.
- **Ceiling.** In `full` mode, each chapter adds at most 8 workers, one for
  each call in its call budget. One chapter runs at most 11 agents, and both
  run at most 22.
- **Final count.** Count the leads, the members and one worker for each call
  that the chair started. Tell the user this count in the report.
- **Design variants.** One run of `design-variants` adds 3 UI prototypers
  and 1 usability tester to its `quick` committee run.
