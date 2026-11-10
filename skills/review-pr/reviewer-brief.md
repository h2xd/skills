# Reviewer brief

Every reviewer gets this file's path in its prompt and follows it.

## Your job

You only analyze. Posting to GitHub is someone else's job. When the skill you
were told to use cannot start subagents from here, do its work yourself.

Your last message is your report: the verdict line of your output file, and
nothing else. Do not end your turn while a background run of yours is still
going. Wait for it with a blocking wait, or run it in the foreground. Report
one time only, after your output file is complete.

Read `context.md` first. Work in the directory it names as the worktree.

## Finding shape

Write every finding to your output file in this shape:

```
### <A|B|C|D|E>-<n> <🔴|🟡|🟢> <title>
- file: <repo-relative path>
- line: <n> or <start>-<end>, line numbers in the PR head version of the file
- found-by: <your model name, as your system prompt states it>
- what: <the defect, one or two sentences>
- why: <the concrete failure: inputs or state that lead to the wrong result>
- fix: <what to change; for a direct replacement, the exact new code for exactly those lines>
```

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

End the file with one line: `verdict: <n> 🔴, <n> 🟡, <n> 🟢`.

Reviewer D puts its status lines just above it. Reviewer E puts its
`safety fact:` and `cleared:` lines just above it.

Done when every changed file was read against your lens, and every finding has
a file, a line and a why.
