#!/usr/bin/env bash
# Push the single-commit clean tree to MBRP95/PianificatoreTurni.
# Requires: empty repo already created on GitHub (no README/license if possible).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
REMOTE_URL="${1:-https://github.com/MBRP95/PianificatoreTurni.git}"

./scripts/security/verify-no-pii.sh HEAD

if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "$REMOTE_URL"
else
  git remote set-url origin "$REMOTE_URL"
fi

git push -u origin main
echo "PUSH_OK $(git rev-parse HEAD)"
