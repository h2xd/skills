---
name: design-setup
description: "Set up or audit a design system that lives in the repo: one inventory of reusable elements, an overview page, an agent view agents can curl or read from git, a design log, and the config page the other design skills read. Use when a repo has no design system, or its inventory, overview or agent view is missing or hand-written."
---

# Design setup

A designer asks "do we have a pill toggle?" and three people give three
answers, because the app has three. This skill gives the repo one place that
answers. That place is one inventory, which the overview page, the agent view
and the Claude Design mirror all read. The words are in [words.md](words.md).

## Steps

### 1. Read what exists

Read the agent instructions file, `docs/agents/`, and the decision records
that mention design, tokens or components. Find the token source, such as a
global stylesheet. Find every list of components, such as a registry,
Storybook or a design route.

When the repo already has `docs/agents/design-system.md`, an inventory or
design pages, this run is an audit. Compare the repo with steps 3 to 7. List
each gap before any change.

Done when you can name the framework, the token source and every list of
components, and an audit has its gap list.

### 2. Agree the plan

Show the user what you will create or change, file by file. In an audit, show
the gap list. Ask with clickable options, through the CLI's question tool,
such as AskUserQuestion, only what the code does not answer:

- Where the design pages live, and how they stay out of a production build.
  [gating.md](gating.md) has a recipe per framework.
- The element groups. Use two to six domain areas, not one group per
  component.
- The standing words. `decided` and `intent` are required. The user may
  add more.
- The agent view folder, `design/` at the repo root by default. It is
  outside the docs root and the static assets folder.
- The mirror state folder, or `none`.
- The design log path. It may have any name but `log.md` or `index.md`,
  such as `docs/design-log.md`.

In an audit, when the inventory lacks `source` or the `path` form of
`related`, ask the user to add them. Keep the names a repo already uses. A
change to a type or a field that a decision record closes goes through
`h2xd:docs-adr` first.

Done when the user said yes to the file list, and every item above is settled.

### 3. Write the inventory

Create or extend the inventory in the shape of [inventory.md](inventory.md).
Fill it from the code: one entry for each element that two or more places
use, or that the user names. A preview renders the real module, never a copy.
When another list duplicates the inventory, make it read the inventory. A
generated list is an agent view, not a second list.

Done when every reusable element has one entry, no second list exists, and
every entry has `source`, or the user declined.

### 4. Build the agent view

Add the Reference page to the page list first. Then write the generator
script and the dev routes from [agent-view.md](agent-view.md). When the repo
has a generator, extend it to emit `index.json` and `llms.md`. Write the
files to the agent view folder from step 2. Track them in git. Add the check
where [agent-view.md](agent-view.md) says.

Done when the page list has the Reference page, `--check` exits 0, and the
element count matches the inventory's entry count.

### 5. Build the overview page

The overview page reads the inventory, the page list, the design log and
`NOTES.md` in the mirror state folder. It shows:

- Each group with its entries, and a search over titles and keywords.
- Each foundation page, such as color, type, motion and icons.
- The newest design log entries, the open `intent` entries, the last tidy
  and the last mirror push. When the log or `NOTES.md` is missing, show
  "none yet".

Build the Reference page. It shows the agent view's `llms.md` and the design
log. Until step 6 creates the log, the page shows "none yet" for it.

Read values from the running document, such as with `getComputedStyle`.
Support Bare mode on every design page. Record the overview route and the
page list path on the config page in step 7.

Done when the overview renders every inventory entry, the Reference page
shows `llms.md`, and no page contains a literal token value.

### 6. Start the design log

Create the design log from [log-template.md](../design-log/log-template.md)
at the path the user picks. Link it from the overview page.

Done when the log exists, the overview page links it, and `docs/index.md`
lists it, as `h2xd:docs-wiki` does.

### 7. Write the config page

Write `docs/agents/design-system.md` from [config-page.md](config-page.md).

Done when every row has a value or says `none`, and `docs/index.md` lists
it, as `h2xd:docs-wiki` does.

### 8. Verify

Run the generator again, then run it with `--check`. Reuse a running dev
server, else start one. Open the overview page and the Reference page.
Request both agent view routes. Run the repo's typecheck, lint and tests.
Run the gate check from [gating.md](gating.md). Stop the dev server only
when you started it.

Done when `--check` exits 0, the overview loads, the Reference page shows
the design log, both routes answer, the checks pass, and the production
build serves no design page.

## Report

```
🔴 <part>: <what is missing or fails, and the next action>
🟡 <part>: <what works, but is partial, such as elements without a preview>
🟢 inventory: <n> elements in <n> groups
🟢 agent view: <files>
🟢 agent view check: <where it runs>
🟢 config: docs/agents/design-system.md
```

## Do

- Keep one inventory. Every page, script and design skill reads it.
- Keep the repo's own names for the inventory, its fields and its groups.
- Make `avoid` required on new entries. An element with no misuse case is
  often two elements.
- Put every repo-specific value in `docs/agents/design-system.md`.

## Don't

- Don't change code before the user said yes to the file list.
- Don't write a token value into a page or a doc. Read it from the running
  document.
- Don't hand-write the agent view. Generate it and check it.
- Don't ship the design pages in a production build. Gate them as
  [gating.md](gating.md) says.
