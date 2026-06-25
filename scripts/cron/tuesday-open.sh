#!/bin/sh
# Triggers /api/cron/tuesday-open on the main app service
set -e

: "${APP_URL:?APP_URL is not set}"
: "${CRON_SECRET:?CRON_SECRET is not set}"

curl -sf -X GET "${APP_URL}/api/cron/tuesday-open" \
  -H "Authorization: Bearer ${CRON_SECRET}"
