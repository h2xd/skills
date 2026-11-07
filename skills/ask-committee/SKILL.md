---
name: ask-committee
description: "Put variants, a design, a plan or a diff before a committee of reviewer agents in a design and an engineering chapter. Members vote alone, leads merge each chapter's votes, and the chair writes one verdict with every vote attached. Use when the user asks the committee or wants a committee verdict."
argument-hint: "<question> [paths]"
disable-model-invocation: true
---

# Ask committee

One reviewer sees what they always see. A committee that disagrees on
purpose sees the whole thing. The visual designer wants more, the software
engineer wants less, and the UX designer blocks the path that loses a user.
You are the chair. You route, merge and quote, and you never vote.

The agents, their tiers and who may call whom are in
[members.md](members.md). How agents are started, resumed and call each
other is in [calls.md](calls.md). `$WORK` is a scratchpad directory, and
`$WORK/committee/` is the committee folder.

## Steps

### 1. Frame the question

Write `question.md` in the committee folder from
[question.md](question.md). Pick:

- **Options.** "Is this good?" is not a question. "Ship A, B or C, and with
  which changes?" is one. Write the options first when there are none.
- **Mode.** Pick it by the rule in [question.md](question.md).
- **Chapters.** Only the chapters the question touches.
- **Dev server.** When the material has routes, start the dev server once
  with the command in `docs/agents/design-system.md`. When that page is
  missing, use the repo's dev script, such as `dev` in `package.json`, and
  tell the user. When the question names a running dev server, reuse it.
  Write the base URL in.
- **Design pages.** Note the design pages folder from
  `docs/agents/design-system.md`. When the page is missing, write `none`.

Tell the user the mode, the base agent count and the ceiling. Take both
numbers from the Cost section of [calls.md](calls.md). The report gives the
final count.

Done when `question.md` has one question, its options, the mode, the
chapters, the dev server, the design pages folder and every path as an
absolute path.

### 2. Convene

Start the members of each chapter in one message, in the background. In
`full` mode, start the leads in the same message. Use the CLI's subagent
tool, such as Agent with `subagent_type: h2xd:committee-design-director`.
Give each the absolute paths from the "Started with" column of
[calls.md](calls.md), and the committee folder. Members vote alone, and no
agent sees another's file in this step.

A lead can fail to start on its model, here or in step 4. Then start it
again with the subagent tool's model override, such as `model: opus`. Note
it in the report.

Done when every member ended with `VOTE DONE` or `CALLS PENDING`. In `full`
mode, every lead also ended with `HYPOTHESIS DONE` or `CALLS PENDING`.

### 3. Route the calls

In `full` mode, run the chair's loop in [calls.md](calls.md). Skip this step
in `quick` mode.

Done when every call file has an answer or a refusal, and no agent ends
with `CALLS PENDING`, or the loop budget is spent.

### 4. Chapter positions

Wait until every member ended with `VOTE DONE`. In `quick` mode, start each
lead now with its "Started with" files and the paths of its chapter's votes.
In `full` mode, resume each lead with its chapter's votes and its answers.
When a lead cannot be resumed, start a new one. Give it its hypothesis file,
its answers and the votes.

Each lead writes `<chapter>-position.md`, as [lead.md](lead.md) says, and
ends with `POSITION DONE`.

Done when each convened chapter has a position, or a dropout is noted.

### 5. Check blocks

For each member that blocks, resume it with the changes the positions list.
It adds `## Block check` to its vote, as [member.md](member.md) says.

Done when every block was checked.

### 6. Verdict

Write `verdict.md` from [vote.md](vote.md). Copy every member's vote line,
block and wanted change into "Every vote". A block that stands stays in the
verdict until the user overrides it. With a missing position, name the votes
that exist and mark the chapter 🔴. When the positions pick different
options, use the split heading in [vote.md](vote.md).

Show the user the verdict. When a ticket or a PR exists, paste its "Changes
before it ships" and "Every vote" sections there. Otherwise leave them to the
skill that ran this one, or show them to the user.

Ask before you remove the spike worktrees with `git worktree remove` and
`git branch -D`. Ask before you delete the variant folders the UI prototyper
built in this run. Report the folders the user keeps. Stop the dev server you
started. Leave a dev server running that the question named.

Done when the user has the verdict and the path of `verdict.md`.

## Report

```
🔴 block: <member>: <what fails, and what would lift it>
🔴 missing: <chapter or member>: <why>
🟡 split: <chapters or members>: <the disagreement in one line>
🟡 model: <lead>: started again with the model override
🟡 kept: <variant folder or spike worktree>: the user kept it
🟢 verdict: <option>, with <n> changes, <mode>, <n> agents
🟢 evidence: <worker>: <what it built or measured, and the result>
```

## Do

- Route every valid call in parallel, and refuse every call that breaks a
  rule in [calls.md](calls.md).
- Quote the member's own words for a block.
- Offer `h2xd:design-log` for the user's pick when the skill that ran this
  one does not log it.

## Don't

- Don't vote as the chair. Route, merge and quote.
- Don't let a lead overrule a block. Copy it into the position and the
  verdict.
- Don't show a callee the caller's hypothesis. Route the task copy.
- Don't convene for a question with one obvious answer. Ask the user instead.
