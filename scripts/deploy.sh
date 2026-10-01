#!/usr/bin/env bash
# Redeploys the production build on the VPS from this checkout: pulls main, installs, builds with
# the service's environment (NEXT_PUBLIC_* values are inlined at build time), restarts the unit.
# The app is down for the length of the build, about a minute on the 2-core box.
# Usage: scripts/deploy.sh   (KLADE_ENV_FILE and KLADE_SERVICE override the defaults)
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE="${KLADE_ENV_FILE:-$HOME/.config/klade/klade.env}"
SERVICE="${KLADE_SERVICE:-klade.service}"
[[ -r "$ENV_FILE" ]] || { echo "no environment file at $ENV_FILE" >&2; exit 1; }

git pull --ff-only
npm ci --no-audit --no-fund
set -a
# shellcheck source=/dev/null
. "$ENV_FILE"
set +a
npm run -s build
sudo systemctl restart "$SERVICE"
systemctl is-active --quiet "$SERVICE" && echo "$SERVICE restarted at $(git rev-parse --short HEAD)"
