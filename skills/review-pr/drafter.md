# Drafter brief

The drafter turns the reviewers' findings into one GitHub review. It gets this
file's path, `context.md`, every `review-*.md`, and `reviewer-brief.md` for the
severity scale.

## 1. Merge

Two findings on the same file and overlapping lines with the same cause become
one. Keep the higher severity and both `found-by` models. Drop findings that
repeat an existing review thread from `context.md`.

Done when no two findings share a file, an overlapping line and a cause.

## 2. Place

Run `gh pr diff <n>`. A finding goes inline only when its lines sit inside a
diff hunk on the new side. Everything else goes in the summary body under
"Outside the diff".

Done when every finding is inline or in the "Outside the diff" list.

## 3. Write each inline comment

Use the [Conventional Comments](https://conventionalcomments.org/) format. Pick
the label from the severity:

| | Label |
|---|---|
| 🔴 | `issue (blocking)`, `todo (blocking)` |
| 🟡 | `suggestion (non-blocking)`, `issue (non-blocking)`, `question (non-blocking)` |
| 🟢 | `nitpick (non-blocking)`, `thought`, `note`, `praise` |

````
<label> (<decoration>): <subject>

<discussion: what is wrong and the concrete failure>

```suggestion
<replacement lines, only when `fix` is a direct replacement of exactly these lines>
```

Co-Authored-By: <found-by model> <noreply@anthropic.com>
````

- Write one `Co-Authored-By` line per `found-by` model. Use the format of
  `## Commits` in the agent instructions file, for example
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- A suggestion block over several lines needs `start_line` and `line` set to
  the span.
- A Reviewer D comment quotes the mutant from its `what` line exactly, as
  `` `<original>` → `<mutant>` ``. `h2xd:review-fix` plants it again from
  there. Its fix is a test, so it gets no `suggestion` block.
- A Reviewer E finding often sits outside the diff. Place it by its `file` and
  `line` like any other. Keep its proof command and output in the discussion,
  in a code block.

A comment with more than one reasonable fix gets a choice block. It goes after
the discussion and the suggestion block, before the `Co-Authored-By` lines, in
exactly this template:

```
- Suggestion A (recommended): <fix>
- Suggestion B: <fix>
- Suggestion C: <fix>

Note: Reply with A, B, or C. If you reply with nothing Suggestion A will be used.
```

A is the recommended fix, and the `suggestion` block implements it. With two
options, the note reads "Reply with A or B." A comment with one sensible fix
gets no choice block.

Done when every inline comment has a label, a subject and a `Co-Authored-By`
line for each `found-by` model.

## 4. Pick the event

Any 🔴 means `REQUEST_CHANGES`, otherwise `APPROVE`. GitHub refuses both on
your own PR. So when the `gh` login equals the PR author, use `COMMENT` and
state the intended verdict in the first line of the body.

Done when the event is one of `REQUEST_CHANGES`, `APPROVE` or `COMMENT`.

## 5. Write the summary body

1. The verdict and why, in one line.
2. A count per severity.
3. The 🔴 and 🟡 findings, one line each, with `path:line` and the action.
4. The "Outside the diff" section.
5. Reviewer D's status lines and Reviewer E's `safety fact:` line, when they
   ran.
6. A `Co-Authored-By` line for each model that took part.

Read `../setup-tone/github-text.md` and `../add-soul/SKILL.md` directly, and
write all prose to their rules. Keep each comment to the point: the defect, the
failure, the fix.

Done when the body has all six parts, in that order.

## 6. Write two files

- `$WORK/review.json`, the body for
  `POST /repos/<owner>/<repo>/pulls/<n>/reviews`:
  `{"commit_id": "<headRefOid>", "event": "...", "body": "...", "comments": [{"path", "line", "side": "RIGHT", "body", "start_line"?, "start_side"?}]}`.
- `$WORK/preview.md`, the same content for a human. It holds the event, the
  body, then each comment under its `path:line`, choice blocks included.

Done when `jq . "$WORK/review.json"` parses and
`node scripts/review.ts options --validate "$WORK/review.json"` prints a line
that starts with `ok`. Also, every comment's line sits in a hunk of
`gh pr diff`, and every finding is inline, in the body, or listed in
`preview.md` as merged or dropped with the reason.
