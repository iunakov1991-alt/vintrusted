#!/bin/bash
set -a
source .env.local
set +a

export DEEPSEEK_API_KEY
export AI_PROVIDER_PRIMARY="deepseek"

echo "🔑 DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY:0:10}..."
echo "🤖 AI_PROVIDER_PRIMARY: $AI_PROVIDER_PRIMARY"

node scripts/build_topics_batch_parallel.js --mode prod
