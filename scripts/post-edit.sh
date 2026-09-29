#!/usr/bin/env bash
# PostToolUse hook for Edit|Write: lint and format only the file that changed.
# Fast feedback without a full typecheck on every keystroke.
set -u
cd "$(dirname "$0")/.."
input=$(cat)
file=$(printf '%s' "$input" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("tool_input",{}).get("file_path",""))' 2>/dev/null || true)
[[ -z "$file" ]] && exit 0
case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs)
    npx --no-install prettier --log-level silent --write "$file" 2>/dev/null || true
    npx --no-install eslint --max-warnings=0 "$file" 2>&1 | tail -20 >&2 || true
    ;;
  *.css|*.json|*.md)
    npx --no-install prettier --log-level silent --write "$file" 2>/dev/null || true
    ;;
esac
exit 0
