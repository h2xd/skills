---
type: Agent Config
title: Issue tracker
description: Issues for this repo live in GitHub Issues at h2xd/skills, managed with the gh CLI.
tags: [agents, tracker]
generated: { by: "claude-code/claude-opus-5-5", at: "2026-11-05" }
---

# Issue tracker: GitHub

Issues live in this repo's GitHub Issues. Use the `gh` CLI for every operation.
`gh` infers the repo from `git remote -v` when run inside a clone.

## Operations

Skills name these operations. Each one is a single command.

| Operation | Command |
|---|---|
| Create | `gh issue create --title "<title>" --label "<label>" --body-file <file>` prints the issue URL |
| View | `gh issue view <n> --comments` |
| Search | `gh issue list --state all --search "<words>" --json number,title,state,labels,url --limit 30` |
| List by label | `gh issue list --state all --label "<label>" --json number,title,state,url --limit 100` |
| Comment | `gh issue comment <n> --body-file <file>` |
| Label | `gh issue edit <n> --add-label "<label>"`, `--remove-label "<label>"` |
| Assign | `gh issue edit <n> --add-assignee @me` |
| Close | `gh issue close <n>`. Post the reason with **Comment** first |
| Block | `gh api repos/{owner}/{repo}/issues/<n>/dependencies/blocked_by -X POST -F issue_id=$(gh api repos/{owner}/{repo}/issues/<blocker> --jq .id)` makes `<blocker>` block `<n>`. List with `gh api repos/{owner}/{repo}/issues/<n>/dependencies/blocked_by` |
| Sub-issue | `gh api repos/{owner}/{repo}/issues/<parent>/sub_issues -X POST -F sub_issue_id=$(gh api repos/{owner}/{repo}/issues/<n> --jq .id)`. List with `gh api repos/{owner}/{repo}/issues/<parent>/sub_issues` |
| Link a PR | The PR body opens with `Closes #<n>`, one line per issue. `node scripts/lint-pr-body.ts` checks it in CI |
| Open a PR | `gh pr create --base <base> --title "<title>" --body-file <file>`, add `--draft` for a draft. Edit an open PR with `gh pr edit <n> --title "<title>" --body-file <file>` |
| PR status | `gh pr view <n> --json number,isDraft,reviewDecision,mergeStateStatus`. Run it once more when `mergeStateStatus` is `UNKNOWN` |

Block and Sub-issue take the issue's numeric `id`, not its number. The
`$(gh api ... --jq .id)` part looks it up. `gh` fills in `{owner}` and `{repo}`.

GitHub shares one number space across issues and PRs. Resolve a bare `#42` with
`gh pr view 42` and fall back to `gh issue view 42`.

## Labels

| Label | Meaning |
|---|---|
| `adr` | The issue a decision record was opened under. The `h2xd:docs-adr` skill creates and searches it |
| `spec` | A spec written by `h2xd:to-spec`. `/h2xd:to-tickets` splits it into tickets |
| `idea` | An idea, not yet a request or a decision. `h2xd:plan-grill` files it, per its `idea-issue.md`. Triage leaves it alone |

## Triage

`h2xd:plan-triage` reads this section. Each role has one label string.

| Role | Label | Meaning |
|---|---|---|
| bug | `bug` | Something is broken |
| enhancement | `enhancement` | A new feature or an improvement |
| needs-triage | `needs-triage` | The maintainer has to evaluate it |
| needs-info | `needs-info` | Waiting on the reporter |
| ready-for-agent | `ready-for-agent` | Fully specified. An agent can do it |
| ready-for-human | `ready-for-human` | A person has to do it |
| wontfix | `wontfix` | Will not be done |

Issues with the `idea` label stay out of triage until someone removes it.

**PRs in triage: no.** Set to `yes` to triage external PRs like issues.
An external PR is one whose author is not an owner, member or collaborator.

| Operation | Command |
|---|---|
| View a PR | `gh pr view <n> --comments`, then `gh pr diff <n>` |
| List external PRs | `gh api --paginate 'repos/{owner}/{repo}/pulls?state=open' --jq '.[] \| select(.author_association \| IN("OWNER","MEMBER","COLLABORATOR") \| not) \| {number, title, author: .user.login, labels: [.labels[].name]}'` |
| Comment, label, close a PR | `gh pr comment <n> --body-file <file>`, `gh pr edit <n> --add-label`, `--remove-label`, `gh pr close <n>` |

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <n> --comments`.
