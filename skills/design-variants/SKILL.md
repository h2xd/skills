---
name: design-variants
description: "Design by committee. Three UI prototyper agents build one UI task as real pages, a usability tester agent reviews each, they revise once, and the committee picks one. Use when the user asks for design variants, several takes on a screen or element, or design by committee."
argument-hint: "<what to design>"
disable-model-invocation: true
---

# Design variants

Ask one designer for a settings screen and you get their first idea. Ask
three and you see which choices were real. This skill runs three UI
prototypers on one task, lets the usability tester push back once, and hands
the revised variants to the committee.

The UI prototyper and the usability tester are workers of the committee's
design chapter, as `../ask-committee/members.md` lists. This skill starts
them itself, in a fixed order. The Cost section of `../ask-committee/calls.md`
gives what one run costs, so only the user starts this skill.

`$WORK` is a scratchpad directory. Every hand-off is a file in it. The words
are in `../design-setup/words.md`.

## Steps

### 1. Frame the task

When `docs/agents/design-system.md` is missing, run `h2xd:design-setup`
first, and commit its result. Then, when the working tree is dirty, ask the
user to commit or stash.

Read `docs/agents/design-system.md`, the inventory, the design log and the
decision records that touch the task. Reuse a running dev server, else start
one with the command on the config page. Note the base URL. Write
`$WORK/task.md` from [task.md](task.md).

Shuffle the three stances with a command, such as `shuf` or `node -e`.
Give them to the letters A, B and C in that order. Write the command's
output to `$WORK/stances.md`. Nobody but you reads it before the verdict.

When the task has open questions only the user can answer, ask them now, at
most four. Prototypers that guess diverge on the guess. Then show `task.md`
to the user and ask for a yes.

Done when `task.md` has the dev server URL, the user said yes to it, and
`stances.md` exists.

### 2. Fan out three UI prototypers

Start three agents in one message, in the background, through the CLI's
subagent tool, such as Agent with
`subagent_type: h2xd:committee-design-ui-prototyper`. Each prompt holds the
absolute path of `task.md`, its letter, its variant folder, its notes file,
and its stance row from [task.md](task.md).

When a prototyper fails, note the dropout and go on. With fewer than two
variants left, stop and report.

Done when each surviving variant renders on the dev server, and has
screenshots and a notes file.

### 3. Usability review

Start one agent through the CLI's subagent tool, such as Agent with
`subagent_type: h2xd:committee-design-usability-tester`. Give it `task.md`,
the variant routes by letter, the screenshots, the dev server URL and the
output `$WORK/usability.md`. Tell it to write at most 25 lines per variant.
Give it no notes file, so no stance leaks.

Done when `usability.md` has a section for every variant.

### 4. Revise once

Resume each UI prototyper with its section of `usability.md`, through the
CLI's message tool, such as SendMessage. When one cannot be resumed, start a
new one with the same paths plus its section. Each revises its own folder,
takes new screenshots, and appends a revision section to its notes.

Done when every variant is revised and each notes file has a revision
section.

### 5. Ask the committee

Read `../ask-committee/SKILL.md` and run it with these settings.

- **Question.** "Which variant ships, and with which changes?"
- **Mode.** `quick`. The pages exist.
- **Chapters.** Design. Add engineering only when a variant adds a
  dependency, new state or a new data flow.
- **Material.** `task.md`, which holds no stance, the variant routes, the
  screenshots, `usability.md` and the dev server URL. Keep the notes files
  out of it.

Done when `$WORK/committee/verdict.md` exists.

### 6. Close

Show the user the verdict, the screenshots and `stances.md`. After the user
picks, do these steps.

- Log the choice with `h2xd:design-log`, and name the committee as the source.
- Open a ticket through the tracker in `docs/agents/issue-tracker.md`. Its
  acceptance criteria are the verdict's changes.
- When the change needs several tickets, read `../to-tickets/SKILL.md` and
  follow it instead.
- Paste the verdict's "Changes before it ships" and "Every vote" sections
  into the ticket body. Do not link `verdict.md`.
- Link the repo path of the winning variant folder in the ticket. Do not
  link a localhost URL.
- Ask before you delete the other variant folders.
- When the winner becomes an inventory entry, give it standing `intent`
  until the real module ships.
- Stop the dev server when you started it.

Done when the user picked, the log has the entry, the ticket exists, and the
folders are cleaned or kept on purpose.

## Report

```
🔴 <step>: <what failed, and the next action>
🟡 dropout: <letter>: <why>
🟢 variant <letter>, <stance>: <route>: <one-line idea>
🟢 committee: <verdict in one line>
🟢 ticket: <link>
🟢 cost: <n> agents, committee <mode>
```

## Do

- Give every UI prototyper the same `task.md`. Only the stance differs.
- Keep variants dev-only, inside the design pages folder, like every design
  page.
- Make each variant reuse inventory elements before it adds new ones.
- Show the user screenshots, not only text.

## Don't

- Don't tell a UI prototyper what the others built. Let the usability tester
  and the committee compare.
- Don't merge variants into an average. Pick one and graft named changes.
- Don't change shared components in a variant. Copy into the variant folder,
  and let the ticket change the real module.
- Don't skip the revision. The review in step 3 is wasted without it.
