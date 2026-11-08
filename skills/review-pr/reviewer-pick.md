# Reviewer pick

Step 2 of [`SKILL.md`](SKILL.md) starts only the reviewers the diff needs. A
small fix gets two agents. Only a critical or a large change gets all five.

## Run the script

Read the PR body's `## Merge danger` line. Pass `--one-way-door` when it says
🔴 one-way door.

```sh
node scripts/review.ts fleet --base <base> --worktree $WORKTREE --out $WORK/pick.md
```

It counts the changed files and lines, without lock files and generated files,
and writes the size, the reviewers, the effort for Reviewer A and the reasons.
The limits come from `review` in `agents.config.json`.

| Size | When | Reviewers |
|---|---|---|
| critical | A one-way door, or a path under `review.criticalPaths` | A, B, C, D, E |
| small | Fewer than 10 files and fewer than 500 lines | A and C. A docs-only change gets B and C |
| middle | Fewer than 20 files and fewer than 1000 lines | A and C, plus D for code, B for docs, E for config |
| large | Anything bigger | A, B, C, D, E, after a question |

A `SKILL.md`, an agent file or `CLAUDE.md` counts as code. D is left out when
`mutation.enabled` is `false`.

## Raise it to critical

The script sees paths, not meaning. Read the diff's file list. Run the script
again with `--one-way-door` when the change touches auth, payments, stored
data, secrets or a published API, even when no critical path names it.

## Ask for a large change

When `pick.md` says `Ask first: yes`, ask once with clickable options, through
the CLI's question tool, such as AskUserQuestion:

- **All five, high effort**, recommended. Name the file and line counts.
- **A middle review**: A, C and D.
- **Cancel.**

Done when `pick.md` exists, and a large change has the user's answer.
