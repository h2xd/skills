#!/bin/sh
# Blocks destructive git commands before an agent runs them.
#
# Reads the CLI's pre-tool hook payload as JSON on stdin. With jq, it checks
# .tool_input.command. Without jq, it reads that field with sed. When the field
# is missing, it checks the whole payload. A match prints the reason to stderr and exits 2, which
# Claude Code's PreToolUse hook reads as "block, and show the agent this".
#
#   block-dangerous-git.sh                block every push
#   block-dangerous-git.sh --allow-push   allow plain pushes, block force pushes

allow_push=0
[ "$1" = "--allow-push" ] && allow_push=1

input=$(cat)
command=""
if command -v jq >/dev/null 2>&1; then
  command=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)
fi
if [ -z "$command" ]; then
  # No jq: take the value of "command" from the raw JSON, then unescape it.
  command=$(printf '%s' "$input" | sed -nE 's/.*"command"[[:space:]]*:[[:space:]]*"(([^"\\]|\\.)*)".*/\1/p' | sed 's/\\[nt]/ /g; s/\\"/"/g')
fi
if [ -z "$command" ]; then
  # Not the expected shape: check the whole payload, newlines and tabs as spaces.
  command=$(printf '%s' "$input" | sed 's/\\[nt]/ /g')
fi

# `git`, then any global options (-C <dir>, -c <key=value>, --no-pager ...), then the subcommand.
G='(^|[^[:alnum:]_./-])git(([[:space:]]+(-C|-c|--git-dir|--work-tree)[[:space:]]+[^[:space:]]+)|([[:space:]]+--?[[:alnum:]-]+(=[^[:space:]]+)?))*[[:space:]]+'
# The rest of one command: stops at ; & | so a later command's flags do not count.
R='[^;&|]*'

check() {
  if printf '%s\n' "$command" | grep -Eq -- "$1"; then
    echo "BLOCKED by git-guardrails: $2. The user does not allow agents to run this. Ask the user to run it, or find a non-destructive way." >&2
    exit 2
  fi
}

check "${G}push${R}([[:space:]](--force|--force-with-lease|--force-if-includes|--mirror|--delete)|[[:space:]]-[[:alpha:]]*[fd]([[:space:]]|$)|[[:space:]]\+)" "force push or remote delete"
[ "$allow_push" = 1 ] || check "${G}push([[:space:]]|$)" "git push"
check "${G}reset${R}[[:space:]]--hard" "git reset --hard"
check "${G}clean${R}[[:space:]](--force|-[[:alpha:]]*f)" "git clean -f"
check "${G}branch${R}[[:space:]](-[[:alpha:]]*D|--delete${R}--force|--force${R}--delete)" "git branch -D"
check "${G}checkout([[:space:]]+--)?[[:space:]]+\.([[:space:]]|$)" "git checkout ."
check "${G}restore${R}[[:space:]]\.([[:space:]]|$)" "git restore ."

exit 0
