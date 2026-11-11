# Reviewer brief

Every reviewer gets this file's path in its prompt and follows it.

## Your job

You only analyze. Posting to GitHub is someone else's job. When the skill you
were told to use cannot start subagents from here, do its work yourself.

Your last message is your report: the validate line, such as
`ok: 3 findings checked`, and nothing else. Do not end your turn while a
background run of yours is still going. Wait for it with a blocking wait, or
run it in the foreground. Report one time only, after your output file is
complete.

Read `context.md` first. Work in the directory it names as the worktree.

## Output file

Write one JSON file, `review-<x>.json`, where `<x>` is your letter in lower
case. This is the shape:

```json
{
  "reviewer": "B",
  "findings": [
    {
      "id": "B-1",
      "severity": "red",
      "file": "src/undo.ts",
      "lines": [12, 14],
      "label": "issue",
      "subject": "undo drops the last entry",
      "body": "The defect, then the concrete failure: the input or state that leads to the wrong result.",
      "suggestion": "the exact new code for exactly lines 12 to 14",
      "options": ["first fix", "second fix"],
      "found-by": ["<your model name, as your system prompt states it>"]
    }
  ],
  "status": ["safety fact: <sentence> (level 3)"]
}
```

- `id` is your letter, a dash and a number, such as `B-1`. Each id is used once.
- `severity` is `red`, `yellow` or `green`. See Severity below.
- `file` is a repo-relative path. It can sit outside the diff.
- `lines` is `[line]` or `[start, end]`, in the PR head version of the file.
- `label` is a Conventional Comments label. `red` takes `issue` or `todo`.
  `yellow` takes `suggestion`, `issue` or `question`. `green` takes `nitpick`,
  `thought`, `note` or `praise`.
- `subject` is one line. `body` is the defect and the concrete failure. Keep a
  proof command and its output in `body`.
- `suggestion` is optional. Give it only when the fix replaces exactly the
  lines in `lines`. It holds the new code and nothing else. An empty string
  deletes the lines.
- `options` is optional. Give 2 or 3 one-line fixes, the best first, only when
  more than one fix is reasonable. A `suggestion` implements the first one.
- `found-by` lists your model name.
- `status` is optional. Reviewer D puts its status lines in it, and Reviewer E
  puts its `safety fact:` and `cleared:` lines in it. Leave it out, or leave
  it empty, for the others.

A comment you would keep is not a finding. Leave it out.

Write no `verdict` line and no text outside the JSON. The merge step reads
only the JSON.

## Check your file

```sh
node scripts/review.ts findings --validate <your file>
```

It prints `ok` when the file is valid. Otherwise it names each bad finding and
field. Correct the file and run it again, until it prints `ok`. Use the
`scripts/review.ts` of the worktree that `context.md` names.

## Severity

Severity is the finding's status for the merge:

| | Meaning |
|---|---|
| 🔴 | Blocks the merge: a bug, a security hole, data loss, a broken contract or test, a spec or ADR violation |
| 🟡 | Needs attention, the merge can go ahead: a standards break, a missing test, a risky pattern, code a reader will misread |
| 🟢 | Fine to leave: a nit, an idea, or praise worth saying |

Use 🔴 only for a failure you can describe concretely. Report 🟢 praise only
when it teaches the author something.

## End

Done when `findings --validate` prints `ok`, every changed file was read
against your lens, and every finding has a file, lines and a body that names
the failure.
