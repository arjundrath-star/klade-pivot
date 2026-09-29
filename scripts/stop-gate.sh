#!/usr/bin/env bash
# Stop hook. If source files changed since the last gate pass, run the gate.
# On failure, block the stop so the session keeps working instead of ending
# with broken code. Skips when nothing changed, so read-only sessions end fast.
set -u
cd "$(dirname "$0")/.."

input=$(cat)
# Prevent infinite loops: if this stop was already triggered by a hook, let it end.
if printf '%s' "$input" | grep -q '"stop_hook_active": *true'; then exit 0; fi

STAMP=.gate-passed
changed=$(git status --porcelain -- . ':!docs' ':!*.md' 2>/dev/null | wc -l | tr -d ' ')
if [[ "$changed" == "0" ]]; then exit 0; fi
if [[ -f "$STAMP" ]] && [[ -z "$(find . -newer "$STAMP" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' -o -name '*.json' -o -name '*.sql' \) -not -path './node_modules/*' -not -path './.next/*' -print -quit)" ]]; then
  exit 0
fi

if scripts/gate.sh --quick > .gate.log 2>&1; then
  touch "$STAMP"
  exit 0
fi

tail -40 .gate.log >&2
printf '\n%s\n' '{"decision":"block","reason":"The gate failed (see .gate.log). Fix the failures, run scripts/gate.sh --quick until it passes, then stop."}'
exit 0
