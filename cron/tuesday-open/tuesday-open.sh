#!/bin/sh
set -e

: "${APP_URL:?APP_URL is not set}"
: "${CRON_SECRET:?CRON_SECRET is not set}"

echo "[tuesday-open] Calling ${APP_URL}/api/cron/tuesday-open"
response=$(curl -s -w "\n%{http_code}" -X GET "${APP_URL}/api/cron/tuesday-open" \
  -H "Authorization: Bearer ${CRON_SECRET}")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
echo "[tuesday-open] tuesday-open Response (${http_code}): ${body}"
[ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ] || { echo "[tuesday-open] tuesday-open FAILED with HTTP ${http_code}"; exit 1; }
