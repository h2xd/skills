# Plugin issue

## Rules

- **Never create it.** Run no command that creates, sends or files an issue
  in `h2xd/skills`. Show the draft only.
- **Ask every time.** Show the full title and body first. Then ask with
  clickable options, through the CLI's question tool, such as AskUserQuestion:
  done, edit, or drop. A step 4 answer of "file as an issue" means "show the
  draft".
- **Hide the repo.** The issue never names the user's repo, its owner, its
  product, its people, or its domain words.
- **No code.** No code, diffs, file paths, commands from the session, logs,
  error output or config values from the user's repo.
- **No references.** No links, issue or PR numbers, commit SHAs, branch names
  or URLs of the user's repo, or of any other private repo.
- **No quotes.** Do not quote the transcript. Retell the incident as a general
  pattern: "an agent committed after a failed staging step".
- **The idea only.** Name the h2xd skill and its step, the gap, and how the
  skill could close it.

## Body

```markdown
## Summary

- `h2xd:<skill>`, step <n>: <the gap, in one sentence>
- Proposed: <the fix, and its level from the ladder>

## What happened

- <the pattern, in general words, with no detail from the user's repo>

## Why it matters

- <what an agent does wrong without the fix>
```

The title is the rule from step 2, at most 72 characters.

## Write from the lesson

Write the draft from the lesson of step 2 and the fix of step 3. Read nothing
else for it. State only facts about the h2xd skill: what it says, what an
agent did, and what the skill could say instead.

## Show the draft

Show the title and the body in one block the user can copy. Name the
tracker to paste it into: `h2xd/skills`, a new issue.

Done when the user saw the draft with its title and body, and chose done,
edit or drop. On edit, change the draft, check it again and show it again.
