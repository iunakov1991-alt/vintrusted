#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   BATCH_STATUS_TOKEN=... ./tools/clear_stuck_batch.sh <batch_id>
#
# Example:
#   export BATCH_STATUS_TOKEN="P7eDNVfAqH3vZt5gLsR0mXucYb4Wj9kT"
#   ./tools/clear_stuck_batch.sh 2025-12-08T11-06-28-926Z_en_only_short

VERCEL_URL="${VERCEL_URL:-https://vintrusted.com}"
SECRET="${BATCH_STATUS_TOKEN:-}"
BATCH_ID="${1:-}"

if [ -z "$SECRET" ]; then
  echo "ERROR: set BATCH_STATUS_TOKEN in env before running" >&2
  exit 1
fi

if [ -z "$BATCH_ID" ]; then
  echo "Usage: BATCH_STATUS_TOKEN=... ./tools/clear_stuck_batch.sh <batch_id>" >&2
  exit 1
fi

echo "Clearing batch $BATCH_ID via $VERCEL_URL/api/batch-status-update ..."

curl -sS -X POST "${VERCEL_URL}/api/batch-status-update" \
  -H "X-MONSTER-SECRET: ${SECRET}" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"${BATCH_ID}\",\"patch\":{\"status\":\"failed\",\"stopRequested\":false,\"finishedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}"

echo
