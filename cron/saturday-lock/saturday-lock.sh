#!/bin/sh
set -e

: "${APP_URL:?APP_URL is not set}"
: "${CRON_SECRET:?CRON_SECRET is not set}"

echo "[saturday-lock] Calling ${APP_URL}/api/cron/saturday-lock"
response=$(curl -s -w "\n%{http_code}" -X GET "${APP_URL}/api/cron/saturday-lock" \
  -H "Authorization: Bearer ${CRON_SECRET}")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
echo "[saturday-lock] Response (${http_code}): ${body}"
[ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ] || { echo "[saturday-lock] FAILED with HTTP ${http_code}"; exit 1; }
