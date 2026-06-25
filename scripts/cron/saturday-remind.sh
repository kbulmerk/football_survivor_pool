#!/bin/sh
# Triggers /api/cron/saturday-remind on the main app service
set -e

: "${APP_URL:?APP_URL is not set}"
: "${CRON_SECRET:?CRON_SECRET is not set}"

curl -sf -X GET "${APP_URL}/api/cron/saturday-remind" \
  -H "Authorization: Bearer ${CRON_SECRET}"
