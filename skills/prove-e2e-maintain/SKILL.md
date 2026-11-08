---
name: prove-e2e-maintain
description: Check a repo's verification skill and its feature map against the code. Read every feature from source with parallel subagents, drive every feature live in one session, and ship the proven corrections as at most one PR. Use when the verification skill from h2xd:prove-e2e-create may have drifted, after user-facing changes, or when asked to audit the verify skill.
disable-model-invocation: true
---

# Maintain verification skill

A recipe that clicks a button the app renamed last month fails mid-task, for
an agent with no memory of the rename. This pass catches it. Every feature
file of a skill from `h2xd:prove-e2e-create` gets a source read and a live
drive, and one drive can cover several bullets.

Run notes go in a scratchpad file, called `$NOTES` below. They hold the
features covered, unreachable prerequisites, confirmed drift and the outcome.
Never commit them.

## Outcomes

End with exactly one, and name it:

- **clean**: every feature got a source read and a drive. Nothing changes.
- **changed**: one PR ships proven fixes to the map, skill text or helpers.
- **blocked**: coverage could not finish, or a proven fix could not ship
  safely. Name the exact blocker.

## Edit scope

Edit only the verification skill's folder: `SKILL.md`, `features/` and
`scripts/`. Never edit product code in this pass. A wrong map is doc drift, so
fix the map. A broken app is a product gap, so report it.

## Steps

### 1. Locate the target

The target is `<skills dir>/verify-<app>/SKILL.md`, where `<skills dir>` is
the CLI's project skill directory, such as `.claude/skills/`. It has the steps
Doctor, Launch, Drive, Capture evidence and Clean up, and `features/` beside it.

Search with `find . -path '*/verify-*/SKILL.md' -not -path '*/node_modules/*'`.
When several match, ask which one. When none match, stop and point to
`/h2xd:prove-e2e-create`, which the user runs.
Done when you have one skill folder, called `$SKILL` below.

### 2. Fix the index

Read `$SKILL/features/README.md` and list the files in `$SKILL/features/`.
Fix index entries that are missing, extra, duplicated or link to nothing.
Done when every feature file has exactly one index entry and every entry links
to a file that exists.

### 3. Read each feature from source

Start one read-only subagent per feature file, all at once, through the CLI's
subagent tool, such as Agent. Run them on a fast model, such as Sonnet. Give
each the brief in [`source-reader.md`](source-reader.md) and its feature
file's path.
Done when every feature file has a returned summary in `$NOTES`.

### 4. Reconcile

- Merge overlapping recipes so the live pass needs as few app states as
  possible.
- Check each cited drift against the source yourself. Do not re-check claims
  a reader called clean.
- Read the changes since the map last changed:
  `git log --stat "$(git log -1 --format=%H -- "$SKILL")"..HEAD`. Call a
  feature missing from the map only with a source path that proves it.
Done when `$NOTES` holds the drive plan, the confirmed drift and the missing
features, each with a source path.

### 5. Drive every feature live

Run this step even when the source looks clean. You drive, never a subagent.
Drive every feature at least once.

Follow the Launch step. It picks one long-lived instance driven in order, or a
fresh isolated session per drive. Hold these rules whatever fails:

1. **Doctor before you drive.** Run the Doctor step before the first drive,
   on each fresh session, and after any failed drive. When Doctor cannot see
   the fault, such as a stuck UI on a healthy process, reset to a known state
   or relaunch.
2. **Evidence survives cleanup.** After each Clean up, check that the evidence
   is still where the Capture evidence step says. Do not assume it.
3. **Nothing outlives its drive.** Run Clean up after every failed attempt,
   whether the session hung, exited or is shared. On a shared instance, remove
   what the drive created and leave the instance running.

When Doctor fails because the skill is wrong, that is drift. Fix it, restart
only what the fix invalidated, and retry once. A second failure means blocked.

A feature counts as `verified-unreachable` only with the route you tried and
the prerequisite that blocked it, such as auth, an entitlement, the OS or
external state. When the map does not mention that prerequisite, that is drift
too.
Done when every feature is `verified` or `verified-unreachable` in `$NOTES`,
with its evidence path.

### 6. Triage

Sort each finding into one kind:

| Kind | Sign | Action |
|---|---|---|
| Doc drift | The map describes the user path wrongly or leaves it out | Fix the feature file or the skill text |
| Harness gap | The app works, but the skill's helpers cannot drive it | Fix the helper. It stays executable and the skill body shows how to call it |
| Product gap | The app is broken | Record it for the report. Keep it out of the PR |

Drive every harness fix live again before it ships. After the last drive, run
the Clean up step once more.
Done when every finding has a kind, every harness fix passed a re-drive, and
nothing this pass started still runs.

### 7. Ship or stop

For **changed**: re-read every changed file and create a branch. Commit with
`h2xd:git-commit`. Open one PR with `h2xd:git-pr-body`.
For **clean** or **blocked**: no branch, no PR.
Offer to file each product gap with the **Create** operation in
`docs/agents/issue-tracker.md`.
Done when the report is out, with the PR URL for changed.

## Report

```
<outcome>: <n> features, <n> verified, <n> verified-unreachable
🔴 <feature>: <product gap or blocker, and the next action>
🟡 <feature>: <drift fixed, unreachable prerequisite, or missing feature>
🟢 <feature>: verified, evidence at <path>
PR: <url or "none">
```

## Do

- Ask for a source path before calling any drift or missing feature real.
- Name the prerequisite and the route for every unreachable feature.
- Keep the PR to proven corrections inside the edit scope.

## Don't

- Don't skip the live drive because the source looks clean. Drive every feature.
- Don't let a subagent drive the app. Keep all driving in your own session.
- Don't drive an instance that failed or surprised you. Run Doctor or relaunch.
- Don't change the map to hide broken behavior. Report it as a product gap.
- Don't kill processes by name. Run the target skill's Clean up step.
- Don't commit `$NOTES`. Keep it in the scratchpad.
