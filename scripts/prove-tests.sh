#!/bin/sh
# Runs mutants against a test command in a throwaway git worktree, so the
# caller's files are never touched. Needs only sh and git, so it works in any
# repo whatever its language. The h2xd:prove-tests skill writes the mutants.
#
#   sh scripts/prove-tests.sh --mutants DIR --test CMD [--check CMD]
#     [--setup CMD] [--timeout-factor N] [--only ID,ID] [--out FILE]
#   sh scripts/prove-tests.sh --native CMD [--setup CMD]
#
# DIR holds one unified diff per mutant, NNN.patch, with or without context
# lines. A patch with no context lines is applied with `--unidiff-zero`.
# Each result is a line `<id>\t<status>\t<seconds>`:
#   killed    the test command failed
#   timeout   it ran past the baseline times the factor; counts as killed
#   survived  it passed, so no test noticed
#   invalid   the patch did not apply, or --check failed on it
# Exit 0 when every mutant ran, 2 on a usage error, 3 when the tests already
# fail before any mutation.
#
# --native runs CMD (a mutation tool) once in the worktree, keeps the worktree
# and prints `worktree\t<path>`, so its report can be read before removing it.

set -u

usage() {
  sed -n '7,9p' "$0" | sed 's/^# //' >&2
  exit 2
}

MUTANTS="" TEST="" CHECK="" SETUP="" NATIVE="" ONLY="" OUT="" FACTOR=3
while [ $# -gt 0 ]; do
  [ $# -ge 2 ] || usage
  case "$1" in
    --mutants) MUTANTS=$2 ;;
    --test) TEST=$2 ;;
    --check) CHECK=$2 ;;
    --setup) SETUP=$2 ;;
    --native) NATIVE=$2 ;;
    --only) ONLY=$2 ;;
    --out) OUT=$2 ;;
    --timeout-factor) FACTOR=$2 ;;
    *) usage ;;
  esac
  shift 2
done
if [ -z "$NATIVE" ]; then
  [ -n "$MUTANTS" ] && [ -n "$TEST" ] && [ -d "$MUTANTS" ] || usage
  MUTANTS=$(cd "$MUTANTS" && pwd)
fi
[ -z "$OUT" ] || : >"$OUT"

ROOT=$(git rev-parse --show-toplevel) || exit 2
WT=$(mktemp -d "${TMPDIR:-/tmp}/prove-tests.XXXXXX") || exit 2
rmdir "$WT"
KEEP=""

cleanup() {
  [ -n "$KEEP" ] || git -C "$ROOT" worktree remove --force "$WT" >/dev/null 2>&1
  rm -f "$WT.timeout" "$WT.diff"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

git -C "$ROOT" worktree add --quiet --detach "$WT" HEAD || exit 2

# Carry the uncommitted work over, then commit it in the worktree so a reset
# between mutants returns to exactly this state.
git -C "$ROOT" diff HEAD --binary >"$WT.diff"
[ -s "$WT.diff" ] && git -C "$WT" apply --whitespace=nowarn "$WT.diff"
rm -f "$WT.diff"
git -C "$ROOT" ls-files --others --exclude-standard | while IFS= read -r path; do
  mkdir -p "$WT/$(dirname "$path")"
  cp -p "$ROOT/$path" "$WT/$path"
done
git -C "$WT" add -A
git -C "$WT" -c user.name=prove-tests -c user.email=prove-tests@localhost \
  commit --quiet --allow-empty --no-verify -m snapshot

if [ -n "$SETUP" ]; then
  (cd "$WT" && sh -c "$SETUP") >&2 || { echo "setup failed: $SETUP" >&2; exit 2; }
fi

if [ -n "$NATIVE" ]; then
  KEEP=1
  (cd "$WT" && sh -c "$NATIVE") >&2
  printf 'worktree\t%s\n' "$WT"
  exit 0
fi

emit() {
  if [ -n "$OUT" ]; then printf '%s\t%s\t%s\n' "$1" "$2" "$3" >>"$OUT"; fi
  printf '%s\t%s\t%s\n' "$1" "$2" "$3"
}

# Runs the test command with a time limit. Where the shell has job control,
# the command gets its own process group, so a timeout also stops the test
# runner's children; elsewhere only the runner itself is stopped.
TIMED_OUT="$WT.timeout"
stop() {
  kill "-$1" -"$2" 2>/dev/null || kill "-$1" "$2" 2>/dev/null
}
run_tests() {
  limit=$1
  rm -f "$TIMED_OUT"
  set -m 2>/dev/null
  (cd "$WT" && exec sh -c "$TEST") </dev/null >/dev/null 2>&1 &
  pid=$!
  set +m 2>/dev/null
  (
    exec </dev/null >/dev/null 2>&1
    waited=0
    while kill -0 "$pid" 2>/dev/null; do
      if [ "$waited" -ge "$limit" ]; then
        : >"$TIMED_OUT"
        stop TERM "$pid"
        sleep 2
        stop KILL "$pid"
        break
      fi
      sleep 1
      waited=$((waited + 1))
    done
  ) &
  watcher=$!
  wait "$pid"
  status=$?
  kill "$watcher" 2>/dev/null
  wait "$watcher" 2>/dev/null
  if [ -e "$TIMED_OUT" ]; then rm -f "$TIMED_OUT"; return 124; fi
  return "$status"
}

start=$(date +%s)
run_tests 3600
baseline=$?
took=$(($(date +%s) - start))
if [ "$baseline" -ne 0 ]; then
  emit baseline red "$took"
  exit 3
fi
LIMIT=$((took * FACTOR + 5))

killed=0 survived=0 invalid=0
for patch in "$MUTANTS"/*.patch; do
  [ -e "$patch" ] || continue
  id=$(basename "$patch" .patch)
  case ",$ONLY," in ",,"|*",$id,"*) ;; *) continue ;; esac
  start=$(date +%s)
  zero=
  grep -q '^ ' "$patch" || zero=--unidiff-zero
  if ! git -C "$WT" apply $zero "$patch" 2>/dev/null; then
    emit "$id" invalid 0
    invalid=$((invalid + 1))
    continue
  fi
  if [ -n "$CHECK" ] && ! (cd "$WT" && sh -c "$CHECK") >/dev/null 2>&1; then
    status=invalid
  else
    run_tests "$LIMIT"
    case $? in
      0) status=survived ;;
      124) status=timeout ;;
      *) status=killed ;;
    esac
  fi
  git -C "$WT" reset --quiet --hard
  git -C "$WT" clean --quiet -fd
  emit "$id" "$status" $(($(date +%s) - start))
  case $status in
    survived) survived=$((survived + 1)) ;;
    invalid) invalid=$((invalid + 1)) ;;
    *) killed=$((killed + 1)) ;;
  esac
done

echo "killed $killed, survived $survived, invalid $invalid (baseline ${took}s, limit ${LIMIT}s)" >&2
