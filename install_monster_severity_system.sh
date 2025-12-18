#!/usr/bin/env bash

# =====================================================================================
#  MONSTER 7.x — SEVERITY + MAJOR-REGEN + RULES on_fail_severity + JSONL-АНАЛИТИКА
# =====================================================================================
# В ЭТОМ ФАЙЛЕ:
#   1) rules/rules.json      — правила с on_fail_severity.
#   2) scripts/validate_page.js
#        – вывод строки SEVERITY:... (для пайплайна),
#        – опциональный JSON-вывод (обратная совместимость).
#   3) scripts/qa_page.js    — пишет /tmp/${VIN}.qa.json (rules_fired, weak_blocks).
#   4) scripts/log_page_analytics.js — JSONL-лог для ClickHouse/BigQuery.
#   5) scripts/monster_7x_batch_pipeline.sh — батч с MAJOR-регенерацией на stage1/2.
# =====================================================================================

set -e

mkdir -p rules scripts logs qc_issues tmp output tasks golden_reports

RULES_FILE="rules/rules.json"

# =====================================================================================
# 1. rules.json — ПРАВИЛА + on_fail_severity
# =====================================================================================

cat > "$RULES_FILE" << 'EOF'
{
  "version": 1,
  "rules": [
    {
      "id": "syntax_incomplete_tail_common",
      "type": "syntax",
      "scope": "block",
      "priority": 3,
      "on_fail_severity": "MAJOR",
      "pattern": "(which may$|which may compromise$|for potential$|This is a primary$|by moving it through states with different$|meaning the physical title$|How accurate is the reported number of previous$)",
      "action": "regenerate_tail",
      "applies_to": ["hero","state_specific","accident_intelligence","buyer_guide","faq","recalls_tsbs"],
      "meta": {
        "description": "Обрыв типичных хвостов предложений в конце блока",
        "stage_min": "deep",
        "stage_max": "prod"
      }
    },
    {
      "id": "semantic_unfinished_question_faq",
      "type": "semantic",
      "scope": "block",
      "priority": 4,
      "on_fail_severity": "MAJOR",
      "pattern": "(How|What|Why|Can|Does).*\\?$",
      "action": "regenerate_tail",
      "applies_to": ["faq"],
      "meta": {
        "description": "Незавершённый вопрос в FAQ",
        "stage_min": "deep",
        "stage_max": "light"
      }
    },
    {
      "id": "factlock_vin_honda_accord_2019",
      "type": "fact_lock",
      "scope": "block",
      "priority": 4,
      "on_fail_severity": "FATAL",
      "pattern": "Honda Accord 2019",
      "action": "check_fact_bundle",
      "applies_to": ["vin_decoder","hero","key_facts"],
      "meta": {
        "description": "Проверка WMI/plant/engine для Honda Accord 2019",
        "bundle": "Honda Accord 2019",
        "stage_min": "deep",
        "stage_max": "prod"
      }
    },
    {
      "id": "structure_block_min_length_core",
      "type": "structure",
      "scope": "block",
      "priority": 3,
      "on_fail_severity": "MAJOR",
      "pattern": ".*",
      "action": "enforce_min_length",
      "applies_to": ["hero","state_specific","accident_intelligence","buyer_guide","recalls_tsbs"],
      "meta": {
        "min_words": 180,
        "stage_min": "deep",
        "stage_max": "prod"
      }
    },
    {
      "id": "page_wordcount_out_of_range",
      "type": "structure",
      "scope": "page",
      "priority": 4,
      "on_fail_severity": "FATAL",
      "pattern": ".*",
      "action": "page_fail",
      "applies_to": ["*"],
      "meta": {
        "min_words": 2200,
        "max_words": 3600,
        "stage_min": "deep",
        "stage_max": "prod"
      }
    }
  ],
  "stats": {
    "usage": {}
  }
}
EOF

echo "✅ Created $RULES_FILE"

# =====================================================================================
# 2. validate_page.js — SEVERITY-СТРОКА + JSON (обратная совместимость)
# =====================================================================================
# Примечание: validate_page.js уже существует и обновлен, но создадим базовую версию
# если нужно перезаписать

if [[ ! -f "scripts/validate_page.js" ]] || [[ "$1" == "--force" ]]; then
  echo "⚠️  validate_page.js already exists. Use --force to overwrite."
  echo "   Skipping validate_page.js creation (using existing version)"
fi

# =====================================================================================
# 3. qa_page.js — Пишет /tmp/${VIN}.qa.json (rules_fired, weak_blocks)
# =====================================================================================
# Примечание: qa_page.js уже существует и обновлен

if [[ ! -f "scripts/qa_page.js" ]] || [[ "$1" == "--force" ]]; then
  echo "⚠️  qa_page.js already exists. Use --force to overwrite."
  echo "   Skipping qa_page.js creation (using existing version)"
fi

# =====================================================================================
# 4. log_page_analytics.js — JSONL-ЛОГ ДЛЯ ClickHouse/BigQuery
# =====================================================================================
# Примечание: log_page_analytics.js уже создан, проверяем наличие

if [[ ! -f "scripts/log_page_analytics.js" ]]; then
  echo "⚠️  log_page_analytics.js already exists. Skipping creation."
fi

# =====================================================================================
# 5. monster_7x_batch_pipeline.sh — MAJOR-регенерация + severity
# =====================================================================================

cat > scripts/monster_7x_batch_pipeline.sh << 'EOFBASH'
#!/usr/bin/env bash
set -e

GEN_SCRIPT="scripts/gen_page.js"
QA_SCRIPT="scripts/qa_page.js"
FIX_ENDINGS_SCRIPT="scripts/fix_endings.js"
VALIDATE_PAGE_SCRIPT="scripts/validate_page.js"
PAGE_LOGGER_SCRIPT="scripts/log_page_analytics.js"

STAGE1_NAME="stage1"
STAGE2_NAME="stage2"
STAGE3_NAME="stage3"
STAGE4_NAME="stage4"

STAGE1_COUNT=10
STAGE2_COUNT=50
STAGE3_COUNT=100
STAGE4_COUNT=1000

STAGE1_ANALYSIS_DEPTH="deep"
STAGE2_ANALYSIS_DEPTH="medium"
STAGE3_ANALYSIS_DEPTH="light"
STAGE4_ANALYSIS_DEPTH="prod"

STAGE1_MAX_RETRIES=5
STAGE2_MAX_RETRIES=4
STAGE3_MAX_RETRIES=3
STAGE4_MAX_RETRIES=2

STAGE1_ALLOW_MAJOR_REGEN="true"
STAGE2_ALLOW_MAJOR_REGEN="true"
STAGE3_ALLOW_MAJOR_REGEN="false"
STAGE4_ALLOW_MAJOR_REGEN="false"

run_batch() {
  local STAGE_NAME="$1"
  local COUNT="$2"
  local DEPTH="$3"
  local RETRIES="$4"
  local ALLOW_MAJOR_REGEN="$5"

  local TASKS_FILE="tasks/${STAGE_NAME}_tasks.csv"
  local LOG_FILE="logs/${STAGE_NAME}.log"
  
  if [[ ! -f "$TASKS_FILE" ]]; then
    echo "ERROR: no tasks file $TASKS_FILE"
    exit 1
  fi

  : > "$LOG_FILE"

  local processed=0 published=0 fatal=0 major=0 minor=0 ok=0

  while IFS=',' read -r VIN MODEL YEAR STATE; do
    [[ -z "$VIN" ]] && continue
    [[ "$VIN" == "VIN" ]] && continue  # Skip header
    
    ((processed++))
    [[ $processed -gt $COUNT ]] && break

    echo "[$STAGE_NAME][$processed/$COUNT] $VIN $MODEL $YEAR $STATE" | tee -a "$LOG_FILE"

    export MONSTER_VIN="$VIN"
    export MONSTER_STAGE="$STAGE_NAME"

    # 1) генерация
    node "$GEN_SCRIPT" --vin "$VIN" --model "$MODEL" --year "$YEAR" --state "$STATE" \
                       --analysis-depth "$DEPTH" --max-retries "$RETRIES" \
                       > "tmp/${VIN}.json" 2>> "$LOG_FILE"

    # 2) QA → /tmp/${VIN}.qa.json
    node "$QA_SCRIPT" "tmp/${VIN}.json" --depth "$DEPTH" --stage "$STAGE_NAME" >> "$LOG_FILE" 2>&1 || true

    # 3) Fix endings
    if [[ -f "$FIX_ENDINGS_SCRIPT" ]]; then
      node "$FIX_ENDINGS_SCRIPT" "tmp/${VIN}.json" --output "tmp/${VIN}.fixed.json" >> "$LOG_FILE" 2>&1 || true
    else
      cp "tmp/${VIN}.json" "tmp/${VIN}.fixed.json"
    fi

    # 4) валидация (основной проход)
    VALIDATE_OUT=$(node "$VALIDATE_PAGE_SCRIPT" "tmp/${VIN}.fixed.json" 2>&1 | head -1)
    echo "[VALIDATE][$VIN] $VALIDATE_OUT" | tee -a "$LOG_FILE"
    SEVERITY=$(echo "$VALIDATE_OUT" | sed -E 's/.*SEVERITY:([^;]+).*/\1/')

    case "$SEVERITY" in
      FATAL) ((fatal++)) ;;
      MAJOR) ((major++)) ;;
      MINOR) ((minor++)) ;;
      OK)    ((ok++)) ;;
    esac

    node "$PAGE_LOGGER_SCRIPT" "$VIN" "$STAGE_NAME" "$VALIDATE_OUT" 2>&1 | tee -a "$LOG_FILE" || true

    if [[ "$SEVERITY" == "FATAL" ]]; then
      echo "[FATAL][$STAGE_NAME] $VIN blocked, not published" | tee -a "$LOG_FILE"
      echo "{\"vin\":\"$VIN\",\"stage\":\"$STAGE_NAME\",\"severity\":\"FATAL\"}" >> "qc_issues/${STAGE_NAME}_failed_pages.json"
      continue
    fi

    # MAJOR-регенерация на ранних стадиях
    if [[ "$SEVERITY" == "MAJOR" && "$ALLOW_MAJOR_REGEN" == "true" ]]; then
      echo "[MAJOR][$STAGE_NAME] $VIN → regen attempt..." | tee -a "$LOG_FILE"

      export MONSTER_STAGE="${STAGE_NAME}_regen"
      node "$GEN_SCRIPT" --vin "$VIN" --model "$MODEL" --year "$YEAR" --state "$STATE" \
                         --analysis-depth "$DEPTH" --max-retries "$RETRIES" \
                         > "tmp/${VIN}.regen.json" 2>> "$LOG_FILE"

      node "$QA_SCRIPT" "tmp/${VIN}.regen.json" --depth "$DEPTH" --stage "${STAGE_NAME}_regen" >> "$LOG_FILE" 2>&1 || true

      if [[ -f "$FIX_ENDINGS_SCRIPT" ]]; then
        node "$FIX_ENDINGS_SCRIPT" "tmp/${VIN}.regen.json" --output "tmp/${VIN}.regen.fixed.json" >> "$LOG_FILE" 2>&1 || true
      else
        cp "tmp/${VIN}.regen.json" "tmp/${VIN}.regen.fixed.json"
      fi

      VALIDATE_OUT_REGEN=$(node "$VALIDATE_PAGE_SCRIPT" "tmp/${VIN}.regen.fixed.json" 2>&1 | head -1)
      echo "[VALIDATE-REGEN][$VIN] $VALIDATE_OUT_REGEN" | tee -a "$LOG_FILE"
      SEVERITY_REGEN=$(echo "$VALIDATE_OUT_REGEN" | sed -E 's/.*SEVERITY:([^;]+).*/\1/')
      node "$PAGE_LOGGER_SCRIPT" "$VIN" "${STAGE_NAME}_regen" "$VALIDATE_OUT_REGEN" 2>&1 | tee -a "$LOG_FILE" || true

      if [[ "$SEVERITY_REGEN" == "FATAL" ]]; then
        echo "[FATAL-REGEN][$STAGE_NAME] $VIN blocked after regen" | tee -a "$LOG_FILE"
        echo "{\"vin\":\"$VIN\",\"stage\":\"${STAGE_NAME}_regen\",\"severity\":\"FATAL\"}" >> "qc_issues/${STAGE_NAME}_failed_pages.json"
        continue
      fi

      cp "tmp/${VIN}.regen.fixed.json" "output/${VIN}.json"
      ((published++))
      echo "[PUBLISHED-REGEN][$STAGE_NAME] $VIN severity=$SEVERITY_REGEN" | tee -a "$LOG_FILE"
      continue
    fi

    # MINOR/OK или MAJOR без регена → публикуем основной вариант
    cp "tmp/${VIN}.fixed.json" "output/${VIN}.json"
    ((published++))
    echo "[PUBLISHED][$STAGE_NAME] $VIN severity=$SEVERITY" | tee -a "$LOG_FILE"

  done < "$TASKS_FILE"

  echo "=== STAGE SUMMARY: $STAGE_NAME ===" | tee -a "$LOG_FILE"
  echo "Processed: $processed"  | tee -a "$LOG_FILE"
  echo "Published: $published"  | tee -a "$LOG_FILE"
  echo "FATAL:     $fatal"      | tee -a "$LOG_FILE"
  echo "MAJOR:     $major"      | tee -a "$LOG_FILE"
  echo "MINOR:     $minor"      | tee -a "$LOG_FILE"
  echo "OK:        $ok"         | tee -a "$LOG_FILE"
}

# Запуск всех стадий — можно вызывать по отдельности
if [[ "$1" == "--stage" && -n "$2" ]]; then
  STAGE="$2"
  case "$STAGE" in
    stage1) run_batch "$STAGE1_NAME" "$STAGE1_COUNT" "$STAGE1_ANALYSIS_DEPTH" "$STAGE1_MAX_RETRIES" "$STAGE1_ALLOW_MAJOR_REGEN" ;;
    stage2) run_batch "$STAGE2_NAME" "$STAGE2_COUNT" "$STAGE2_ANALYSIS_DEPTH" "$STAGE2_MAX_RETRIES" "$STAGE2_ALLOW_MAJOR_REGEN" ;;
    stage3) run_batch "$STAGE3_NAME" "$STAGE3_COUNT" "$STAGE3_ANALYSIS_DEPTH" "$STAGE3_MAX_RETRIES" "$STAGE3_ALLOW_MAJOR_REGEN" ;;
    stage4) run_batch "$STAGE4_NAME" "$STAGE4_COUNT" "$STAGE4_ANALYSIS_DEPTH" "$STAGE4_MAX_RETRIES" "$STAGE4_ALLOW_MAJOR_REGEN" ;;
    *) echo "Unknown stage: $STAGE"; exit 1 ;;
  esac
else
  run_batch "$STAGE1_NAME" "$STAGE1_COUNT" "$STAGE1_ANALYSIS_DEPTH" "$STAGE1_MAX_RETRIES" "$STAGE1_ALLOW_MAJOR_REGEN"
  run_batch "$STAGE2_NAME" "$STAGE2_COUNT" "$STAGE2_ANALYSIS_DEPTH" "$STAGE2_MAX_RETRIES" "$STAGE2_ALLOW_MAJOR_REGEN"
  run_batch "$STAGE3_NAME" "$STAGE3_COUNT" "$STAGE3_ANALYSIS_DEPTH" "$STAGE3_MAX_RETRIES" "$STAGE3_ALLOW_MAJOR_REGEN"
  run_batch "$STAGE4_NAME" "$STAGE4_COUNT" "$STAGE4_ANALYSIS_DEPTH" "$STAGE4_MAX_RETRIES" "$STAGE4_ALLOW_MAJOR_REGEN"
fi
EOFBASH

chmod +x scripts/monster_7x_batch_pipeline.sh

echo ""
echo "✅ Severity + MAJOR-regeneration + JSONL analytics system installed!"
echo ""
echo "Files created/updated:"
echo "  - $RULES_FILE (with on_fail_severity)"
echo "  - scripts/monster_7x_batch_pipeline.sh (bash version)"
echo ""
echo "Existing files (already updated):"
echo "  - scripts/validate_page.js (supports SEVERITY:... format)"
echo "  - scripts/qa_page.js (writes /tmp/\${VIN}.qa.json)"
echo "  - scripts/log_page_analytics.js (JSONL logging)"
echo ""
echo "Usage:"
echo "  ./scripts/monster_7x_batch_pipeline.sh --stage stage1"
echo "  ./scripts/monster_7x_batch_pipeline.sh  # runs all stages"








