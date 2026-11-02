---
name: session-handoff
description: "Compact the conversation into a handoff document for a fresh agent. It writes what only the conversation knows and links records, issues and commits instead of copying them. Use when the user asks for a handoff, when context runs low, or before passing the work to another session."
argument-hint: "What will the next session work on?"
---

# Handoff

Picture a relay runner who reaches the next lane with an empty hand. The
next agent starts that way: no memory of this conversation. Give it what only
the conversation knows, which is the goal, the state, what failed and what
comes next.

Do not give it a copy of what the repo already records. A copy goes stale,
and the next agent then trusts the wrong version. Write out the first and
link the second.

A **durable record** is anything that outlives the conversation. Examples are
a decision record, a tracker issue, a wiki page, a glossary entry, a commit,
a pull request, and a plan or spec file.

When the user passes an argument, it names what the next session works on.
Shape the document around that focus and cut what does not serve it.

## Steps

### 1. Collect the durable records

List every record this conversation read, created or changed. Check:

- `git status --short`, `git branch --show-current`, and
  `git log --oneline <base>..HEAD` for the commits of this branch.
- The open pull request for the branch, if any.
- Tracker issues the conversation named. Read each with the **View**
  operation in `docs/agents/issue-tracker.md`.
- Pages under the docs root. The root is `docs.root` in `agents.config.json`
  and defaults to `docs/`. Run `node scripts/find-docs.ts --links-to <path>`
  for each changed file.
- Decision records with `node scripts/find-docs.ts --type Decision --search "<words>"`.
- Plan, spec or scratch files the conversation wrote.

Without `agents.config.json`, the repo is not set up yet. Use git and the
files the conversation named.

Done when each record has a path or URL, and you know which ones the next
agent must read.

### 2. Find what lives only here

Go through the conversation and list what no record holds:

- The goal and the user's constraints, in their words where it matters.
- Decisions made in the conversation that no record captures.
- Approaches tried that failed, and why they failed.
- Open questions, and who answers each one.
- Facts found by reading or running things that are not written down.
- Uncommitted work and what state it is in.

A decision that meets the bar in `h2xd:docs-adr`, or a new term, belongs in a
record, not in the handoff. Offer to write it with `h2xd:docs-adr` or
`h2xd:docs-glossary` first, then link it. When the user declines, write it
in the handoff and mark it unrecorded.

Done when every item is either linked to a record or on this list.

### 3. Write the document

Fill [`template.md`](template.md). Save it to the OS temp directory. Use
`$TMPDIR`, else `/tmp`, or `%TEMP%` on Windows. Name it
`handoff-<repo>-<YYYYMMDD-HHMM>.md`.

- Each record gets one line: its path or URL and why the next agent reads it.
- Each step in **Next steps** is an action the next agent can start without
  asking.
- **Suggested skills** names the skills the next agent loads, for example
  `h2xd:prove-tests` before it trusts a test suite. Name only installed skills.
- Write the state as facts you checked this session. Give each command with
  its result, passed or failed.

Done when the file exists outside the repo and every section is filled or
says "None".

### 4. Redact

Read the file once more. Replace each secret with `<redacted: what it was>`.
Secrets are API keys, tokens, passwords and connection strings with
credentials. Personal data is secret too, such as emails, names of private
people and phone numbers.

Done when a search of the file for `key`, `token`, `secret`, `password` and
`@` finds nothing left to redact.

### 5. Report

Give the user the path and a one-line prompt to paste into the next session:

```
Read <path> and continue from its Next steps.
```

Then one line per item, worst first:

```
🔴 <item>: <uncommitted work, or a failing check the next agent inherits>
🟡 <item>: <an unrecorded decision, or an open question without an owner>
🟢 <item>: <a record the next agent reads, or work that is done>
```

Done when the user has the path, the prompt and the status lines.

## Do

- Link records by path, issue number or URL, with one line on why each matters.
- Write down failed approaches. The next agent repeats them otherwise.
- Shape the document around the argument when the user gives one.
- Keep the document short enough to read in one pass. The records hold the
  detail.

## Don't

- Don't copy a record's content into the handoff. Link it.
- Don't save the document inside the repo. Use the OS temp directory.
- Don't leave a durable decision only in the handoff. Offer `h2xd:docs-adr`
  first.
- Don't write the state from memory. Run the command and report its result.
- Don't keep a secret in the document. Replace it with `<redacted: what it was>`.
