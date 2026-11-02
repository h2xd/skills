---
name: add-skill
description: "Write or rewrite a skill, an agent or an agent instructions file so an agent follows it without guessing: plain sentences, steps that end in a check, Do and Don't, and status reports. Use when creating or editing any SKILL.md, agent prompt or instructions file."
---

# Add skill

An agent reads a skill the way a new hire reads a note left on the desk at
midnight. Nobody is there to ask what you meant. Write every sentence so it has
one reading, as an instruction to follow or a fact to rely on.

## Core rules

1. **One instruction per sentence**, at most about 20 words. Split longer ones.
2. **Commands, not narration.** "Run `npm test`." Not "the tests should be run".
3. **The condition first.** "When the tree is dirty, stop and ask."
4. **Real names.** Write the file, command, flag or skill name, never a
   description of it. Skills name each other as `h2xd:<name>`. A skill with
   `disable-model-invocation: true` is read by path, `../<name>/SKILL.md`.
5. **One word per thing.** Pick "issue" or "ticket" and keep it. A second word
   reads as a second thing.
6. **Why in one line, only when needed.** Add a reason when an agent would
   otherwise break the rule in an edge case. No intro essays.
7. **Structure over prose.** Numbered steps for sequences, bullets for sets, a
   table for choices with more than two columns of facts. A paragraph has at
   most three sentences.
8. **Plain words.** "Use", not "utilize". No idioms, no metaphors, no slashes,
   no semicolons. A new term gets one sentence that defines it.
9. **No parentheses, no em dashes in prose.** Make an aside its own sentence,
   or join it with a comma. Code, link targets and `<placeholders>` are exempt.
10. **Neutral about the CLI.** Describe the action, then give the tool once as
    an example: "Ask with clickable options, through the CLI's question tool,
    such as AskUserQuestion." Models go by tier: "on the strongest model, such
    as Opus", "on a fast model, such as Sonnet", "on the cheapest model, such
    as Haiku".
11. **Finish with add-soul.** Read `../add-soul/SKILL.md` and apply it.

## SKILL.md

- **Frontmatter.** `name` equals the folder name. `description` says what the
  skill does, then "Use when …" with the triggers. The model picks a skill from
  the description alone.
- **Opening.** One short paragraph: the problem the skill solves. A concrete
  picture beats an abstract claim.
- **Steps.** Numbered `### 1. Name` headings. Each ends in a `Done when` line a
  reader can check: a file exists, a command exits 0, the user confirmed.
- **Do and Don't.** `## Do` and `## Don't`, three to seven bullets each, specific
  to this skill. Each Don't names what to do instead: "Don't edit an accepted
  record. Supersede it."
- **Report.** When the skill reports, give the format from the Reports section.
- **GitHub text.** Text the skill posts to GitHub follows
  `../setup-tone/github-text.md`.
- **Length.** At most 150 lines. Move templates, catalogs, briefs for subagents
  and long examples to sibling files, and link them by relative path.
- **User-only for Codex too.** Next to `disable-model-invocation: true`, add
  `agents/openai.yaml` with `policy:` and `allow_implicit_invocation: false`.

## Agent definitions

- A persona is allowed when it changes behavior. Comment-reaper's hatred of
  comments makes it delete harder. Keep the rules under the persona plain.
- List exactly the tools the agent needs in the frontmatter.
- Say what it may change, what it may not, and what it returns.

## Agent instructions blocks

The `## Agent skills`, `## Commits` and `## Pull requests` blocks in
`CLAUDE.md` or `AGENTS.md` are read every session. Keep each to the rules an
agent breaks without it, and point to the skill or page for the rest.

## Reports

A report lists one item per line, worst first:

```
🔴 <item>: <what is broken or blocked, and the next action>
🟡 <item>: <what is at risk or partial>
🟢 <item>: <what is done or healthy>
```

- 🔴 broken or blocked: something fails, or work cannot go on.
- 🟡 at risk or partial: it works, but needs attention.
- 🟢 done or healthy.

Colors mark status in reports only. The skill text itself stays plain.

## Steps

### 1. Read what exists

Read the skill or prompt, the skills it names, and the scripts it calls.
Done when you can say what each step does and what it produces.

### 2. Write or rewrite

Apply the rules above. Keep every fact and check the old text had, unless it
was wrong. Move material over the length limit to sibling files.
Done when every step has a `Done when`, and Do and Don't exist.

### 3. Check

In the h2xd skills repo, run `node scripts/lint-skills.ts`. A new skill there
also needs a row in `skills/next/catalog.md`, or the lint fails. Elsewhere,
read the rules above against the file.
Then read `../add-soul/SKILL.md` and apply it.
Done when the lint passes and a read-through finds no sentence with two
readings.

### 4. Polish with a fresh pair of eyes

Start the `skill-polisher` agent on the skill folder, through the CLI's
subagent tool, such as Agent with `subagent_type: h2xd:skill-polisher` in
Claude Code. In Codex the agent is `skill-polisher`. Give it the absolute paths of this file,
`../add-soul/SKILL.md` and `../setup-tone/github-text.md`. For many skills,
start one polisher per skill, in parallel. Review each report, and fix what it
found in other skills yourself.
Done when every polisher report is read and its problems are fixed or listed.

## Do

- Keep the commands copy-ready, in code font, with real paths.
- Give each subagent its brief as a file it reads, not a pasted wall of text.
- Let `skill-polisher` read a skill you wrote. Fresh eyes catch what yours skip.
- Put the check in a script when one can do it, and name the script.
- Keep the old wording when it already follows the rules.

## Don't

- Don't explain what the agent already knows. Give the rule this repo needs.
- Don't write "should" or "try to". Write the command.
- Don't name one CLI's tool as the only way. Name the action, then the example.
- Don't put an aside in parentheses. Give it its own sentence.
- Don't use 🔴 🟡 🟢 for anything but status in a report.
- Don't add a step without a `Done when`. Merge it into the step it serves.
