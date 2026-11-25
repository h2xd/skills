---
name: catchup
description: "Say where the work stands: what is done, what is open, with a bar for the loop and one for the ticket. Covers the running session, the work of a branch and the whole repo, reads a handoff document against git, and prints the Documentary for a person new to a repo. Use when the user asks to catch up or what is open, returns to a branch, starts a fresh session on one, is new to the repo, or reviews another person's PR."
argument-hint: "[session | work | repo | path of a handoff document]"
---

# Catchup

A developer returns to a branch after a week. The history holds forty commits,
and nothing says which of them matter. This skill reads the facts and says in
one short paragraph what is done and what is open. Then it stops.

It only reads. It writes no file, changes no git state and starts no skill.

[`bars.md`](bars.md) holds the rules that count the bars. The report names no
next step. `h2xd:next` does that.

## Steps

### 1. Pick the scope

An argument wins:

- `session`, `work` or `repo` names the scope.
- A path names a handoff document. The scope is work.

Without an argument, the context picks:

- A long conversation gives the session scope.
- A fresh session on a branch other than the default branch gives the work
  scope.
- The default branch gives the repo scope.

In a fresh session with no path, run `node scripts/catchup.ts handoff`. It
prints the path of the newest handoff document of this repo, or `none`.

Done when you can name the scope and what picked it.

### 2. Read the facts

Run `node scripts/catchup.ts facts --scope work` or `--scope repo`. The session
scope uses the work facts, and what the conversation did. When the script is
missing, stop with one line: "run /h2xd:setup".

Done when you hold the output of the script.

### 3. Check the handoff document

Skip this step without a handoff document. Read it. Check each claim it makes
about the branch, the commits, the changed files and the test results against
git: `git log`, `git status --short` and the facts of step 2. Mark each claim
that git contradicts as stale, and report git's state instead.

Done when each claim is confirmed or marked stale.

### 4. Count the progress

Follow [`bars.md`](bars.md). Draw each bar with
`node scripts/catchup.ts bar <label> <done> <total>`. Draw a bar only when it
has a total, so a repo with no work in progress gets none.

Done when each bar is one line of script output.

### 5. Offer the timeline

In the work scope, a timeline helps in two cases: a long session after a
break, and work in a PR that another person opened. Compare the PR author with
the user with `gh pr view --json author`. Ask once, with clickable options,
through the CLI's question tool, such as AskUserQuestion, whether to print it.
The short form stays short without a yes. After a yes, print
`node scripts/catchup.ts timeline <base>..<head>`.

Skip this step in the other scopes and cases.

Done when you asked once and printed the timeline after a yes, or no case
applied.

### 6. Report

Open with one short paragraph, then the bars, then the status lines. Use the
words of the glossaries.

```
🔴 <a failing check, a conflict, or a claim that blocks the work>
🟡 <uncommitted work, an open review thread, or a stale claim>
🟢 <what is done>
```

For the work and session scopes, the paragraph says what was done and what is
open. List the last three commits from the facts.

For the repo scope:

- A user with no commit gets the Documentary. First the story of the repo:
  the first commit, the releases, the busiest week and the graph of commits
  per week. Then the map: each top-level folder with what it holds. End with
  a pointer to `/h2xd:teach`.
- A user with commits gets what changed since their last commit, and the
  graph of commits per week.
- When the facts hold `ahead of remote:` or `behind remote:`, the local
  default branch and its remote differ. Report each such line as a 🟡 status
  line.

Done when the report holds the paragraph, each bar and the status lines, and
names no next step.

## Do

- Let the script count. Never type a count that the script can print.
- Report git's state when a handoff claim is stale.
- Write the graph and the timeline as the script printed them.
- Ask about the timeline once, and print it only after a yes.

## Don't

- Don't write a file, not even a handoff document. `h2xd:session-handoff` does
  that.
- Don't start a skill, and don't name the next step.
- Don't trust a handoff document that git contradicts.
- Don't print the timeline without asking. The short form stays short.
