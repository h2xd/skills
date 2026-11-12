---
name: plan-backlog
description: Groom the open issues. Two cheap scouts find the issues that overlap, a grilling session asks the user which groups to merge, and a fast agent merges them, sets the labels and proposes improvements for the rest. Use when the user asks to groom or clean up the backlog, to merge or group issues, or when open issues pile up with the same topic.
argument-hint: "[label or search words to limit the issues]"
disable-model-invocation: true
---

# Plan backlog

Nine open issues, and four of them change the same step of one skill. Each
one costs a reader time, and two sessions can build the same change twice. This
skill finds the overlap, asks the user which groups to merge, and does the
merge.

Three roles keep the cost low. Two scouts on the cheapest model, such as
Haiku, read every issue. The main session on a fast model, such as Sonnet,
grills the user. One merge agent on a fast model, such as Sonnet, edits the
tracker.

## Steps

### 1. Load the setup

Read `docs/agents/issue-tracker.md`. Find the operations and the label string
for each triage role. List the open issues with one call, as **List by label**
or **Search** does, but with `--state open` and the fields
`number,title,labels,body,comments`. Write the result to `issues.json` in the
scratchpad. Leave out every issue with the `idea` label. When the user gave a
label or words, limit the list to them.
Done when `issues.json` exists, and you can say how many issues it holds.

### 2. Scout

When there are fewer than four issues, skip this step and say so. Start two
scouts in one message, on the cheapest model, such as Haiku, through the CLI's
subagent tool, such as Agent. Give each the brief in [`scout.md`](scout.md),
the path to `issues.json` and its lens: **A, same code** or **B, same cause**.
Each scout writes `scout-a.md` or `scout-b.md` in the scratchpad.
Done when both files exist. A scout that returned without its file is started
again once.

### 3. Pool the groups

Read both files. Rate each group:

- **Strong.** Both scouts name it, with at least two members in common.
- **Weak.** One scout names it.

Drop a group of one issue. Split a group of more than four issues by topic.

Pick the survivor of each group. It is the issue with the broadest scope, or the
lowest number when the scopes match. Write `groups.md` with the members, the
survivor, the rating and the reason.
Done when `groups.md` lists every group once, with one survivor each.

### 4. Grill

Run the question rounds as `h2xd:plan-grill` step 2 says: at most four
questions in one call, clickable options, the recommendation first.

- One question per group. The options are **Merge into #n**, **Keep apart**, and
  **Merge into #m** when another survivor fits. For a strong group, the merge
  comes first and ends in `(Recommended)`. For a weak group, **Keep apart**
  comes first.
- Add one question for the labels. The recommended option is the rule in
  [`merge.md`](merge.md), step 3.
- Show the survivor's title and each member's title in the descriptions.

Write the answers to `decisions.json` with the survivor, the members and the
labels for each group.
Done when every group has an answer in `decisions.json`.

### 5. Merge and propose

Start one agent on a fast model, such as Sonnet. Give it the brief in
[`merge.md`](merge.md) and the paths to `issues.json` and `decisions.json`.
It edits the survivors, comments on and closes the members, sets the labels
and writes `proposals.md`.
Done when the agent returned and **View** shows each survivor with its new
labels, and each member closed with a comment.

### 6. Report

Read `proposals.md` and give the user this report. Apply no proposal. Name the
skill that fits each one, such as `/h2xd:plan-triage` or `/h2xd:plan-grill`, for
the user to run.

```
🔴 #<n>: <a merge that failed, and the next action>
🟡 #<n>: <a proposal: split, missing criteria, stale, wrong label>
🟢 #<survivor>: <members merged, labels set>
```

Done when the user has the report and each 🟡 names a next skill.

## Do

- Read the issues from `issues.json`. One call replaces a call per issue.
- Keep every fact of a closed member in its survivor.
- Ask before you merge. A closed issue breaks the links of its readers.
- Use the label strings from `docs/agents/issue-tracker.md`.
- Post every comment per `../setup-tone/github-text.md`.

## Don't

- Don't merge a weak group without a yes. Ask, and keep it apart on a no.
- Don't label an `idea` issue. Leave it alone.
- Don't merge a bug with an enhancement. Keep them apart, and say why.
- Don't let a scout write to the tracker. Scouts read and write one file.
- Don't act on a proposal. List it and name the skill that does it.
