# Technology skills

How `h2xd:session-reflect` keeps one skill for each technology of the repo.
A Technology skill holds the rules an agent gets wrong in that technology.

## When a technology counts

A technology counts when both are true:

- A decision record names it, or the user chose it in this session.
- It has rules an agent can get wrong.

Read the session. Then read each decision record that is newer than the last
run. Run `node scripts/skills.ts due` once, before you read a record, and
take the last run from its `last run: <date>` line. The script then writes the
date of today as the new last run, so a proposal you drop does not come back
in the next session. Use the line of that first run, never of a later one.
`last run: none`, or no script, means read every record. List the records with
`node scripts/find-docs.ts --type Decision`. It prints no date, so read the
`date` of each record, and keep those after the last run.

A technology with no rules an agent can get wrong gets no proposal. One small
library with one obvious call is an example. Drop it as "no rules", with the
reason.

## Add a Technology skill

A technology that counts and has no skill in `.claude/skills/` gets one
proposal. After a yes:

1. Look for a seed in `templates/seeds/<name>/`, relative to the plugin root.
   When one fits, copy it to `.claude/skills/<name>/` and adapt it to the repo.
2. Without a seed, write the skill from the decision record, the session and
   the repo's code. Do not search the web.
3. Write it by the rules of `h2xd:add-skill`. Name it `tech-<technology>`,
   or keep the name of the seed. A real folder is an internal skill, so the
   plugin does not ship it.
4. Run `node scripts/skills.ts due`. It adds the row of the new skill. Write
   the technology in the Technology cell of that row.

Done when the folder holds a `SKILL.md` that `node scripts/lint-skills.ts`
accepts, and the Skills page has its row with the technology.

## Remove a Technology skill

A record or the user can say that a technology goes. The skill of that
technology then holds dead rules, and agents follow them. Find the skill by
the Technology cell of its row on the Skills page. A skill folder linked into
`.claude/skills` has a row too. A plugin skill that is not in
`.claude/skills` has no row. Never propose its removal.

After a yes:

1. Delete the folder in `.claude/skills/`.
2. Run `node scripts/skills.ts due`. It drops the row of the deleted skill.
3. Run `grep -rn "<name>" .` and remove each pointer to the skill that is left.

Done when the folder and its row are gone and the search finds no pointer.

## The proposal line

Each add or remove is one line of the approval block in step 4, such as:

```
🟡 Add tech-zod: <the rules an agent gets wrong>, per <record or turn>.
🟡 Remove tech-redux: Redux goes, per <record or turn>.
```

The line has the same options as any lesson: apply now, file as an issue,
change the routing, or drop. It adds no second question and no second gate.
Nothing changes before a yes.
