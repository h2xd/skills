---
name: git-commit
description: Write a commit message to this repo's convention, with the reason, the rejected option and the records touched in the footer. Use before committing, when rewording a commit, or when the commit-msg hook rejects a message.
---

# Git commit

Months from now, a session opens this repo with no memory. `git log` is all it
has, so every commit message is a note to that reader.

The `commit-msg` hook rejects a malformed message. It cannot tell if the type
is the nearest one, if the body is worth reading, or if the footer carries what
the conversation decided. This skill makes those three calls.

## Before you start

- **The convention** is `## Commits` in the agent instructions file, `CLAUDE.md`
  or `AGENTS.md`.
- **The enforcement** is `scripts/lint-commit-message.ts`, which reads
  `agents.config.json`. When the two disagree, the script wins, because it
  rejects you. Read the closed sets with `jq .commits agents.config.json`.
- **No `agents.config.json`** means the repo has not run `h2xd:setup`. Follow
  the instructions file and the history, and skip step 6.
- **`$MESSAGE_FILE`** is a file in your scratchpad, such as
  `commit-message.txt`. Write the message there from step 3 on.

Two shortcuts:

- **Reword a commit.** Read it with `git show <sha>`, then run steps 2 to 6.
  For the last commit, amend with `git commit --amend -F "$MESSAGE_FILE"`.
- **Recover from a rejection.** The hook names the failed rule.
  `grep -n 'errors.push' scripts/lint-commit-message.ts` finds the check. Fix
  that rule and leave the rest alone.

## Steps

### 1. Read the change

Run `git status --short` first, because a diff never shows an untracked file.
Then read `git diff`, `git diff --staged`, and the new files. Read precedent of
the same type, not the last three commits, for example
`git log -5 --format='%B' --grep='^chore(tooling)'`.

Done when you can say what changed and why without naming a file.

### 2. Pick the type, then the scope

Take the nearest value in each closed set. When two fit, use the table in
[`judgment.md`](judgment.md). When none fits, stop and leave the commit
unmade. Say that the set needs widening, which takes a decision record through
`h2xd:docs-adr`.

Done when you can name the value you rejected and why yours is nearer.

### 3. Write the subject

Write `type(scope): summary`, inside the character limit.

Done when the subject makes sense with no body attached.

### 4. Write the body

Write one paragraph that says what is different now. Add a second paragraph
only when the change has two parts, such as a defect found on the way. A
number the decision rests on goes here too, as the `measurement` token. For a
`fix`, the body names the root cause as the `cause` token.

- Start no line with `#`, because git strips it. Write `issue 33`, not `#33`.
- A sentence about a record touched, an option dropped, or why this shape won
  goes in the footer.

Done when every sentence says what is different now or gives the measurement,
and each paragraph is under 125 words:

```sh
awk 'BEGIN{RS=""} /^(Refs|Closes|Fixes|Co-Authored-By|BREAKING CHANGE):/{exit} NR>1{print NF" words"}' "$MESSAGE_FILE"
```

### 5. Write the footer

Open the footer with one of five tokens, colon included: `Refs:`, `Closes:`,
`Fixes:`, `BREAKING CHANGE:`, `Co-Authored-By:`. The linter reads everything
before the first such line as body. So a footer that opens with `Resolves:` or
`Ticket:` becomes a body paragraph. After the opening line, the footer may run
long.

Find the records this change touches, staged or not:

```sh
{ git diff --name-only; git diff --staged --name-only; git ls-files --others --exclude-standard; } | sort -u | xargs -I{} node scripts/find-docs.ts --links-to {} 2>/dev/null | sort -u
```

Find the open issues with the **List by label** or **Search** operation in
`docs/agents/issue-tracker.md`.

- A commit that finishes an issue says `Closes: #<n>`.
- A commit that works toward an issue says `Refs: #<n>`.
- The last line is the `Co-Authored-By` line exactly as `## Commits` writes
  it, for the model that runs.
- Add no session trailer.

Done when `grep -nE '^(Refs|Closes|Fixes|BREAKING CHANGE|Co-Authored-By):' "$MESSAGE_FILE"`
prints the footer's first line. Each of the tokens in
[`judgment.md`](judgment.md) is present or knowingly not applicable.

### 6. Lint the message

Run `node scripts/lint-commit-message.ts "$MESSAGE_FILE"`. It is the same
check the hook runs. Fix the message and run it again until it passes.

Done when it exits 0.

### 7. Run the repo checks

Run the lint, typecheck and test commands that the instructions file names. No
hook runs them, so a failure otherwise shows up only in CI. Fix only what your
change broke.

- `node scripts/lint-docs.ts` must pass, because `pre-commit` runs it. Its
  `note:` lines about pages not written yet are not failures.
- When a page links a changed file, per step 5's lookup, update that page in
  this commit, per `h2xd:docs-wiki`.

Done when every check exits 0, or you name a failure as already on the base
branch.

### 8. Stage and commit

Stage by path with `git add <paths>`, so unrelated work stays out. Commit with
`git commit -F "$MESSAGE_FILE"`. Leave the hooks on. When the hook rejects the
message, edit the file, run step 6 again, and commit again.

Done when `git log -1` shows the message and `git status --short` shows no
file of this change left unstaged.

## Do

- Read `git status --short` before any diff.
- Write the message to a file and pass it with `-F`.
- Put the reason and the rejected option in the footer.
- Run `node scripts/lint-commit-message.ts` yourself. When `node` is off
  `PATH`, the hooks skip the check and let the commit through.

## Don't

- Don't use `git commit -a`. It misses untracked files. Stage by path.
- Don't pass the message with `-m`. Each `-m` starts a new paragraph, and the shell expands backticks and `$`. Use `-F`.
- Don't write that a check passed. Step 7 gates the commit. Give the number a decision rests on instead.
- Don't widen a closed type or scope set in a commit. Stop and use `h2xd:docs-adr`.
- Don't skip the hook with `--no-verify`. Fix the message.
