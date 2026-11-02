---
name: git-pr-body
description: Write a pull request body that opens with the closing keyword, one line per issue, then shows the change as a diagram, gives before and after evidence, and rates the merge danger. Lints the body, shows it, and opens or edits the PR only after a yes. Use when opening a PR, when rewriting a PR body, or when `node scripts/lint-pr-body.ts` fails in CI.
disable-model-invocation: true
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
`git diff <base>...HEAD` and `git status --short`. When the tree is dirty, ask
whether to commit the work first with `h2xd:git-commit`.

Done when you can say what the PR changes and why without naming a file.

### 2. Find the issues

Collect every `Closes:`, `Fixes:` and `Refs:` footer from the commits in step 1.
Read each issue with the **View** operation in `docs/agents/issue-tracker.md`.
Look for more with **Search**.

- An issue the PR finishes gets a `Closes #<n>` line.
- An issue it only works toward gets a `Refs #<n>` line in the summary.

When no issue is finished, CI rejects the body. Stop and ask: create an issue
with the **Create** operation, or leave the PR unopened. Creating an issue is
public, so it needs a yes too.

Done when every issue number is read, and each is marked closes or refs.

### 3. Write the closing lines

Open `$BODY_FILE` with one `Closes #<n>` line per finished issue, then one
blank line. GitHub links only the number right after the keyword, so
`Closes #3, #4` closes issue 3 alone.

Done when `sed -n '1,/^$/p' "$BODY_FILE"` prints only closing lines.

### 4. Write the sections

Fill the template below, per
[`../setup-tone/github-text.md`](../setup-tone/github-text.md). Skip preambles.
Name things by the glossary headings, as `h2xd:docs-glossary` sets them.

```markdown
## Summary

- <what changes, at most three bullets>

Refs #<n>

<diagram, diff sketch, or tree>

## Evidence

- **Before:** <screenshot, output, or failing test run>
  **After:** <screenshot, output, or passing test run>

## Merge danger

🟢 two-way door | 🔴 one-way door: <why>

🟡 blast radius: <one word>. <optional: what a bad merge would break>
```

- **Summary.** Pick the smallest view that makes the point, from
  [`visuals.md`](visuals.md). One view is usual. Three is the most. Drop the
  `Refs` line when the PR finishes every issue it touches.
- **Evidence.** A screenshot is best when the change is visible and the
  environment can take one. Next best is a test or command run. Name the test
  that failed before and passes now, and put long output in `<details>`. Run
  it yourself. Never write that a check passed without its output.
- **Door.** Keep one door line. A two-way door is cheap to revert. A one-way
  door is not, such as a migration that drops data, a published API or
  package version, a deleted record, or a message already sent.
- **Blast radius.** Write one word for the widest scope a bad merge reaches,
  such as `module`, `service`, `consumers` or `users`. Consider layout shift,
  broken consumers, mobile widths and stored data. For a one-way door, run
  `h2xd:prove-blast-radius` and cite its confirmed risks.

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

### 7. Show and ask

Opening a PR is public, so print the title, the base branch and the whole
body. Offer open, draft, or edit first as clickable options, through the CLI's
question tool, such as AskUserQuestion. On an edit, change the file and return
to step 6.

Done when the user picked open or draft.

### 8. Push and open

Push with `git push -u origin HEAD`. Open the PR with the **Open a PR**
operation in `docs/agents/issue-tracker.md`, with `$BODY_FILE` as the body.
Make it a draft when the user chose it. For an existing PR, use the edit form
of the same operation. A local tracker has no PRs, so stop after the push.

Done when the operation prints the PR URL, and the body there matches
`$BODY_FILE`.

## Do

- Open the body with the closing lines, before any heading.
- Paste the evidence output. A reviewer trusts a log, not a claim.
- Run `node scripts/lint-pr-body.ts` before you show the body.

## Don't

- Don't write `Fixes`, `Resolves` or prose such as "resolves #64". Write the
  configured keyword, `Closes #<n>`.
- Don't put two issues on one closing line. Write one line per issue.
- Don't close an issue the PR only works toward. Use `Refs #<n>` in the summary.
- Don't push or open the PR without a yes. Show the body and ask in step 7.
- Don't pass the body with `--body`. Shell quoting breaks backticks. Use `--body-file`.
- Don't paste the whole diff as the summary. Pick one view from `visuals.md`.
