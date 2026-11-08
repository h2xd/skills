---
name: next
description: "Say the one next step. Reads the branch, changes, PR, review and checks, and names the h2xd skill that comes next, with a prompt to start it. Use when the user asks what next, which skill to use, or how the h2xd skills fit together."
---

# Next

The grilling is done, the decisions are settled, and more than forty skills
could come next. Nobody remembers them all. This skill reads the repo, names
the one step that comes next, gives a prompt for it, and starts it when it is
the only step that fits.

The main flow:

```
plan-grill → to-spec → to-tickets → code-implement → review-pr → review-fix → session-retro
```

- [`catalog.md`](catalog.md) holds every skill, the side roads and the close
  calls.
- [`between-phases.md`](between-phases.md) holds the choice between continue,
  clear, hand off, subagent and compact.

## Steps

### 1. Read where you are

Run each command once. Skip the ones that do not apply.

```sh
git status --short
git branch --show-current
git log --oneline origin/HEAD..HEAD
gh pr view --json number,isDraft,reviewDecision,mergeStateStatus
```

Check that `agents.config.json` exists. When the diff touches UI files, such
as `.tsx`, `.vue`, `.svelte` or a stylesheet, check that
`docs/agents/design-system.md` exists. Then read the conversation. An idea, a
settled spec or a ticket number already places the user.

Done when you can fill in the state lines of step 3.

### 2. Pick the next skill

Take the first row that matches:

| State | Next |
|---|---|
| No `agents.config.json` | `/h2xd:setup` |
| A help question, such as "which skill does X?" | The row in [`catalog.md`](catalog.md) |
| An idea or a problem, nothing settled | `h2xd:plan-grill` |
| An idea to keep for later | An `idea` issue, per `../plan-grill/idea-issue.md` |
| Decisions settled, no spec | `h2xd:to-spec` |
| A spec, no tickets | `/h2xd:to-tickets` |
| A ticket to work on | `h2xd:code-implement` |
| Something is broken, or checks fail | `h2xd:code-debug` |
| A design choice was settled in the session | `h2xd:design-log` |
| UI work, but no `docs/agents/design-system.md` | `h2xd:design-setup` |
| Uncommitted changes | `h2xd:git-commit` |
| Commits ahead of the base, no PR | `h2xd:git-pr-body` |
| An open PR without a review | `h2xd:review-pr` |
| A PR with changes requested or open threads | `h2xd:review-fix` |
| A PR approved, with `mergeStateStatus` `CLEAN` | Merge it, then `h2xd:session-retro` |

A name that starts with `/` is user-only. The user types it, and you do not
run it. Read `../<name>/SKILL.md` before you describe a skill. When the skill
and this table disagree, the skill wins.

Done when you have one skill, or a flow of at most three for a help question.

### 3. Answer

```
🔴 <a blocker, such as failing checks>
🟡 <work in progress, such as uncommitted changes>
🟢 <what is done, such as the PR approved>

Next: <skill>, <why, in one line>.
```

Then give one prompt in a code block, with the user's real nouns. "Grill the
CSV export idea" beats "grill your idea".

- When one row matched and the skill is a model skill, run it now.
- For a user-only skill, tell the user to type the prompt.
- For a help question, or when two skills fit, ask with clickable options,
  through the CLI's question tool, such as AskUserQuestion.

Done when the answer has the state lines, one next skill and one prompt.

## Do

- Read the state before you answer. Never guess the branch or the PR.
- Name one next step. Give the whole map only when asked.
- Route from where the user is. A settled spec needs `/h2xd:to-tickets`, not
  `h2xd:plan-grill`.
- Say plainly when no skill fits, and answer the question yourself.

## Don't

- Don't ask when one step fits. Run it, or give the user-only prompt.
- Don't invent a skill. Route only to folders in `../`.
- Don't send tickets from `/h2xd:to-tickets` through `/h2xd:plan-triage`. They
  are ready, so go to `h2xd:code-implement`.
- Don't paste the catalog for a narrow question. Answer it, and offer the map
  in one line.
