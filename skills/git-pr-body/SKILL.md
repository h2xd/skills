---
name: git-pr-body
description: Write a pull request body that opens with the closing keyword, one line per issue, then shows the change as a diagram, gives before and after evidence, and rates the merge danger. Lints the body, pushes, and opens or edits the PR without asking, as a draft for a one-way door. Use when opening a PR, when a branch is ready for review, when rewriting a PR body, or when `node scripts/lint-pr-body.ts` fails in CI.
---

# PR body

A reviewer reads the body before the diff. A wall of prose sends them into the
diff twice, once to learn what changed and once to check it. This skill writes
a body they check in a minute: the issues it closes, the change as a picture,
proof it works, and what a bad merge breaks.

- **Convention.** `## Pull requests` in `CLAUDE.md` or `AGENTS.md`.
- **Enforcement.** `scripts/lint-pr-body.ts`, which CI runs on every PR. When
  the two disagree, the script wins.
- **Keyword.** `jq -r .pullRequests.closingKeyword agents.config.json`. This
  skill writes the default, `Closes`. Use the configured word instead.
- **No config.** Without `agents.config.json`, the repo has not run
  `h2xd:setup`. Follow the instructions file and skip step 6.
- **Body file.** `$BODY_FILE` is a scratchpad file, such as `pr-body.md`.
  Write the body there from step 3 on.

## Steps

### 1. Read the branch

Find the base with `git symbolic-ref --short refs/remotes/origin/HEAD`, minus
`origin/`, unless the user named one. Run `git log --format='%h %s%n%b' <base>..HEAD`,
`git diff <base>...HEAD` and `git status --short`. When the tree is dirty,
commit the work with `h2xd:git-commit` first, then read the log again.

Done when you can say what the PR changes and why without naming a file.

### 2. Find the issues

Collect every `Closes:`, `Fixes:` and `Refs:` footer from the commits in step 1.
Read each issue with the **View** operation in `docs/agents/issue-tracker.md`.
Look for more with **Search**.

- An issue the PR finishes gets a `Closes #<n>` line.
- An issue it only works toward gets a `Refs #<n>` line in the summary.

When no issue is finished, CI rejects the body. Create one with the **Create**
operation. Its title is the PR title from step 5. Its body says what the
commits change and why, in two or three bullets. Its label is the bug role's
label from the `## Triage` table for a `fix`, and the enhancement role's
label otherwise. The PR then closes it.

Done when every issue number is read, and each is marked closes or refs.

### 3. Write the closing lines

Open `$BODY_FILE` with one `Closes #<n>` line per finished issue, then one
blank line. GitHub links only the number right after the keyword, so
`Closes #3, #4` closes issue 3 alone.

Done when `sed -n '1,/^$/p' "$BODY_FILE"` prints only closing lines.

### 4. Write the sections

Fill the template, per
[`../setup-tone/github-text.md`](../setup-tone/github-text.md). Skip preambles.
Name things by the glossary headings, as `h2xd:docs-glossary` sets them.

The template and the rule for each section are in
[`sections.md`](sections.md).

Done when every section has content or says why it does not apply, and each
diagram fits on one screen.

### 5. Write the title

Use the `## Commits` subject form, `type(scope): summary`, because a squash
merge makes the title the commit subject. A one-commit PR reuses that subject.

Done when the title fits the subject limit in `## Commits`.

### 6. Lint the body

Run `PR_BODY="$(cat "$BODY_FILE")" node scripts/lint-pr-body.ts`. It is the
check CI runs. Fix the line it names and run it again.

Done when it exits 0.

### 7. Pick ready or draft

Read the door line from step 4. A 🔴 one-way door opens as a draft, so a
person marks it ready. Everything else opens ready for review. Do not ask.

Done when you know ready or draft.

### 8. Push and open

Push with `git push -u origin HEAD`. Open the PR with the **Open a PR**
operation in `docs/agents/issue-tracker.md`, with `$BODY_FILE` as the body.
Make it a draft when step 7 says so. For an existing PR, use the edit form
of the same operation. A local tracker has no PRs, so stop after the push.

- **Push rejected, remote ahead:** stop and report. Never force-push.
- **Push blocked by a hook:** stop. Tell the user to run the push, or to
  allow plain pushes with `h2xd:git-guardrails`.

Done when the operation prints the PR URL, and the body there matches
`$BODY_FILE`.

### 9. Report

```
🔴 <step>: <what blocked the push or the PR, and the next action>
🟡 <item>: <an issue created in step 2, or a draft for a one-way door>
🟢 <PR URL>: <title>, ready or draft, closes #<n>
```

Done when the PR URL, or the blocker, has its line.

## Do

- Open the body with the closing lines, before any heading.
- Paste the evidence output. A reviewer trusts a log, not a claim.
- Run `node scripts/lint-pr-body.ts` before you show the body.

## Don't

- Don't write `Fixes`, `Resolves` or prose such as "resolves #64". Write the
  configured keyword, `Closes #<n>`.
- Don't put two issues on one closing line. Write one line per issue.
- Don't close an issue the PR only works toward. Use `Refs #<n>` in the summary.
- Don't ask before you push or open. Report the URL after. Make a one-way
  door a draft instead.
- Don't pass the body with `--body`. Shell quoting breaks backticks. Use `--body-file`.
- Don't paste the whole diff as the summary. Pick one view from `visuals.md`.
