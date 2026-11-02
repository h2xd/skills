# Skill template

The shape of the generated `verify-{{app}}/SKILL.md`. Replace every `{{...}}`
with a value from this repo. Delete a line whose slot does not apply, such as
the server lines for a short-lived CLI.

Keep the step names Doctor, Launch, Drive, Capture evidence and Clean up.
`h2xd:prove-e2e-maintain` finds the skill by them. Keep the `Done when` lines,
the Do and Don't bullets, and the report format too.

````markdown
---
name: verify-{{app}}
description: Launch {{App}} locally, drive its {{surface}} the way a user does, and capture evidence that a feature works. Use when proving a change to {{App}} works in the running app, reproducing a reported bug, or before calling a {{surface}} change done.
---

# Verify {{App}}

{{One paragraph. What the app is, the surface this skill drives, the harness
it drives it with, and where evidence goes.}}

[`features/README.md`](features/README.md) lists every feature with its entry
points and a recipe. Read it before you drive. When a recipe is wrong, fix the
feature file in the same change, or run `h2xd:prove-e2e-maintain`.

## Steps

### 1. Doctor

Run `{{doctor command}}`. It only reads. It reports {{what it checks, such as
process up, build matches HEAD, port owned by this run, auth valid}}.
Run it at the end of Launch, after a failed drive, and when output surprises
you.
Done when it exits 0 and prints {{the expected URL, data directory and build}}.

### 2. Launch

{{Exact commands, in order: install, build, migrate, seed, start. Name every
env var. Put data under a directory keyed by a run ID.}}

```sh
{{launch commands}}
```

Ready means usable. Wait for {{the ready signal, such as a log line, a prompt,
or a request that returns seeded data}}, not for the process to answer.
When the port or data directory belongs to an instance this run did not
start, stop and ask. Do not drive it.
Done when {{the ready check}} passes and `{{doctor command}}` exits 0.

### 3. Drive

Open the feature file for the behavior you are proving. Follow its recipe.

{{Harness commands, one per line, with the real flags. Name the stable handles
this app has: ARIA roles and names, data attributes, prompt strings, routes.}}

Done when every bullet of the recipe ran, and each observed result matched or
the mismatch is written down.

### 4. Capture evidence

Write to `{{evidence dir}}/<run-id>/<feature-id>/`. Git ignores
`{{evidence dir}}`. Name each file after the feature ID and entry point.

- UI: an ARIA snapshot and a screenshot that shows the app's identity.
- CLI: the command, stdout, stderr and exit code.
- Mutation: a second read-only view of the stored value.
- Side effects: {{the files, rows or messages this app writes, and how to read them}}.

Done when each recipe bullet has an artifact on disk.

### 5. Clean up

```sh
{{teardown commands: kill the recorded PID, remove the run's data directory,
remove verification scaffolding}}
```

Done when {{the port check}} shows the port free, the run's data directory is
gone, and every artifact is still in `{{evidence dir}}/<run-id>/`.

## Helpers

| Script | Does | Run |
|---|---|---|
| `scripts/{{name}}` | {{what it does}} | `{{exact invocation}}` |

## Report

One line per sub-feature and entry point, worst first:

```
🔴 <feature-id> via <entry point>: <what failed, the command, the artifact path>
🟡 <feature-id> via <entry point>: <unreachable, with the unmet precondition>
🟢 <feature-id> via <entry point>: <the observed end state, the artifact path>
```

## Do

- Drive the entry points the feature file lists, the way a user reaches them.
- Check side effects next to the visible state.
- Wait for a ready signal or a result. Never wait a fixed time.
- Prefer stable handles over coordinates and tab order.
- When the safe path is a dry run or test mode, observe what it skips: files,
  network, git refs. Do not trust its name.

## Don't

- Don't call internal setters or test-only endpoints. Drive the user path.
- Don't kill by process name. Kill the PID this run recorded.
- Don't weaken a recipe until it passes. Report the failure and add the cause
  to the feature's `Gotchas`.
- Don't report one entry point as proof for another. Drive each one, or report
  it skipped.
- Don't mock past a production boundary. Mock only where production already
  isolates the external system.
- Don't delete evidence in cleanup. Remove instances and scratch state only.
````
