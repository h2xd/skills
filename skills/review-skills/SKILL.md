---
name: review-skills
description: Review a set of skills as a whole. Finds skills whose descriptions trigger on the same request, skills that do the same job, vague or bloated descriptions, and the context cost of skills the model can start by itself, then proposes exact fixes and applies the ones the user picks. Use when the user asks which skills overlap, why the wrong skill fired, how to tidy a skill set, or after adding several skills.
disable-model-invocation: true
---

# Review skills

Two skills that both answer "fix this bug" do not help twice. The model picks
one at random, and the user learns to stop trusting the set. Every skill the
model can start also costs context in every session, through its description.

This skill reads the set as a whole. It finds collisions, sorts the real ones
from the false alarms, and proposes the smallest fix for each.

## Steps

### 1. Collect the set

Take the folders the user names. Otherwise search `skills/`, `.claude/skills/`
and `.agents/skills/` for `*/SKILL.md`.

`$WORK` is a scratch directory of your own, outside the repo. For each skill,
write one row to `$WORK/skills.md`:
name, who can start it, description length, `SKILL.md` lines, and the
description itself. A skill with `disable-model-invocation: true` is user-only.

Done when every `SKILL.md` has one row.

### 2. Find the candidates

Read the table, not the skills. Mark each pair or group that matches one of
these:

| Kind | Sign |
|---|---|
| Same trigger | Both descriptions name the same request, such as "debug" or "review a PR" |
| Same job | Both promise the same result for the same input |
| Chain gap | One skill says it hands off to another that does not take that input |
| Vague | A description with no "Use when", or triggers like "when needed" |
| Bloated | A description over about 400 characters, or one that lists steps |
| Context cost | Many model-startable skills for jobs a user starts on purpose |

Done when every mark names the skills and the kind.

### 3. Check each candidate

Read the `SKILL.md` of every skill in a candidate. Decide:

- **Real**: a request exists that both would claim, or both do the same job.
  Write that request down, such as "this test is flaky".
- **False alarm**: the descriptions overlap, but the jobs and inputs differ.
  Note the line that tells them apart.

For a large set, start one subagent per group of candidates, through the CLI's
subagent tool, such as Agent, on a fast model, such as Sonnet. Hand over the
table path and the group in a file.

Done when every candidate is real or a false alarm, with its evidence.

### 4. Propose the fix

Pick the smallest fix that ends the collision:

1. **Sharpen a description.** Write the exact new text for both skills, so
   each claims its own request. This fixes most collisions.
2. **Point across.** Add a Don't to one skill that names the other: "Don't
   race designs here. Use `code-arena`."
3. **Make it user-only.** For a costly or rare job the user starts on purpose.
4. **Merge.** When two skills do one job, fold the smaller into the larger.
5. **Rename.** When the name itself misleads.

Done when every real collision has one fix, with the exact text or change.

### 5. Ask and apply

Ask in waves of at most four, with clickable options, through the CLI's
question tool, such as AskUserQuestion. One question per collision, your fix
first and marked recommended, "leave it" last.

Apply each approved fix by the rules of `../add-skill/SKILL.md`. When the repo
has a skill lint, run it.

Done when every approved fix is applied and the lint passes.

### 6. Report

```
🔴 <skills>: <a collision left open, and the request both claim>
🟡 <skills>: <a fix applied that the user should try, or a false alarm worth a note>
🟢 <n> skills reviewed, <n> collisions fixed, <n> model-startable now
```

Done when every collision has its line.

## Do

- Write down the request two skills both claim. It is the proof of a collision.
- Prefer a sharper description over a merge.
- Keep the user's own names unless they mislead.
- Count the model-startable skills before and after.

## Don't

- Don't merge skills on a shared word. Check the jobs first.
- Don't rewrite a skill's steps to fix a trigger. Change the description.
- Don't apply a fix without a yes. Show the exact new text first.
- Don't judge from the table alone. Read both skills before you call it real.
