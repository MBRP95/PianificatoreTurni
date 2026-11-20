#!/usr/bin/env bash
# Probe NON autenticato sul progetto di produzione (nessuna credenziale).
# Distingue PERMISSION_DENIED (403) da NOT_FOUND (404).
# Un 404 su loginKeys indica ancora get pubblico (rules vecchie).
set -euo pipefail
PROJECT="${FIREBASE_PROJECT:-pianificatoreturni}"
BASE="https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents"
FAIL=0

echo "project=$PROJECT"
echo "stamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)"

check_denied() {
  local label="$1" method="$2" path="$3" body="${4:-}"
  local out code
  out=$(mktemp)
  if [[ "$method" == "PATCH" ]]; then
    code=$(curl -sS -X PATCH -H 'Content-Type: application/json' \
      -d '{"fields":{"probe":{"stringValue":"unauth"}}}' \
      -o "$out" -w '%{http_code}' "$BASE/$path")
  else
    code=$(curl -sS -o "$out" -w '%{http_code}' "$BASE/$path")
  fi
  local status
  status=$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print((d.get("error") or {}).get("status") or ("OK" if "name" in d or "documents" in d else "?"))' "$out")
  echo "$label HTTP $code status=$status"
  if [[ "$status" != "PERMISSION_DENIED" ]]; then
    echo "  FAIL: atteso PERMISSION_DENIED per $label"
    FAIL=1
  fi
  rm -f "$out"
}

# Documento esistente con get pubblico intenzionale (senza PII)
code_init=$(curl -sS -o /tmp/probe-init.json -w '%{http_code}' "$BASE/settings/initialized")
echo "settings/initialized HTTP $code_init (atteso 200)"
python3 - <<'PY'
import json,sys
d=json.load(open('/tmp/probe-init.json'))
if 'name' not in d:
  print('FAIL: settings/initialized non leggibile/assente'); sys.exit(1)
print('OK: bootstrap marker presente; keys=', sorted((d.get('fields') or {}).keys()))
PY

HEX=$(python3 -c 'import secrets; print(secrets.token_hex(32))')
# loginKeys: con rules nuove, anche doc inesistente → PERMISSION_DENIED (non 404)
check_denied "loginKeys GET random" GET "loginKeys/$HEX"
check_denied "loginKeys LIST" GET "loginKeys"
check_denied "loginKeys PATCH" PATCH "loginKeys/$HEX"

check_denied "staffSecrets GET" GET "staffSecrets/nonexistent-uid-probe"
check_denied "staffSecrets LIST" GET "staffSecrets"

check_denied "archives LIST" GET "archives"
check_denied "archives GET path" GET "archives/demo01/years/2026"
check_denied "archives PATCH" PATCH "archives/probe-unauth/years/2026"

check_denied "users LIST" GET "users"
check_denied "users GET" GET "users/nonexistent-uid-probe"
check_denied "shops LIST" GET "shops"
check_denied "unknown LIST" GET "totallyUnknownCollection"
check_denied "unknown PATCH" PATCH "totallyUnknownCollection/doc1"

if [[ "$FAIL" -ne 0 ]]; then
  echo "RESULT: FAIL — una o più letture/scritture unauth non sono deny"
  exit 2
fi
echo "RESULT: PASS — accessi non autenticati negati (PERMISSION_DENIED)"
