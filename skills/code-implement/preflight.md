# Preflight

Run these two checks before step 1 of `SKILL.md`.

## Subcommands

Run `node scripts/implement.ts` with no arguments. It prints a `usage:` line.
The line must list `split`, `worktree` and `cleanup`. When the script or one
of them is missing, stop with one line: "run /h2xd:setup".

## Drift

Run the drift check per `../plan-triage/drift.md`. The plugin root is two
folders above `SKILL.md`. On exit 1, stop. When `changed:` names
`scripts/implement.ts` or a file in `scripts/implement/`, add a 🟡 line: the
copy may plan a checks criterion as a build worker.

Done when the usage line lists the three subcommands and the drift check
exited 0.
