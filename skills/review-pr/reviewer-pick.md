# Reviewer pick

Step 2 of [`SKILL.md`](SKILL.md) picks the reviewers from the diff, so a docs
fix does not pay for a mutation run.

## Count

```sh
git -C $WORKTREE diff --shortstat origin/<base>...HEAD
git -C $WORKTREE diff --name-only origin/<base>...HEAD
```

Leave out lock files and generated files, such as `package-lock.json`,
`*.lock`, `dist/` and `*.min.js`, from both counts.

## Pick

Take the first row that matches:

| Diff touches | Reviewers |
|---|---|
| A 🔴 one-way door line in the PR body | A, B, C, D, E |
| Only docs, such as `*.md` under `docs/` and `README.md` | B, C |
| Only test files | A, D |
| Only config, CI or hooks, such as `.github/`, `*.json`, `*.yml` and `.githooks/` | A, B, E |
| Code, at most 100 changed lines | A, C, D |
| Code, more than 100 changed lines | A, B, C, D, E |

- A file that an agent reads as instructions, such as a `SKILL.md`, an agent
  file or `CLAUDE.md`, counts as code, not as docs.
- Leave out Reviewer D when `mutation.enabled` in `agents.config.json` is
  `false`.
- Reviewer A runs at medium effort for at most 100 changed lines, and at high
  effort above that.

## Big diff

`review.askAboveFiles` in `agents.config.json` is the limit, default `20`.
When more files change than that, ask once with clickable options, through
the CLI's question tool, such as AskUserQuestion:

- **All five, high effort**, recommended. Name the file count.
- **The pick from the table.**
- **Cancel.**

## Record

Write `$WORK/pick.md`: the counts, the row that matched, the reviewers and
A's effort. The drafter cites it in the review body.

Done when `pick.md` names every reviewer to launch and the reason for each
one left out.
