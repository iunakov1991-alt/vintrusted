#!/usr/bin/env bash
set -e

if [[ -z "$VERCEL_URL" || -z "$MONSTER_INTERNAL_SECRET" ]]; then
  echo "Need VERCEL_URL and MONSTER_INTERNAL_SECRET"
  exit 1
fi

echo "=== Stop old runner ==="
pkill -f "scripts/local_runner.js" 2>/dev/null || true
sleep 1

echo "=== Start runner in background ==="
NODE_ENV=production \
VERCEL_URL="$VERCEL_URL" \
MONSTER_INTERNAL_SECRET="$MONSTER_INTERNAL_SECRET" \
node scripts/local_runner.js > runner.log 2>&1 &
RUNNER_PID=$!
sleep 2

echo "=== Start batch ==="
START=$(curl -s -X POST "$VERCEL_URL/api/monster/start" -H "Content-Type: application/json" -d '{"phase":"auto","length":"auto"}')
echo "Start response: $START"
BATCH_ID=$(echo "$START" | grep -o '"batchId":"[^"]*"' | cut -d'"' -f4)
if [[ -z "$BATCH_ID" ]]; then
  echo "No batchId returned, abort"
  kill $RUNNER_PID 2>/dev/null || true
  exit 1
fi
echo "batchId=$BATCH_ID"

echo "=== Wait queued -> running ==="
for i in {1..30}; do
  STATUS=$(curl -s "$VERCEL_URL/api/monster/status" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "[$i] status=$STATUS"
  if [[ "$STATUS" == "running" ]]; then break; fi
  sleep 2
done

echo "=== Wait for final (success/failed/stopped) ==="
for i in {1..90}; do
  STATUS=$(curl -s "$VERCEL_URL/api/monster/status" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "[$i] status=$STATUS"
  if [[ "$STATUS" == "success" || "$STATUS" == "failed" || "$STATUS" == "stopped" ]]; then break; fi
  sleep 2
done

echo "=== Stop runner ==="
kill $RUNNER_PID 2>/dev/null || true

echo "Done. See runner.log for details."










