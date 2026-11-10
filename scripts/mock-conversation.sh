#!/usr/bin/env bash
# CHATFORGE — simulate a full WhatsApp sales conversation against the worker (mock mode).
# Prereq: worker running on :4000 (pnpm --filter worker dev). DB optional.
set -uo pipefail
BASE="http://127.0.0.1:${PORT:-4000}"
FROM="${FROM:-+23481112223333}"

if ! curl -sf "$BASE/health" >/dev/null 2>&1; then
  echo "[chat] worker not running — start it first (pnpm --filter worker dev)"; exit 2
fi

send() {
  local esc="${1//\\/\\\\}"
  esc="${esc//\"/\\\"}"
  printf '{"from":"%s","profileName":"Demo Customer","text":"%s"}' "$FROM" "$esc" \
    | curl -s -X POST "$BASE/ingest" -H 'Content-Type: application/json' -d @-
  echo
}

echo "── ADA'S FASHION STORE · DEMO SALES CONVERSATION ──"
echo "1) greet:"
send "How far! Wetin you get for sale?"
echo "2) ask price:"
send "Wetin be the price of the ankara dress?"
echo "3) intent to buy:"
send "Make I order am. How I go pay?"
echo "4) escalate:"
send "Abeg connect me to a human person"
echo "───────────────────────────────────────────────"
echo "Watch: PRICE_QUOTE → payment link, ESCALATED on request. (All send via [mock-whatsapp] log.)"
