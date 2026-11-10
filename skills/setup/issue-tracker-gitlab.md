---
type: Agent Config
title: Issue tracker
description: Issues for this repo live in GitLab Issues at {{OWNER_REPO}}, managed with the glab CLI.
tags: [agents, tracker]
generated: { by: "{{ACTOR}}", at: "{{DATE}}" }
---

# Issue tracker: GitLab

Issues live in this repo's GitLab Issues. Use the
[`glab`](https://gitlab.com/gitlab-org/cli) CLI for every operation. GitLab
calls pull requests merge requests and comments notes.

## Operations

| Operation | Command |
|---|---|
| Create | `glab issue create --title "<title>" --label "<label>" --description "$(cat <file>)"` |
| View | `glab issue view <n> --comments` |
| Search | `glab issue list --all --search "<words>" -O json` |
| List by label | `glab issue list --all --label "<label>" -O json` |
| Comment | `glab issue note <n> --message "$(cat <file>)"` |
| Label | `glab issue update <n> --label "<label>"`, `--unlabel "<label>"` |
| Close | `glab issue close <n>`. Post the reason with **Comment** first |
| Block | `glab api projects/:id/issues/<blocker>/links -X POST -f target_project_id={{PROJECT_PATH_ENCODED}} -f target_issue_iid=<n> -f link_type=blocks`. The `blocks` type needs GitLab Premium. On Free, leave this row out, and tickets keep a `## Blocked by` section. `{{PROJECT_PATH_ENCODED}}` is the project path with `/` written as `%2F`, such as `group%2Fapp` |
| Link a MR | The MR description opens with `Closes #<n>`, one line per issue |
| Open a PR | `glab mr create --target-branch <base> --title "<title>" --description "$(cat <file>)"`, add `--draft` for a draft. Edit an open MR with `glab mr update <n> --title "<title>" --description "$(cat <file>)"` |
| PR status | `glab mr view <n> -F json`. Read `draft` and `detailed_merge_status`. Run it once more when `detailed_merge_status` is `checking`, `unchecked`, `preparing` or `approvals_syncing` |

GitLab numbers issues and merge requests separately, so `#42` is an issue and
`!42` a merge request.

The `h2xd:review-pr` and `h2xd:review-fix` skills drive `gh` and work on GitHub
only.

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
| bug | `{{LABEL_BUG}}` | Something is broken |
| enhancement | `{{LABEL_ENHANCEMENT}}` | A new feature or an improvement |
| needs-triage | `{{LABEL_NEEDS_TRIAGE}}` | The maintainer has to evaluate it |
| needs-info | `{{LABEL_NEEDS_INFO}}` | Waiting on the reporter |
| ready-for-agent | `{{LABEL_READY_FOR_AGENT}}` | Fully specified. An agent can do it |
| ready-for-human | `{{LABEL_READY_FOR_HUMAN}}` | A person has to do it |
| wontfix | `{{LABEL_WONTFIX}}` | Will not be done |

Issues with the `idea` label stay out of triage until someone removes it.

**PRs in triage: {{TRIAGE_PRS}}.** Set to `yes` to triage external merge requests like issues.
An external MR is one whose author is not an owner, member or collaborator.

| Operation | Command |
|---|---|
| View an MR | `glab mr view <n> --comments`, then `glab mr diff <n>` |
| List external MRs | `glab mr list`, minus authors in `glab api projects/:id/members/all` |
| Comment, label, close an MR | `glab mr note <n>`, `glab mr update <n> --label`, `--unlabel`, `glab mr close <n>` |

## When a skill says "publish to the issue tracker"

Create a GitLab issue.

## When a skill says "fetch the relevant ticket"

Run `glab issue view <n> --comments`.
