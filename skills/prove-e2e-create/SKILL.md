---
name: prove-e2e-create
description: Generate a repo-local skill, verify-<app>, that launches this repo's app, drives a feature the way a user does, captures evidence, and cleans up, in any language or platform. Seeds a feature map and proves the new skill by running it once. Use when a repo has no scripted way to prove UI, CLI or service behavior, or when asked to make a verify or control skill for the app.
disable-model-invocation: true
---

# Create verification skill

Every test passes, and the Save button still does nothing. Tests call code,
and only the running app shows what a user clicks, types and reads.

This skill writes `verify-<app>`, a repo-local skill that drives the real app
the way a user does and keeps the evidence. An agent opens it cold, with no
memory of the app. `/h2xd:prove-e2e-maintain` keeps it in step later.

## Output

- `<skills dir>/verify-<app>/SKILL.md`, filled in from
  [`skill-template.md`](skill-template.md). `<skills dir>` is the CLI's
  project skill directory, such as `.claude/skills/`. `<app>` is the app's
  short name in kebab case.
- `features/` next to it: a `README.md` index and one file per feature,
  shaped like [`feature-map-example/`](feature-map-example/).
- `scripts/` next to it, only when the drive needs helper scripts.

## Steps

### 1. Look for an existing one

Search the project skill directories for `verify-*/SKILL.md`, and for any
skill whose body launches and drives the app. When one exists, stop and point
the user at `h2xd:prove-e2e-maintain`, unless the user asks to replace it.
Done when no verification skill exists, or the user chose to replace it.

### 2. Read the repo

Answer each question from the code. Ask the user only what the repo does not
show, with clickable options, through the CLI's question tool, such as
AskUserQuestion.

| Question | Where to look |
|---|---|
| Surface: what does a user touch? | Routes, CLI entry points, menus, API specs, `README.md` |
| Run: how does it start locally? | Package scripts, `Makefile`, compose files, the README quickstart |
| Drive: how can an agent operate it? | Existing end-to-end specs, expect scripts, PTY helpers, a debug port |
| Observe: what evidence exists? | Logs, exit codes, response bodies, database files, written files |
| Isolate: can two instances run side by side? | Port, data directory and profile settings |

- When a repo has several surfaces, pick the one users touch most. Name the
  others in the generated skill's opening paragraph.
- Use an existing harness first. Otherwise pick a generic one: browser
  automation over CDP for web and Electron, tmux or a PTY for CLI and TUI, an
  HTTP client for services, the platform simulator for mobile.
- When the repo has an h2xd knowledge base, name features with its glossary
  terms. Find them with `node scripts/find-docs.ts --search "<feature>"`.
- When instances cannot run side by side, the generated skill says so and
  refuses to drive an instance it did not start.

Done when you can name the surface, the launch command, the ready signal, the
harness, the evidence kinds and the isolation answer, each with its source file.

### 3. Make it start

Run the launch command from a clean checkout with an empty data directory.
When the app does not build or start, fix it, or report the exact error and stop.
When an asset the drive never uses blocks startup, such as a sample config,
the generated skill may create it as marked scaffolding that cleanup removes.
Done when the app reached a usable state, not only an answering process, and
you stopped every process you started.

### 4. Write the skill

Fill [`skill-template.md`](skill-template.md) with what steps 2 and 3 found.
Apply `h2xd:add-skill` to the result. For each generated step:

- **Doctor** is one read-only command that says whether this instance is worth
  driving: process up, expected build, port owned by this run, auth valid.
- **Launch** reaches a usable state from an empty data directory, including
  migrations and seed data. A health check can pass while init scripts still
  run. For a short-lived CLI or TUI, Launch builds the binary once, and each
  drive starts in its own PTY or tmux session.
- **Drive** uses this repo's real selectors and commands. Prefer ARIA labels,
  data attributes, prompt strings and routes over coordinates and tab order.
- **Capture evidence** writes to a named directory in `.gitignore`.
- **Clean up** kills only the PIDs this run recorded. It never deletes evidence.
- **Helpers** are executable, and the skill body shows each invocation.

Done when `grep -n '{{' <skills dir>/verify-<app>/SKILL.md` prints nothing,
the file is at most 150 lines, `name` is `verify-<app>`, the description says
"Use when", and every numbered step ends in `Done when`.

### 5. Seed the feature map

Write `features/README.md` and one file for each of the top three to five
user-facing features. Find them in routes, commands, menus or docs. Copy the
shape of [`feature-map-example/`](feature-map-example/). Each feature file has
an H1, one paragraph, and exactly these H2s in order: `Sub-features`,
`How a user gets to it`, `Driving it with <harness>`, `Gotchas`.

- List every entry point a user has. A proof through one entry point does not
  cover the others.
- When the seed data lacks a precondition a recipe needs, the recipe reports
  a failure, and the reason goes in `Gotchas`. Never weaken the recipe.
- Keep implementation details out. Name user paths, handles, state, commands
  and observable results.

Done when the README links every feature file, and each file has the four H2s.

### 6. Prove it

Follow the generated skill once, as the next agent would: launch, doctor,
drive one mapped feature, capture evidence, clean up. Check that the evidence
is still at the named path. Fix what fails, and clean up after each failure.
When you proved it in a stand-in for the real target, such as a container for
a fresh VM, list every setup step the stand-in did that the target will not.
Done when one feature ran end to end, its artifacts survived cleanup, and no
process or port the run started is still alive.

### 7. Hand off

When `CLAUDE.md` or `AGENTS.md` has a `## Agent skills` block, add one line
that names `verify-<app>` and its surface. Report, then point the user at
`h2xd:prove-e2e-maintain`.
Done when the user has the report.

## Report

```
🔴 <step or feature>: <what failed, the command, the next action>
🟡 <step or feature>: <unverified, such as a stand-in step or an unreachable entry point>
🟢 <step or feature>: <what ran, and the artifact path>
```

End with the files written, the feature driven in step 6, and the features
mapped but not yet driven.

## Do

- Read the surface, launch and harness from the code before you ask anything.
- Write real commands and handles from this repo into the generated skill.
- Keep evidence in a named, gitignored directory that cleanup never touches.
- Name a stand-in's extra setup steps as unverified.

## Don't

- Don't write the skill against an app that does not start. Fix it or report it.
- Don't leave a `{{...}}` slot in the output. Fill it, or delete the line.
- Don't kill processes by name. Record the PID at launch and kill that.
- Don't drive an instance this run did not start. Launch your own, or ask.
- Don't hand over a skill that never ran. Run step 6 first.
