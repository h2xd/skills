---
name: git-guardrails
description: "Install a hook, for one project or for every project, that blocks destructive git commands before an agent runs them: git push, force push, reset --hard, clean -f, branch -D, checkout . and restore . Claude Code's PreToolUse hook is the worked example. Use when the user wants to stop agents from pushing, discarding work or deleting branches, or asks for git safety hooks."
disable-model-invocation: true
---

# Git guardrails

One `git reset --hard` erases an afternoon of uncommitted work, and one
`git push --force` rewrites the branch your team pulls from. Asking an agent to
be careful does not stop it. A hook does.

A pre-command hook is a script the CLI runs before every shell command. It
can refuse the command, and the agent then asks the user instead.

[`block-dangerous-git.sh`](../../templates/hooks/block-dangerous-git.sh) is that script. It blocks:

| Command | Blocked |
| --- | --- |
| `git push` | always, unless installed with `--allow-push` |
| `git push --force`, `-f`, `--force-with-lease`, `--force-if-includes`, `+<ref>`, `--delete`, `--mirror` | always |
| `git reset --hard` | always |
| `git clean -f`, `-fd`, `-xdf`, `--force` | always |
| `git branch -D`, `--delete --force` | always |
| `git checkout .`, `git checkout -- .`, `git restore .` | always |

It matches through git's global options, such as `git -C ../x push`. On a
match it prints the reason to stderr and exits 2. It needs `sh` and `grep`,
uses `jq` when present, and scans the raw payload when not.

## Steps

### 1. Find the CLI's hook

Find out which CLI runs the agents in this repo. Ask when it is unclear.

- **Claude Code.** Use a `PreToolUse` hook on the `Bash` tool in
  `.claude/settings.json`. Steps 3 and 4 show it.
- **A CLI with a pre-command hook.** Read its hook docs for two facts: the
  payload the hook receives, and how a hook refuses a command. When the
  payload has no `tool_input.command` or the CLI ignores exit code 2, write a
  wrapper that reshapes the input and output, and call the script from it.
- **A CLI with no hook.** Use its command deny list, or set it to ask before
  every shell command. Tell the user a deny list matches prefixes and misses
  `git -C dir push`. Skip steps 3 and 4.

Done when you can name the hook's file and the signal that blocks.

### 2. Ask scope and push policy

Ask with clickable options, through the CLI's question tool, such as
AskUserQuestion:

1. **Scope.** This project only, or every project on this machine. Recommend
   this project, because the hook then travels with the repo.
2. **Push.** Block every push, or allow plain pushes and block only force
   pushes and remote deletes. Recommend blocking every push. Step 5 of
   `h2xd:review-fix` runs `git push`, so a team that uses it needs
   `--allow-push`.
3. **Changes to the list.** Name any command to add or remove. `h2xd:code-arena`
   cleans up with `git branch -D`. Under this hook the user runs that line.

Done when the user answered all three.

### 3. Copy the script

Copy `templates/hooks/block-dangerous-git.sh` from the plugin root, two folders up from this file:

- Project: `.claude/hooks/block-dangerous-git.sh`
- Every project: `~/.claude/hooks/block-dangerous-git.sh`

Run `chmod +x` on the copy and apply the changes from question 3. Each
blocked command is one `check` line: an extended regex, then the reason. `$G`
matches git and its global options, `$R` the rest of one command.

Done when the copy exists, is executable, and holds the user's changes.

### 4. Wire the hook

Merge this into the settings file. For every project, use
`~/.claude/settings.json` and the command `~/.claude/hooks/block-dangerous-git.sh`.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/block-dangerous-git.sh"
          }
        ]
      }
    ]
  }
}
```

Append ` --allow-push` to the command when the user chose it. When the file
exists, add the entry to `hooks.PreToolUse` and keep every other key.

Done when `jq . <settings file>` exits 0 and the file holds the entry once.

### 5. Prove it blocks

Pipe one blocked and one allowed command through the installed copy. For
every project, use `~/.claude/hooks/block-dangerous-git.sh` as the path.

```sh
echo '{"tool_input":{"command":"git reset --hard"}}' | .claude/hooks/block-dangerous-git.sh; echo $?
echo '{"tool_input":{"command":"git status"}}' | .claude/hooks/block-dangerous-git.sh; echo $?
```

The first prints `BLOCKED by git-guardrails` and `2`, the second `0`. Pipe
`git push origin main` too, with the arguments the settings command passes.
It gives `2`, or `0` with `--allow-push`.

Then ask the agent to run `git reset --hard` in a new session. The CLI loads
hooks at start, so the current session may not have the hook.

Done when both pipes give the expected codes.

### 6. Report

One line per item, worst first:

```
🔴 <item>: <a check that failed, or a CLI with no way to block>
🟡 <item>: <weaker protection, such as a prefix deny list, or a skill step the user now runs by hand>
🟢 <item>: <the script path, the settings file, and what it blocks>
```

Done when the script, the settings file and each test have a line.

## Do

- Keep the hook in the project settings when the whole team uses the repo.
- Merge into existing settings. Keep other hooks and permissions.
- Test both a blocked and an allowed command before you report.
- Tell the user which h2xd skill steps the hook now refuses.

## Don't

- Don't overwrite `.claude/settings.json`. Add one entry to `hooks.PreToolUse`.
- Don't rely on the agent's instructions alone. Install a hook the CLI enforces.
- Don't report a deny list as equal to the hook. Mark it 🟡 and say what it misses.
- Don't change the regexes without a test. Pipe a match and a near miss through the copy.
- Don't run a blocked command to test the hook. Pipe a JSON payload into the script.
