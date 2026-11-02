#!/bin/sh
# A wizard walks a person through a manual procedure, one stage at a time.
# Written by the h2xd:setup-wizard skill. Needs only a POSIX sh, so it runs without
# node or bun. Optional tools: tput for color, gh or glab for CI secrets.
#
#   sh <this file>
#
# Everything above the STAGES marker is the wizard library. Do not edit it.
# Write the stages below the marker.

set -eu

# ---------------------------------------------------------------------------
# Wizard library. Identical in every wizard.
# ---------------------------------------------------------------------------

if [ -t 1 ] && command -v tput >/dev/null 2>&1 && [ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]; then
  BOLD=$(tput bold) DIM=$(tput dim) RESET=$(tput sgr0)
  BLUE=$(tput setaf 4) GREEN=$(tput setaf 2) YELLOW=$(tput setaf 3)
else
  BOLD="" DIM="" RESET="" BLUE="" GREEN="" YELLOW=""
fi

TOTAL_STAGES=0
ENV_FILE=${ENV_FILE:-.env}
CI_CLI=${CI_CLI:-gh}

_w_index=0
_w_env=""     # keys written to ENV_FILE this run, space separated
_w_secret=""  # CI secret names set this run
_w_skipped="" # one line per thing left for the person to do by hand
_w_stty=""

# Echo off for hidden input must never outlive the script.
_w_restore() { [ -z "$_w_stty" ] || stty "$_w_stty" 2>/dev/null || true; }
trap '_w_restore' EXIT
trap '_w_restore; printf "\n"; exit 130' INT TERM

_w_clear() {
  [ -t 1 ] || return 0
  tput clear 2>/dev/null || printf '\033[2J\033[3J\033[H'
}

_w_name() {
  case $1 in
    '' | [0-9]* | *[!A-Za-z0-9_]*) printf 'wizard: bad variable name "%s"\n' "$1" >&2; exit 2 ;;
  esac
}

_w_skip() { _w_skipped="${_w_skipped}$1
"; }

say()  { printf '  %s\n' "$1"; }
step() { printf '  %s*%s %s\n' "$BLUE" "$RESET" "$1"; }
note() { printf '  %s%s%s\n' "$DIM" "$1" "$RESET"; }
warn() { printf '  %s! %s%s\n' "$YELLOW" "$1" "$RESET"; }

# pause "message" waits until the person presses Enter.
pause() {
  printf '  %s%s%s ' "$DIM" "${1:-Press Enter to continue}" "$RESET"
  read -r _w_reply || true
}

# confirm "question" is a y/N gate. Succeeds on yes.
confirm() {
  printf '  %s? %s [y/N]%s ' "$YELLOW" "$1" "$RESET"
  _w_reply=""
  read -r _w_reply || true
  case $_w_reply in [Yy]*) return 0 ;; *) return 1 ;; esac
}

# banner "Title" opens the wizard and warns when ENV_FILE is not git-ignored.
banner() {
  _w_clear
  printf '\n%s%s  %s%s\n' "$BOLD" "$BLUE" "$1" "$RESET"
  printf '%s  %s stages%s\n\n' "$DIM" "$TOTAL_STAGES" "$RESET"
  note "You work in the browser. This wizard says what to do and saves"
  note "the values you paste back. Stop with Ctrl-C at any time. A re-run"
  note "offers the values already saved."
  if git rev-parse --git-dir >/dev/null 2>&1 && ! git check-ignore -q "$ENV_FILE" 2>/dev/null; then
    printf '\n'; warn "$ENV_FILE is not in .gitignore. Add it before you paste secrets."
  fi
  printf '\n'
  pause "Ready to start?"
}

# stage "Name" clears the screen and shows the stage number.
stage() {
  _w_clear
  _w_index=$((_w_index + 1))
  printf '\n%s%s> Stage %s/%s: %s%s\n\n' "$BOLD" "$BLUE" "$_w_index" "$TOTAL_STAGES" "$1" "$RESET"
}

# open_url URL opens the browser on macOS, Linux and WSL, or prints the URL.
open_url() {
  printf '  %sopening%s %s\n' "$GREEN" "$RESET" "$1"
  if command -v wslview >/dev/null 2>&1; then wslview "$1"
  elif command -v explorer.exe >/dev/null 2>&1; then explorer.exe "$1"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$1"
  elif command -v open >/dev/null 2>&1; then open "$1"
  else false
  fi >/dev/null 2>&1 || warn "Could not open a browser. Visit it by hand: $1"
}

# _w_existing KEY prints KEY's value from ENV_FILE, undoing write_env's quotes.
_w_existing() {
  [ -f "$ENV_FILE" ] || return 1
  _w_line=$(grep "^$1=" "$ENV_FILE" | tail -n 1) || return 1
  _w_value=${_w_line#*=}
  case $_w_value in
    \'*\') printf '%s' "$_w_value" | sed "s/^'//; s/'\$//; s/'\\\\''/'/g" ;;
    \"*\\* | \"*\$* | \"*\"*\"*\") return 1 ;;
    \"*\") _w_value=${_w_value#\"}; printf '%s' "${_w_value%\"}" ;;
    *) printf '%s' "$_w_value" ;;
  esac
}

_w_prompt() {
  _w_current=$(_w_existing "$1" || true)
  printf '  %s%s%s ' "$BOLD" "$2" "$RESET"
  [ -z "$_w_current" ] || printf '%s[Enter keeps current]%s ' "$DIM" "$RESET"
}

_w_store() {
  [ -n "$_w_input" ] || _w_input=$_w_current
  [ -n "$_w_input" ] || { warn "Empty value. Try again."; return 1; }
  eval "$1=\$_w_input"
}

# ask KEY "Prompt" reads a visible value into $KEY. Enter keeps the saved one.
ask() {
  _w_name "$1"
  while :; do
    _w_prompt "$1" "$2"
    _w_input=""
    read -r _w_input || { [ -n "$_w_input" ] || exit 1; }
    ! _w_store "$1" || return 0
  done
}

# ask_secret KEY "Prompt" is ask with the typed value hidden.
ask_secret() {
  _w_name "$1"
  while :; do
    _w_prompt "$1" "$2"
    _w_input=""
    if [ -t 0 ]; then _w_stty=$(stty -g); stty -echo; fi
    read -r _w_input || { [ -n "$_w_input" ] || exit 1; }
    _w_restore; _w_stty=""
    printf '\n'
    ! _w_store "$1" || return 0
  done
}

# write_env KEY VALUE replaces or adds KEY='VALUE' in ENV_FILE and sets $KEY.
# Creates ENV_FILE with mode 0600 and keeps the mode of an existing file.
write_env() {
  _w_name "$1"
  [ -e "$ENV_FILE" ] || (umask 077 && : >"$ENV_FILE")
  _w_tmp=$(mktemp)
  grep -v "^$1=" "$ENV_FILE" >"$_w_tmp" || true
  printf "%s='%s'\n" "$1" "$(printf '%s' "$2" | sed "s/'/'\\\\''/g")" >>"$_w_tmp"
  cat "$_w_tmp" >"$ENV_FILE"
  rm -f "$_w_tmp"
  eval "$1=\$2"
  _w_env="$_w_env $1"
  printf '  %swrote%s %s to %s\n' "$GREEN" "$RESET" "$1" "$ENV_FILE"
}

_w_ci_ready() {
  case $CI_CLI in
    gh) command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1 ;;
    glab) command -v glab >/dev/null 2>&1 && glab auth status >/dev/null 2>&1 ;;
    *) return 1 ;;
  esac
}

# set_secret NAME VALUE stores a masked CI secret through CI_CLI (gh or glab).
# The value goes through stdin, never the argument list.
set_secret() {
  if _w_ci_ready && case $CI_CLI in
      gh) printf '%s' "$2" | gh secret set "$1" ;;
      glab) printf '%s' "$2" | glab variable set "$1" --masked ;;
    esac >/dev/null 2>&1; then
    _w_secret="$_w_secret $1"
    printf '  %sset%s CI secret %s\n' "$GREEN" "$RESET" "$1"
  else
    _w_skip "CI secret $1: $CI_CLI is missing or not logged in"
    warn "Skipped CI secret $1. Set it by hand later."
  fi
}

# set_var NAME VALUE stores a plain CI variable through CI_CLI.
set_var() {
  if _w_ci_ready && case $CI_CLI in
      gh) gh variable set "$1" --body "$2" ;;
      glab) glab variable set "$1" "$2" ;;
    esac >/dev/null 2>&1; then
    printf '  %sset%s CI variable %s\n' "$GREEN" "$RESET" "$1"
  else
    _w_skip "CI variable $1=$2: $CI_CLI is missing or not logged in"
    warn "Skipped CI variable $1. Set it by hand later."
  fi
}

# finish clears the screen and lists what was saved and what is left.
finish() {
  _w_clear
  printf '\n%s%s  Done%s\n' "$BOLD" "$GREEN" "$RESET"
  [ -z "$_w_env" ] || note "Wrote to $ENV_FILE:$_w_env"
  [ -z "$_w_secret" ] || note "Set CI secrets:$_w_secret"
  if [ -n "$_w_skipped" ]; then
    printf '\n'; warn "Still to do by hand:"
    printf '%s' "$_w_skipped" | while IFS= read -r _w_line; do note "  - $_w_line"; done
  fi
  printf '\n'
}

# ---------------------------------------------------------------------------
# STAGES. Replace the example with one stage per task the person does.
# Set TOTAL_STAGES to the number of stages. Keep every stage inside
# run_wizard and keep the last line as is. The shell then reads the whole
# file before the first prompt, so an edit during a run cannot break it.
# ---------------------------------------------------------------------------

run_wizard() {

TOTAL_STAGES=1
CI_CLI=gh

banner "Stripe setup"

stage "Stripe API keys"
say "Copy the Stripe test keys for local development and CI."
open_url "https://dashboard.stripe.com/test/apikeys"
step "On the API keys page, copy the Publishable key. It starts with pk_test_."
ask STRIPE_PUBLISHABLE_KEY "Paste the publishable key:"
step "On the Secret key row, click Reveal test key, then copy it."
ask_secret STRIPE_SECRET_KEY "Paste the secret key:"
write_env STRIPE_PUBLISHABLE_KEY "$STRIPE_PUBLISHABLE_KEY"
write_env STRIPE_SECRET_KEY "$STRIPE_SECRET_KEY"
set_secret STRIPE_SECRET_KEY "$STRIPE_SECRET_KEY"

finish
}

run_wizard "$@"; exit
