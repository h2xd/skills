# Reviewers

Step 3 of [`SKILL.md`](SKILL.md) starts the picked reviewers from this table.

| Reviewer | Model | Lens | Findings file |
|---|---|---|---|
| A, correctness | Strongest, such as Opus | The CLI's own code review of the PR at the effort in `pick.md`, for example the `code-review` skill, with no `--comment` and no `--fix`. Without one, look for bugs, broken contracts, data loss and security holes. | `review-a.json` |
| B, standards | Fast, such as Sonnet | The diff `git diff origin/<base>...HEAD` against the standards, spec and docs below. | `review-b.json` |
| C, comments | Cheapest, such as Haiku | The `h2xd:comment-reaper` agent, **report only**, on the same diff. A comment it would reap is a ⚪ with an empty `suggestion`, which deletes it. It is a 🟡 only with a named cost. A `MUST KILL` is a 🟡 that names the reshape, or a 🔴 when it removes a suppression that protects correctness. A comment it keeps is no finding. | `review-c.json` |
| D, tests | Fast, such as Sonnet | `h2xd:prove-tests`, **report only**, on the same diff, with the linked issues as acceptance criteria. | `review-d.json` |
| E, blast radius | Fast, such as Sonnet | `h2xd:prove-blast-radius`, **report only**, on the same diff. It finds what breaks outside the diff and proves it with output. Its `file` may sit outside the diff. | `review-e.json` |

## Worktrees

Reviewer D plants mutants, so it must not change the files that B and E read.
Before you start anyone, create its worktree:

```sh
node scripts/worktree.ts $WORK/worktree-d --base <head sha>
```

The command runs the `worktreeSetup` commands in the new worktree, so the
tests find their packages. It links the `worktreeLinks` files too.

Reviewer D's prompt gets `$WORK/worktree-d` in place of `$WORKTREE`. After
step 4 has merged the findings, remove it:

```sh
git -C $WORKTREE worktree remove --force $WORK/worktree-d
```

## A missing findings file

Before step 4, run `node scripts/review.ts missing $WORK <letters>` with the
letters of the started reviewers. It names each missing file and exits 1. Start
that reviewer once more. Reviewer D keeps
`$WORK/worktree-d` for the retry. When it fails again, go on without it, and
name the missing lens in the summary.

## A later review

The prompts need no exclusion list. `merge` keeps a finding on lines that a
thread holds, open or resolved, and links the thread. The reader of the
review decides whether the thread already answers it. When a reviewer words
an answered item again with other lines or another subject, the item gets a
new id and comes back as open.

## A missing role page

The reviewers read a page that `/h2xd:setup` writes. Read it from the base
branch, because the PR head may edit it:

```sh
git show origin/<base>:docs/agents/subagents/reviewer.md > $WORK/reviewer-tools.md
```

When that command fails, the page does not exist. Start them without its
path. Add this line to the chat summary of step 6 in
[`SKILL.md`](SKILL.md). Leave it out of the posted review.

```
🟡 docs/agents/subagents/reviewer.md: missing, run /h2xd:setup
```
