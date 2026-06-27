#!/bin/sh
set -e

: "${APP_URL:?APP_URL is not set}"
: "${CRON_SECRET:?CRON_SECRET is not set}"

echo "[saturday-remind] Calling ${APP_URL}/api/cron/saturday-remind"
response=$(curl -s -w "\n%{http_code}" -X GET "${APP_URL}/api/cron/saturday-remind" \
  -H "Authorization: Bearer ${CRON_SECRET}")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
echo "[saturday-remind] Response (${http_code}): ${body}"
[ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ] || { echo "[saturday-remind] FAILED with HTTP ${http_code}"; exit 1; }
