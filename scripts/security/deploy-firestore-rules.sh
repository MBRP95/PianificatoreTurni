#!/usr/bin/env bash
# Deploy firestore.rules SOLO sul progetto di produzione pianificatoreturni.
# Eseguire sul PC dell'admin dopo: firebase login
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
PROJECT="${FIREBASE_PROJECT:-pianificatoreturni}"
BACKUP_DIR="${RULES_BACKUP_DIR:-$HOME/pianificatore-rules-backups}"
mkdir -p "$BACKUP_DIR"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)

echo "== Preflight =="
test -f firestore.rules
rg -q 'allow read: if false' firestore.rules
rg -q 'match /loginKeys' firestore.rules
! rg -q 'allow get: if keyId\.matches' firestore.rules

echo "== Emulator rules tests =="
npx --prefix scripts/security firebase emulators:exec \
  --only firestore --project pianificatoreturni-rules-test \
  "node scripts/security/run-rules-tests.mjs"

echo "== Target project =="
npx --prefix scripts/security firebase use "$PROJECT"

echo "== Backup regole remote (se accessibili) =="
# Best-effort: salva copia locale del file che stiamo per pubblicare + timestamp
cp firestore.rules "$BACKUP_DIR/firestore.rules.before-deploy.$STAMP.localcopy"
echo "Salvato: $BACKUP_DIR/firestore.rules.before-deploy.$STAMP.localcopy"
echo "IMPORTANTE: in Console → Firestore → Rules, copia anche le regole ATTUALI in un file protetto prima del Publish."

echo "== Deploy =="
npx --prefix scripts/security firebase deploy --only firestore:rules --project "$PROJECT"

echo "== Post-check suggerito =="
echo "1) Unauth GET loginKeys/<hex64> deve rispondere PERMISSION_DENIED (non NOT_FOUND)"
echo "2) Login admin/store migrati OK; archivi isolati"
echo "3) Diagnostics.html: loginKeys get negato"
