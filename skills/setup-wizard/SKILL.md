---
name: setup-wizard
description: "Write an interactive shell script that walks a person through manual steps only they can do, such as creating accounts, copying credentials or setting CI secrets. The script opens each page, says what to click, and saves the pasted values. Not the h2xd repo setup. Use when a task needs a person at a browser or console."
disable-model-invocation: true
---

# Wizard

Some steps need a person: logging into a dashboard, revealing a key, approving
a billing change. Explaining them again in every chat wastes time, and one
missed step breaks CI a week later. A wizard is a shell script that walks the
person through those steps one stage at a time.

It opens each URL, says what to click and copy, reads the value, and writes it
where it belongs. It also shows how many stages are left.

[`template.sh`](template.sh) holds the wizard library: progress, confirmation
gates, URL opening on macOS, Linux and WSL, hidden secret input, idempotent
`.env` writes, CI secrets through `gh` or `glab`, and a closing summary.

It is POSIX sh, so the wizard runs without node or bun. Your job is to scope
the procedure and write its stages. Never edit the library above the `STAGES`
marker, so every wizard behaves the same.

A wizard is throwaway by default. It runs once from the scratch directory and
is deleted after. Keep it in the repo only when the user wants a repeatable
setup path.

## Steps

### 1. Scope the procedure

Read the repo before you ask anything:

- For setup, read `.env.example`, `.env.*`, `README.md`, `docker-compose*`,
  framework config, and CI config such as `.github/workflows/*` or
  `.gitlab-ci.yml`. Every `secrets.*`, `vars.*` or CI variable reference is a
  value the wizard must produce.
- For a migration or cutover, find the current state, the target state, and
  the irreversible actions between them.
- Run `node scripts/find-docs.ts --search "<service>"` for pages that already
  describe the setup. Treat them as the starting draft.

List the stages in order, with the values each one produces. For each value,
note where the person finds it and whether it is secret. Also note where it
goes: `.env`, a CI secret, a CI variable, both, or nowhere.

Show the list. Ask the user to add, drop or reorder stages.

Done when the user confirmed the stage list, and every value has a source, a
destination and a secret or public flag.

### 2. Map each stage

Write the exact path a person follows for each stage. Give the URL, the clicks,
where the value appears, and which variable it fills. For example: "Dashboard,
Developers, API keys, Reveal test key, copy".

When you do not know the current UI or command, check the vendor's docs or ask
the user. Never invent a menu or button.

Done when a stranger could follow every stage without asking a question.

### 3. Write the wizard

1. Copy `template.sh` to the target path. A throwaway wizard goes in the
   scratch directory. A repeatable one goes in `scripts/wizard-<topic>.sh`.
2. Below the `STAGES` marker, replace the example with one `stage` per task,
   in dependency order. Set `TOTAL_STAGES` to the count.
3. Set `CI_CLI` to `gh` for GitHub Actions or `glab` for GitLab CI. Take the
   answer from the CI config you found in step 1.
4. Use the library helpers:

| Helper | Use |
|---|---|
| `banner "Title"` | Once, before the first stage |
| `stage "Name"` | Clears the screen and starts a stage |
| `say`, `step`, `note`, `warn` | Instruction, click, hint, caution |
| `open_url URL` | Before asking for a value shown at that URL |
| `ask KEY "Prompt"` | Visible value. Enter keeps the saved one |
| `ask_secret KEY "Prompt"` | Hidden value |
| `write_env KEY "$KEY"` | Every value that persists locally |
| `set_secret NAME "$VALUE"` | Only values the CI config references |
| `set_var NAME "$VALUE"` | Public CI values |
| `pause`, `confirm "Question"` | Wait for Enter, or a y/N gate |
| `finish` | Last line of `run_wizard` |

Keep each stage to one task, so nothing the person needs scrolls off the
cleared screen. Wrap every irreversible action in `if confirm "..."; then`.
Put commands the wizard runs itself in plain sh inside the stage, for example
`gh`, `aws` or `psql`.

Done when every value from step 1 is read by `ask` or `ask_secret` and reaches
its destination, and the library above the marker matches `template.sh`.

### 4. Check it statically

1. Run `sh -n <script>`. When `shellcheck` exists, run `shellcheck -s sh
   <script>`.
2. Run `chmod +x <script>`.
3. Trace the script by reading. Every `set_secret` name matches a CI reference
   exactly. Every `.env` key matches `.env.example` or the code that reads it.
4. Check that `.gitignore` covers `.env`. When it does not, tell the user. The
   wizard also warns at start.

Never run the wizard yourself. It opens browsers and waits for a person.

Done when `sh -n` exits 0, `shellcheck` reports nothing or is absent, and the
trace found no mismatch.

### 5. Hand it over

Give the user the command `sh <path>` and the services they must be logged
into. Ask them to report back when it ends, with any lines under "Still to do
by hand".

For a repeatable wizard, link it from the README or from the setup page of the
knowledge base, using `h2xd:docs-wiki`. Commit both with `h2xd:git-commit`.
For a throwaway wizard, delete it after the run.

Done when the user ran it and the summary shows nothing left to do by hand, or
the report lists what is left.

## Report

```
🔴 <stage>: <failed or blocked, and the next action>
🟡 <stage or value>: <skipped, left by hand, or unverified>
🟢 <wizard>: <path>, <N> stages, <values written to .env and CI>
```

## Do

- Read `.env.example` and the CI config before you ask the user anything.
- Open the URL before the prompt that asks for its value.
- Use `ask_secret` for every token, password and private key.
- Put a `confirm` gate before every irreversible action.
- Keep secret values on stdin. `set_secret` already does this.

## Don't

- Don't write a stage for a step the agent can run. Run it, and leave the
  wizard to the person's steps.
- Don't edit the library above the `STAGES` marker. Copy `template.sh` again.
- Don't guess a dashboard path. Check the vendor docs or ask the user.
- Don't use bash-only syntax such as `[[`, arrays or `read -s`. Use the
  helpers, which are POSIX sh.
- Don't set every value as a CI secret. Set only what the CI config references.
- Don't commit a throwaway wizard. Delete it after the run.
