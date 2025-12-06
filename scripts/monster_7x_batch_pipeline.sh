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

    # 1) генерация (извлекаем JSON из stdout, логи в stderr)
    GEN_OUTPUT=$(node "$GEN_SCRIPT" --vin "$VIN" --model "$MODEL" --year "$YEAR" --state "$STATE" \
                       --analysis-depth "$DEPTH" --max-retries "$RETRIES" 2>> "$LOG_FILE" || echo "")
    
    # Извлекаем последний валидный JSON из вывода используя node
    if [[ -n "$GEN_OUTPUT" ]]; then
      echo "$GEN_OUTPUT" | node -e "
        const input = require('fs').readFileSync(0, 'utf8');
        const trimmed = input.trim();
        let jsonStart = trimmed.lastIndexOf('{');
        if (jsonStart >= 0) {
          for (let start = jsonStart; start >= 0; start--) {
            if (trimmed[start] === '{') {
              try {
                const candidate = trimmed.substring(start);
                JSON.parse(candidate);
                process.stdout.write(candidate);
                process.exit(0);
              } catch (e) {
                continue;
              }
            }
          }
        }
        process.stdout.write('{}');
      " > "tmp/${VIN}.json" 2>/dev/null
    else
      echo "{}" > "tmp/${VIN}.json"
    fi

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
      REGEN_OUTPUT=$(node "$GEN_SCRIPT" --vin "$VIN" --model "$MODEL" --year "$YEAR" --state "$STATE" \
                         --analysis-depth "$DEPTH" --max-retries "$RETRIES" 2>> "$LOG_FILE" || echo "")
      
      # Извлекаем последний валидный JSON из вывода
      if [[ -n "$REGEN_OUTPUT" ]]; then
        echo "$REGEN_OUTPUT" | node -e "
          const fs = require('fs');
          const input = fs.readFileSync(0, 'utf8');
          const lines = input.split('\\n');
          let jsonStart = -1;
          for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].trim().startsWith('{')) {
              jsonStart = i;
              break;
            }
          }
          if (jsonStart >= 0) {
            const jsonLines = lines.slice(jsonStart);
            let jsonStr = jsonLines.join('\\n');
            for (let start = 0; start < jsonStr.length; start++) {
              if (jsonStr[start] === '{') {
                try {
                  const candidate = jsonStr.substring(start);
                  JSON.parse(candidate);
                  process.stdout.write(candidate);
                  process.exit(0);
                } catch (e) {
                  continue;
                }
              }
            }
          }
        " > "tmp/${VIN}.regen.json" 2>/dev/null || echo "{}" > "tmp/${VIN}.regen.json"
      else
        echo "{}" > "tmp/${VIN}.regen.json"
      fi

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
