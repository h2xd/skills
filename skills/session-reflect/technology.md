# Technology skills

How `h2xd:session-reflect` keeps one skill for each technology of the repo.
A Technology skill holds the rules an agent gets wrong in that technology.

## When a technology counts

A technology counts when both are true:

- A decision record names it, or the user chose it in this session.
- It has rules an agent can get wrong.

Read the session. Then read each decision record that is newer than the last
run. The last run is the newest Updated date on the Skills page. Read that
date before you run `node scripts/skills.ts due`, because the script creates a
missing page. Without a page, read every record. List the records with
`node scripts/find-docs.ts --type Decision`, and keep those whose `date` is
after the last run.

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
