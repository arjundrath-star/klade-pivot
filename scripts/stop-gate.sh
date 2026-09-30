#!/usr/bin/env bash
# Stop hook. Two checks, in order.
#
# 1. Gate: if source files changed since the last gate pass, run the quick gate and block the
#    stop on failure, so the session keeps working instead of ending with broken code. Skips when
#    nothing changed, so read-only sessions end fast. Guarded by stop_hook_active: a stop that a
#    hook already triggered is not gated again.
# 2. Unfinished work: block the stop while the tree has uncommitted changes (docs and milestone
#    notes included) or commits not yet pushed. Not guarded by stop_hook_active; instead a counter
#    in .stop-nudges (gitignored) allows the stop after three blocks, and is deleted as soon as
#    the tree is clean and pushed.
set -u
cd "$(dirname "$0")/.."

input=$(cat)
hook_active=0
if printf '%s' "$input" | grep -q '"stop_hook_active": *true'; then hook_active=1; fi

block() {
  printf '\n{"decision":"block","reason":"%s"}\n' "$1"
  exit 0
}

STAMP=.gate-passed
if [[ $hook_active -eq 0 ]]; then
  changed=$(git status --porcelain -- . ':!docs' ':!*.md' 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$changed" != "0" ]]; then
    stale=1
    if [[ -f "$STAMP" ]] && [[ -z "$(find . -newer "$STAMP" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' -o -name '*.json' -o -name '*.sql' \) -not -path './node_modules/*' -not -path './.next/*' -print -quit)" ]]; then
      stale=0
    fi
    if [[ $stale -eq 1 ]]; then
      if scripts/gate.sh --quick > .gate.log 2>&1; then
        touch "$STAMP"
      else
        tail -40 .gate.log >&2
        block "The gate failed (see .gate.log). Fix the failures, run scripts/gate.sh --quick until it passes, then stop."
      fi
    fi
  fi
fi

NUDGES=.stop-nudges
MAX_NUDGES=3
dirty=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
# No upstream means nothing to compare against; the dirty-tree check still applies.
unpushed=$(git rev-list --count '@{u}..HEAD' 2>/dev/null || echo 0)
if [[ "$dirty" == "0" && "$unpushed" == "0" ]]; then
  rm -f "$NUDGES"
  exit 0
fi

nudges=$(cat "$NUDGES" 2>/dev/null || echo 0)
if (( nudges >= MAX_NUDGES )); then exit 0; fi
printf '%s\n' "$((nudges + 1))" > "$NUDGES"
block "Milestone work is not finished: uncommitted changes or unpushed commits. Continue the one-shot protocol (reviews, gate, commit, push, CI, notes, six-line report). Do not stop until the tree is clean and pushed."
