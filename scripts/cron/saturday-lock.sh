#!/bin/sh
# Triggers /api/cron/saturday-lock on the main app service
set -e

: "${APP_URL:?APP_URL is not set}"
: "${CRON_SECRET:?CRON_SECRET is not set}"

curl -sf -X GET "${APP_URL}/api/cron/saturday-lock" \
  -H "Authorization: Bearer ${CRON_SECRET}"
