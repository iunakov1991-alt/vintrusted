#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: scripts/debug_run_topic.sh data/topic.json"
  exit 1
fi

TOPIC_FILE="$1"
BASENAME="$(basename "$TOPIC_FILE" .json)"
mkdir -p tmp logs

echo "=== DEBUG: MONSTER 8.0 pipeline for $TOPIC_FILE ==="

if [[ -f scripts/rl_ingest_metrics.js ]]; then
  echo "[0/4] RL ingest metrics..."
  node scripts/rl_ingest_metrics.js || true
fi
if [[ -f scripts/rl_update_strategy.js ]]; then
  echo "[0/4] RL update strategy..."
  node scripts/rl_update_strategy.js || true
fi

echo "[1/4] Generating ArticleSpec..."
node scripts/build_article_spec.js --topic-file "$TOPIC_FILE" > "tmp/${BASENAME}.spec.json"

echo "[2/4] Generating article blocks (LLM_GEN_MODE=${LLM_GEN_MODE:-prod})..."
node scripts/gen_article_blocks.js --topic-file "$TOPIC_FILE" > "tmp/${BASENAME}.blocks.json"

if [[ -f scripts/qa_llm_blocks.js ]]; then
  echo "[3/4] Running LLM-QA (LLM_QA_MODE=${LLM_QA_MODE:-none})..."
  node scripts/qa_llm_blocks.js "tmp/${BASENAME}.blocks.json" || true
else
  echo "[3/4] LLM-QA skipped"
fi

if [[ -z "${DEEPSEEK_API_KEY:-}" && -z "${USE_LOCAL_AI:-}" ]]; then
  echo "[4/4] Validation skipped (content likely stub)."
else
  echo "[4/4] Validating blocks..."
  node scripts/validate_blocks.js "tmp/${BASENAME}.blocks.json" | tee "tmp/${BASENAME}.validate.out" || true
fi

echo "=== DEBUG DONE for $BASENAME ==="
