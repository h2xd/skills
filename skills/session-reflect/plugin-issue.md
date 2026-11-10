# Plugin issue

Step 5 of [`SKILL.md`](SKILL.md) sends a lesson about an h2xd skill to the
plugin's tracker, `h2xd/skills`. That tracker is public. The user's repo is
often private. The issue carries the idea, never the repo it came from.

## Rules

- **Ask every time.** Show the full title and body first. Then ask with
  clickable options, through the CLI's question tool, such as AskUserQuestion:
  send, edit, or drop. Send only after "send". A step 4 answer of "file as an
  issue" is not this yes.
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

Done when the user saw the draft and chose send, edit or drop. On edit, change the draft, check it again and show it again. On
send, the issue has a URL.
