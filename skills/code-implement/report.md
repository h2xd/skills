# The first line of the report

Step 7 of [`SKILL.md`](SKILL.md) starts the report with this line:

```
<merge state>: <x> blocking, <y> non-blocking
```

## The merge state

Read the PR with the **PR status** operation in `docs/agents/issue-tracker.md`,
after the last push. Write the first state in this table that applies:

| Merge state | When |
|---|---|
| `no PR` | The tracker has no PRs, or the PR did not open |
| `unknown` | The tracker page has no **PR status** row, or the state is still unknown after the second read |
| `draft` | The PR is a draft |
| `cannot merge` | The report has a 🔴 line, such as a criterion that is not built or a blocking thread that is open |
| `checks pending` | A check still runs, and nothing else stops the merge |
| `can merge` | The tracker says the PR can merge. On GitHub, `mergeStateStatus` is `CLEAN` or `HAS_HOOKS`. On GitLab, `detailed_merge_status` is `mergeable` |
| `cannot merge` | Every other value from the tracker |

Some states add a line to the report:

- **No PR status row:** add
  `🟡 docs/agents/issue-tracker.md: no PR status row, run /h2xd:setup`.
- **`draft`:** add a 🟡 line with the reason for the draft.
- **`cannot merge` from the tracker:** add a 🔴 line with the value you read
  and its cause, such as a failing check, a conflict or a missing review.
  `../next/SKILL.md` explains the values and names the skill that comes next.

A tracker can report one value for a pending check and for a failing check.
When the tracker's CLI lists the checks, such as `gh pr checks`, use it to
tell them apart. A failing check is `cannot merge`.

## The counts

🔴 blocks the merge and 🟡 does not. `<x>` is the number of 🔴 lines in the
report, and `<y>` is the number of 🟡 lines. Count after you add the lines
above. A 🔴 line makes the state `cannot merge`, also when the tracker says
that the PR can merge.

A report looks like this:

```
checks pending: 0 blocking, 1 non-blocking
🟡 follow-up: file a ticket for the stale page docs/undo.md
🟢 #42: 3 criteria built, 4 commits, <PR URL>, approve
```
