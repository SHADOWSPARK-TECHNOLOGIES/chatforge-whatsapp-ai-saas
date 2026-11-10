#!/usr/bin/env bash
# CHATFORGE — test the worker webhook path: verification + ingest + normalization + intent.
# Usage: bash scripts/test-webhook.sh   (worker should be running on :4000, or it starts it)
set -uo pipefail
PORT="${PORT:-4000}"
BASE="http://127.0.0.1:$PORT"

if ! curl -sf "$BASE/health" >/dev/null 2>&1; then
  echo "[test] worker not running — start it:  pnpm --filter worker dev"
  exit 2
fi

echo "== 1. webhook GET verification (wrong token → 403) =="
curl -s -o /dev/null -w "  status=%{http_code}\n" "$BASE/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=WRONG"

echo "== 2. webhook GET verification (correct token → challenge) =="
curl -s -w "\n  (status=%{http_code})\n" "$BASE/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=chatforge_verify"

echo "== 3. ingest a Pidgin price question =="
curl -s -X POST "$BASE/ingest" -H 'Content-Type: application/json' \
  -d '{"from":"+2347030001000","text":"How far! Wetin be the price of the ankara dress?","profileName":"Chika"}' -w "\n  (status=%{http_code})\n"

echo "== 4. ingest a booking intent =="
curl -s -X POST "$BASE/ingest" -H 'Content-Type: application/json' \
  -d '{"from":"+2348050002000","text":"I dey interested, make I order one senator wear"}'

echo
echo "== 5. ingest a Meta-shaped webhook payload =="
curl -s -X POST "$BASE/webhook/whatsapp" -H 'Content-Type: application/json' -d '{
  "object": "whatsapp_business_account",
  "entry": [{ "changes": [{ "field": "messages", "value": {
    "metadata": { "phone_number_id": "mock_phone_234" },
    "contacts": [{ "wa_id": "+2349090003000", "profile": { "name": "Tobi" } }],
    "messages": [{ "id": "wamid_TEST_001", "from": "+2349090003000", "timestamp": "1700000000", "type": "text", "text": { "body": "Abeg how much e be?" } }]
  }}]}]
}' -w "\n  (status=%{http_code})\n"

echo "== 6. duplicate message id is skipped =="
curl -s -X POST "$BASE/webhook/whatsapp" -H 'Content-Type: application/json' -d '{
  "object": "whatsapp_business_account",
  "entry": [{ "changes": [{ "field": "messages", "value": {
    "metadata": { "phone_number_id": "mock_phone_234" },
    "contacts": [{ "wa_id": "+2349090003000", "profile": { "name": "Tobi" } }],
    "messages": [{ "id": "wamid_TEST_001", "from": "+2349090003000", "timestamp": "1700000000", "type": "text", "text": { "body": "Again" } }]
  }}]}]
}'

echo
echo "[test] webhook suite done."
