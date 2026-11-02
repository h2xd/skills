---
name: setup-tone
description: Set the writing tone for a repo. Installs a tone template as the repo's default output style, such as ASD-STE100, which is Simplified Technical English, and adds one line to the agent instructions file, so every agent writes short, plain, summary-first text with 🔴 🟡 🟢 status. Use when the user wants clearer, simpler agent output, says tone, style, simple English or ASD-STE100, or when h2xd:setup asks for it.
disable-model-invocation: true
---

# Setup tone

An agent left alone posts a forty-line issue body, and the one line you needed
sits in paragraph six. A tone template sets the rules once for the whole repo:
short sentences, one meaning per word, summary first, status with 🔴 🟡 🟢.

A tone has two parts:

- **An output style** for the chat, read by Claude Code from
  `.claude/output-styles/`.
- **One line in the agent instructions file**, for other CLIs and for
  subagents, which an output style does not reach.

Text the skills post to GitHub follows [`github-text.md`](github-text.md) in
every repo, with or without a tone.

## Templates

| Template | File | For |
|---|---|---|
| ASD-STE100 | [`../../templates/output-styles/asd-ste100.md`](../../templates/output-styles/asd-ste100.md) | Simplified Technical English: plain, short, one reading per sentence. Good for readers who read a lot or not in their first language |

## Steps

### 1. Read what exists

Read `.claude/settings.json`, `.claude/settings.local.json` and
`.claude/output-styles/`. Note any `outputStyle` already set. Read the agent
instructions file, `CLAUDE.md` or `AGENTS.md`, for an existing tone line.

Done when you can say which style is active now, and where it is set.

### 2. Pick the template

Ask with clickable options, through the CLI's question tool, such as
AskUserQuestion. Offer one option per template, the recommended one first.
Add "keep the current style" when one is set.

Done when the user picked a template or chose to keep the current style.

### 3. Install the style

1. Copy the template to `.claude/output-styles/<file>`. Keep it unchanged, so
   a later run can compare it with the template.
2. Set `"outputStyle": "<name>"` in `.claude/settings.json`, the shared project
   file. The value is the template's `name`, with the same case. Merge it into
   the existing JSON. Change no other key.
3. When `.claude/settings.local.json` sets a different `outputStyle`, say so.
   The local file wins for that person. Do not edit it.

Show the settings diff before you write it.

Done when `jq -r .outputStyle .claude/settings.json` prints the template name
and the style file exists.

### 4. Reach the other agents

Add one line under `## Agent skills` in the agent instructions file:

```markdown
- **Tone**: write prose to `.claude/output-styles/<file>`. Text for GitHub
  starts with a summary and marks status with 🔴 🟡 🟢.
```

Replace an existing tone line in place.

Done when the instructions file has exactly one tone line.

### 5. Report

```
🟡 <item>: <a local outputStyle that overrides the shared one, or a restart needed>
🟢 tone: <name>, active from the next message
```

Claude Code reads style files at start. When the style file is new, tell the
user to restart Claude Code or run `/output-style <name>`.

Done when every change has its line.

## Do

- Copy the template unchanged.
- Set the style in the shared `.claude/settings.json`, so the whole team gets
  it.
- Add the instructions-file line, so subagents and other CLIs follow the tone.

## Don't

- Don't edit `.claude/settings.local.json`. Tell the user that it overrides the
  shared setting.
- Don't retype the style name. Copy it from the template, because a wrong case
  silently gives the default style.
- Don't rewrite existing docs to the new tone here. Offer `h2xd:add-soul` for
  that.
