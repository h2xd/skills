---
name: review-pr
description: Review a PR, the given number or the current branch's, with up to five reviewers picked from the diff, then post one GitHub review that approves or requests changes, without asking. The reviewers cover correctness, standards, comments, tests by mutation check, and blast radius. Findings become Conventional Comments. Use for a code review of a PR, or after opening one. review-fix acts on the result.
argument-hint: "[pr-number]"
---

# Review PR

One reviewer reads the diff and sees the diff. Up to five reviewers, each with
one lens, also see the caller that breaks, the test that proves nothing and the
comment that lies. You brief them, merge what they find, and post one review.

You are the orchestrator. You gather context, pick and brief the reviewers,
post and summarize. Subagents do the reading and writing. Every hand-off goes
through a file in your scratchpad, called `$WORK` below, so file dumps stay out
of your context.

Severity is the finding's status for the merge. 🔴 blocks it, 🟡 needs
attention, 🟢 is fine to leave. [`reviewer-brief.md`](reviewer-brief.md) has the
full scale.

The `node scripts/review.ts` subcommands from `h2xd:setup` do the mechanical
work. Run one command per shell call, never chained with `&&` or `;`.

## Steps

### 1. Gather context

`<pr>` is the PR number passed as the argument. Without one, leave it out and
`gh` picks the current branch's PR.

When a number was passed, compare the PR's `headRefName` with
`git branch --show-current`. Read the first with
`gh pr view <pr> --json headRefName`. On a mismatch, review from a worktree of
the PR's branch:

```sh
node scripts/review.ts worktree <headRefName>
```

It prints the path. It creates the worktree and runs `worktreeSetup`
when needed. The shell stays in the session's directory, so run every later
command against that path, with `git -C <path>`, `node <path>/scripts/review.ts`
or absolute paths. `$WORKTREE` is that path, or the current directory.

```sh
node scripts/review.ts context <pr> --worktree $WORKTREE --out $WORK/context.md
```

- **No PR found:** stop. Tell the user to open one or pass its number.
- **"Head mismatch" warning:** the local head differs from the pushed head.
  Ask whether to push first. This is one of the two times you ask.
- **"Dirty tree" or "Wrong branch" warning:** go on. The reviewers read the
  pushed head. Say so in the summary.

Done when `context.md` names `$WORKTREE`, the PR number and URL, owner and
repo, the base branch, the head SHA, the PR author, the `gh` login, every
changed file, every linked issue with its text, every page that links a changed
file, and the existing review threads.

### 2. Pick the reviewers

Follow [`reviewer-pick.md`](reviewer-pick.md). It counts the diff, picks the
reviewers and the effort for Reviewer A, and asks only for a big diff.

Done when `$WORK/pick.md` exists.

### 3. Launch the reviewers

Start the picked reviewers in one message, as background subagents, through
the CLI's subagent tool, such as Agent. Each prompt holds the path to `context.md`,
`$WORKTREE`, its lens, its output file, and the path to
[`reviewer-brief.md`](reviewer-brief.md).

| Reviewer | Model | Lens | Output |
|---|---|---|---|
| A, correctness | Strongest, such as Opus | The CLI's own code review of the PR at the effort in `pick.md`, for example the `code-review` skill, with no `--comment` and no `--fix`. Without one, look for bugs, broken contracts, data loss and security holes. | `review-a.md` |
| B, standards | Strongest, such as Opus | The diff `git diff origin/<base>...HEAD` against the standards, spec and docs below. | `review-b.md` |
| C, comments | Cheapest, such as Haiku | The `h2xd:comment-reaper` agent, **report only**, on the same diff. A comment it would reap is a 🟡 with a `suggestion` that deletes it. A `MUST KILL` is a 🟡 that names the reshape, or a 🔴 when it removes a suppression that protects correctness. | `review-c.md` |
| D, tests | Fast, such as Sonnet | `h2xd:prove-tests`, **report only**, on the same diff, with the linked issues as acceptance criteria. | `review-d.md` |
| E, blast radius | Strongest, such as Opus | `h2xd:prove-blast-radius`, **report only**, on the same diff. It finds what breaks outside the diff and proves it with output. Its `file` may sit outside the diff. | `review-e.md` |

Reviewer B checks three things:

- **Standards:** the agent instructions file, every decision record in
  `context.md`, and `../code-quality/SKILL.md` with `../code-quality/smells.md`.
  Give absolute paths. A documented repo standard beats the baseline. A smell
  is a judgment call, never 🔴 alone.
- **Spec:** the linked issues and the PR body. Report what is missing, what
  nobody asked for, and what looks done but is wrong. Quote the spec line.
- **Docs:** every page `context.md` lists for a changed file. A page the diff
  makes untrue, a new term without a glossary entry, or a contradicted record
  is 🟡. Breaking an accepted record is 🔴.

Done when every launched reviewer's file exists. When one fails, start it
once more. When it fails again, go on without it, and name the missing lens in
the summary.

### 4. Draft the review

Start one subagent on a fast model, such as Sonnet. Give it the paths to
`context.md`, every `review-*.md`, `reviewer-brief.md` and
[`drafter.md`](drafter.md), which holds its instructions, and `pick.md`.

Done when the checks at the end of `drafter.md` pass.

### 5. Post

```sh
gh api repos/<owner>/<repo>/pulls/<n>/reviews --method POST --input "$WORK/review.json" --jq .html_url
```

A 422 names the comment GitHub rejected, usually a line outside the diff. Move
that comment to the body under "Outside the diff" and post again.

Done when the call returns a review URL.

### 6. Summarize in chat

Lead with the verdict, the review URL and the reviewers that ran. Then give
one line per finding, worst first:

```
🔴 <path:line>: <action to take>, reviewer <A-E>
🟡 <path:line>: <action to take>, reviewer <A-E>
🟢 <n> optional comments, <n> merged, <n> dropped, <n> moved out of the diff
```

When you created a worktree, name its path. `git worktree remove <path>`
cleans it up.

Done when every 🔴 and 🟡 finding has its line.

## Do

- Read the PR head from a worktree when the branch differs.
- Give every subagent file paths, not pasted content.
- Merge duplicate findings and keep every `found-by` model.
- Quote a Reviewer D mutant exactly, so `h2xd:review-fix` can plant it again.

## Don't

- Don't ask before you post, 🔴 included. Post, then summarize. Ask only for a
  head mismatch or a big diff.
- Don't mark a smell 🔴 on its own. Name the concrete failure, or make it 🟡.
- Don't approve your own PR, because GitHub refuses it. Post `COMMENT` with
  the verdict in the first line.
- Don't paste reviewer output into your context. Read the counts and subjects.
