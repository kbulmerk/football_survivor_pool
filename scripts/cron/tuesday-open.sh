#!/bin/sh
# Evaluates last week's results, then opens the current week for picks
set -e

: "${APP_URL:?APP_URL is not set}"
: "${CRON_SECRET:?CRON_SECRET is not set}"

curl -sf -X GET "${APP_URL}/api/cron/monday-results" \
  -H "Authorization: Bearer ${CRON_SECRET}"

curl -sf -X GET "${APP_URL}/api/cron/tuesday-open" \
  -H "Authorization: Bearer ${CRON_SECRET}"
