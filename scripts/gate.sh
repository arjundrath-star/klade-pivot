#!/usr/bin/env bash
# The gate. Nothing is "done" until this exits 0.
# Runs locally (Stop hook, pre-push) and in CI with identical steps.
# Usage: scripts/gate.sh [--quick]   (--quick skips build, smoke and lighthouse)
set -euo pipefail
cd "$(dirname "$0")/.."

QUICK=0
[[ "${1:-}" == "--quick" ]] && QUICK=1

step() { printf '\n==> %s\n' "$1"; }
fail() { printf '\nGATE FAILED at: %s\n' "$1" >&2; exit 1; }

step "typecheck";  npm run -s typecheck || fail typecheck
step "lint";       npm run -s lint      || fail lint
step "unit tests"; npm run -s test      || fail "unit tests"

if [[ $QUICK -eq 1 ]]; then
  printf '\nGATE (quick) PASSED\n'; exit 0
fi

step "production build"; npm run -s build || fail build

step "smoke test (boots the built app, walks the core flow)"
npm run -s smoke || fail smoke

if [[ "${GATE_LIGHTHOUSE:-1}" == "1" ]]; then
  step "lighthouse (performance budget)"
  npm run -s lighthouse || fail lighthouse
fi

printf '\nGATE PASSED\n'
