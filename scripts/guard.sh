#!/usr/bin/env bash
# PreToolUse guard for Bash. Reads the tool input JSON on stdin and exits 2
# (block, with reason) for commands that must never run unattended.
set -u
input=$(cat)
cmd=$(printf '%s' "$input" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null || true)

block() { printf '%s\n' "BLOCKED by scripts/guard.sh: $1" >&2; exit 2; }

case "$cmd" in
  *"git push"*"--force"*|*"git push -f"*|*"push --force-with-lease"*) block "force push" ;;
  *"rm -rf /"*|*"rm -rf ~"*|*"rm -rf ."*|*"rm -rf .."*|*"rm -rf *"*) block "recursive delete of a root, home, or cwd" ;;
  *"git reset --hard"*) block "hard reset; use git stash or a branch" ;;
  *"git checkout -- ."*|*"git restore ."*) block "discarding the whole working tree" ;;
  *"cat .env"*|*"cat ./.env"*|*"source .env"*|*". .env"*) block "printing or sourcing .env" ;;
  *"vercel --prod"*|*"vercel deploy --prod"*) block "production deploy; Arjun runs prod deploys" ;;
esac
exit 0
