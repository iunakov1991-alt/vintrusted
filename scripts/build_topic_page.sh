#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: scripts/build_topic_page.sh data/topic.json [--skip-gen]"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
TOPIC_FILE="$1"
if [[ "$TOPIC_FILE" != /* ]]; then
  TOPIC_FILE="$ROOT_DIR/$TOPIC_FILE"
fi
SKIP_GEN=0
SKIP_RENDER=0
SKIP_VALIDATE=0
if [[ "${2:-}" == "--skip-gen" ]] || [[ "${2:-}" == "--skip-gen=1" ]]; then
  SKIP_GEN=1
fi
if [[ "${SKIP_RENDER:-0}" == "1" ]] || [[ -n "${SKIP_RENDER:-}" ]]; then
  SKIP_RENDER=1
fi
if [[ "${SKIP_VALIDATE:-0}" == "1" ]] || [[ -n "${SKIP_VALIDATE:-}" ]]; then
  SKIP_VALIDATE=1
fi

if [[ ! -f "$TOPIC_FILE" ]]; then
  echo "[ERR] Topic file not found: $TOPIC_FILE"
  exit 1
fi

# Load default environment if not provided by caller
if [[ -z "${DEEPSEEK_API_KEY:-}" || -z "${LLM_GEN_MODE:-}" ]]; then
  ENV_FILE="$ROOT_DIR/config/monster8_env.json"
  if [[ -f "$ENV_FILE" ]]; then
    while IFS='=' read -r KEY VAL; do
      export "$KEY"="$VAL"
    done < <(node -e 'const fs=require("fs");const data=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));Object.entries(data).forEach(([k,v])=>console.log(`${k}=${v}`));' "$ENV_FILE")
  fi
fi

if [[ -z "${DEEPSEEK_API_KEY:-}" && "${USE_LOCAL_AI:-0}" != "1" ]]; then
  echo "[ERR] No LLM provider configured. Set DEEPSEEK_API_KEY or USE_LOCAL_AI=1."
  exit 1
fi

BASENAME="$(basename "$TOPIC_FILE" .json)"
BLOCKS_PATH="$ROOT_DIR/tmp/${BASENAME}.blocks.json"
VALIDATE_PATH="$ROOT_DIR/tmp/${BASENAME}.validate.out"
QA_PATH="$ROOT_DIR/tmp/${BASENAME}.qa.llm.txt"

mkdir -p "$ROOT_DIR/tmp" "$ROOT_DIR/logs"

echo "=== BUILD TOPIC PAGE: $TOPIC_FILE ==="

MAX_ATTEMPTS=${MAX_ATTEMPTS:-3}
ATTEMPT=1
VALIDATION_OK=0

while [[ $ATTEMPT -le $MAX_ATTEMPTS ]]; do
  if [[ $SKIP_GEN -eq 0 ]]; then
    echo "[1/4] Generating article blocks (attempt $ATTEMPT/$MAX_ATTEMPTS)..."
    # Сохраняем вывод в файл и проверяем на ошибки
    if ! node "$ROOT_DIR/scripts/gen_article_blocks.js" --topic-file "$TOPIC_FILE" > "$BLOCKS_PATH" 2>"$BLOCKS_PATH.err"; then
      echo "[WARN] Generation produced errors, checking output..."
      if [[ ! -s "$BLOCKS_PATH" ]]; then
        echo "[FATAL] Blocks file is empty after generation"
        if [[ $ATTEMPT -lt $MAX_ATTEMPTS ]]; then
          echo "[WARN] Retrying generation..."
          continue
        else
          exit 1
        fi
      fi
    fi
    # Проверяем, что файл содержит валидный JSON
    if ! node -e "JSON.parse(require('fs').readFileSync('$BLOCKS_PATH', 'utf8'))" 2>/dev/null; then
      echo "[WARN] Generated blocks.json is not valid JSON, attempting to fix..."
      # Пытаемся исправить: берем только до последнего }
      node -e "
        const fs = require('fs');
        const content = fs.readFileSync('$BLOCKS_PATH', 'utf8').trim();
        const lastBrace = content.lastIndexOf('}');
        if (lastBrace > 0) {
          const fixed = content.substring(0, lastBrace + 1);
          try {
            JSON.parse(fixed);
            fs.writeFileSync('$BLOCKS_PATH', fixed);
            console.log('Fixed JSON');
          } catch(e) {
            console.error('Could not fix JSON');
            process.exit(1);
          }
        } else {
          console.error('No valid JSON found');
          process.exit(1);
        }
      " || {
        echo "[FATAL] Could not fix invalid JSON in $BLOCKS_PATH"
        if [[ $ATTEMPT -lt $MAX_ATTEMPTS ]]; then
          echo "[WARN] Retrying generation..."
          continue
        else
          exit 1
        fi
      }
    fi
  else
    echo "[1/4] Skipped generation (using existing $BLOCKS_PATH)"
  fi

  if [[ ! -f "$BLOCKS_PATH" ]]; then
    echo "[FATAL] Blocks file missing after generation: $BLOCKS_PATH"
    exit 1
  fi

  if [[ $SKIP_VALIDATE -eq 0 ]]; then
    echo "[2/4] Validating blocks..."
    VALIDATION_OUTPUT="$(node "$ROOT_DIR/scripts/validate_blocks.js" "$BLOCKS_PATH" | tee "$VALIDATE_PATH")"
    if echo "$VALIDATION_OUTPUT" | grep -q "FATAL=0"; then
      VALIDATION_OK=1
      break
    fi
  else
    echo "[2/4] Skipping validation (SKIP_VALIDATE=1)"
    VALIDATION_OK=1
    break
  fi

  if [[ $SKIP_GEN -eq 1 ]]; then
    echo "[FATAL] Validation failed (existing blocks) — see $VALIDATE_PATH"
    exit 1
  fi

  if [[ $ATTEMPT -lt $MAX_ATTEMPTS ]]; then
    echo "[WARN] Validation failed (attempt $ATTEMPT). Retrying generation..."
  fi
  ATTEMPT=$((ATTEMPT + 1))
done

if [[ $VALIDATION_OK -ne 1 ]]; then
  echo "[FATAL] Validation failed after $MAX_ATTEMPTS attempt(s) — see $VALIDATE_PATH"
  exit 1
fi

# Обновляем метрики и стратегию на основе результатов валидации
if [[ -f "$ROOT_DIR/scripts/rl_ingest_metrics.js" ]]; then
  echo "[RL] Ingesting quality metrics..."
  node "$ROOT_DIR/scripts/rl_ingest_metrics.js" > /dev/null 2>&1 || true
fi

if [[ -f "$ROOT_DIR/scripts/rl_update_strategy.js" ]]; then
  echo "[RL] Updating learned strategy..."
  node "$ROOT_DIR/scripts/rl_update_strategy.js" > /dev/null 2>&1 || true
fi

echo "[3/4] LLM-QA (mode=${LLM_QA_MODE:-none})..."
if [[ -n "${LLM_QA_MODE:-}" && "${LLM_QA_MODE:-none}" != "none" ]]; then
  node "$ROOT_DIR/scripts/qa_llm_blocks.js" "$BLOCKS_PATH" || echo "[WARN] LLM-QA finished with warnings"
else
  echo "[QA] skipped"
fi

QA_MSG=""
if [[ -f "$QA_PATH" ]]; then
  QA_MSG="; QA → $QA_PATH"
fi

if [[ $SKIP_RENDER -eq 0 ]]; then
  echo "[4/4] Rendering HTML..."
  node "$ROOT_DIR/scripts/render_article_from_blocks.js" --blocks-file "$BLOCKS_PATH"
else
  echo "[4/4] Skipping render (SKIP_RENDER=1)"
fi

HTML_PATH=$(node -e 'const fs=require("fs"),path=require("path"),payload=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const topic=payload.topic||{};const slug=(s="")=>s.toString().trim().toLowerCase().replace(/[_\s]+/g,"-").replace(/[^a-z0-9-]/g,"").replace(/-+/g,"-").replace(/^-|-$/g,"");const segs=[];segs.push(slug(topic.language||"en"));if(topic.zone)segs.push(slug(topic.zone));const dims=topic.dimensions||{};["state","dmv_topic","format_variant","brand","model"].forEach((k)=>{if(dims[k])segs.push(slug(dims[k]));});if(!dims.state&&topic.topic_id)segs.push(slug(topic.topic_id));const out=path.join("public","semantic-pages",...segs,"index.html");process.stdout.write(out);' "$BLOCKS_PATH")

if [[ -n "$HTML_PATH" && -f "$ROOT_DIR/$HTML_PATH" ]]; then
  echo "[DONE] Page built → $ROOT_DIR/$HTML_PATH$QA_MSG"
else
  echo "[WARN] HTML file not detected — please check logs"
fi

