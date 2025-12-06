#!/usr/bin/env bash

# ==========================================================
# MONSTER 8.0 — ORCHESTRATOR
# ФАЗЫ EN/ES + РАСПИСАНИЕ + BPG + LATENCY + NIGHT/DAY
# ==========================================================

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# ----------------------------------------------------------
# 0. БАЗОВАЯ КОНФИГАЦИЯ
# ----------------------------------------------------------
EN_THRESHOLD_FOR_ES="${EN_THRESHOLD_FOR_ES:-100}"    # после скольких EN страниц в прод включаем ES-партию
ES_HARD_MIN="${ES_HARD_MIN:-50}"                     # минималка ES для ощущения «живого» ES-сегмента
ES_START_RATIO="${ES_START_RATIO:-30}"               # % ES в фоне, когда уже пора
NIGHT_START_HOUR="${NIGHT_START_HOUR:-22}"
NIGHT_END_HOUR="${NIGHT_END_HOUR:-6}"
MONSTER8_BPG="${MONSTER8_BPG:-0}"                    # BPG по умолчанию выключен (упрощенная версия работает)
MONSTER8_LATENCY_HARD_MAX="${MONSTER8_LATENCY_HARD_MAX:-4.0}"  # сек

DEFAULT_DAY_WORKERS="${DEFAULT_DAY_WORKERS:-10}"
DEFAULT_NIGHT_WORKERS="${DEFAULT_NIGHT_WORKERS:-6}"            # ночью по дефолту помягче
MIN_WORKERS="${MIN_WORKERS:-2}"

STATE_DIR="tmp"
mkdir -p "$STATE_DIR"
mkdir -p "logs"

BPG_STATE_FILE="$STATE_DIR/bpg_state.env"
BPG_DONE_FILE="$STATE_DIR/bpg.done"
ORCH_LOG_FILE="logs/orchestrator.log"

# ----------------------------------------------------------
# 1. УТИЛИТЫ
# ----------------------------------------------------------

log() {
  local msg="[ORCH] $(date '+%H:%M:%S') $*"
  echo "$msg"
  # Также пишем в лог-файл
  echo "$msg" >> "$ORCH_LOG_FILE" 2>/dev/null || true
}

# float-compare через awk
float_gt() {
  awk -v a="$1" -v b="$2" 'BEGIN { exit (a>b)?0:1 }'
}

float_ge() {
  awk -v a="$1" -v b="$2" 'BEGIN { exit (a>=b)?0:1 }'
}

# ----------------------------------------------------------
# 2. СЧЕТЧИК СТРАНИЦ В ПРОДЕ
# ----------------------------------------------------------

count_pages() {
  local lang="$1"
  local dir="public/semantic-pages/$lang"
  if [ ! -d "$dir" ]; then
    echo 0
    return
  fi
  find "$dir" -type f -name 'index.html' 2>/dev/null | wc -l | tr -d ' '
}

# ----------------------------------------------------------
# 3. ВРЕМЯ СУТОК → LENGTH MODE (SHORT/LONG)
# ----------------------------------------------------------

detect_length_mode() {
  local hour
  hour=$(date +%H)
  # Убираем ведущий ноль если есть
  hour=$((10#$hour))
  
  # Ночь: [NIGHT_START_HOUR..23] ∪ [0..NIGHT_END_HOUR)
  if [ "$hour" -ge "$NIGHT_START_HOUR" ] || [ "$hour" -lt "$NIGHT_END_HOUR" ]; then
    echo "long"
  else
    echo "short"
  fi
}

# ----------------------------------------------------------
# 4. LATENCY ПРОБА ДЛЯ DEEPSEEK / OLLAMA
# ----------------------------------------------------------

measure_latency() {
  local target="$1"  # deepseek|ollama
  local url=""
  
  case "$target" in
    deepseek)
      url="${DEEPSEEK_BASE_URL:-https://api.deepseek.com/v1/models}"
      ;;
    ollama)
      url="${LOCAL_AI_URL:-http://localhost:11434/api/tags}"
      ;;
    *)
      echo "999"
      return
      ;;
  esac

  # Быстрый HEAD/GET
  local t
  t=$(curl -m 5 -s -o /dev/null -w "%{time_total}" "$url" 2>/dev/null || echo "999")
  echo "$t"
}

decide_workers_by_latency() {
  local deepseek_lat="$1"
  local ollama_lat="$2"
  local length_mode="$3"

  local base_workers
  if [ "$length_mode" = "long" ]; then
    base_workers="$DEFAULT_NIGHT_WORKERS"
  else
    base_workers="$DEFAULT_DAY_WORKERS"
  fi

  # Если DeepSeek > 3 секунд — режем воркеры пополам
  if float_gt "$deepseek_lat" "3.0"; then
    base_workers=$(( base_workers / 2 ))
  fi

  # Если Ollama очень медленный — ещё режем, но нижняя граница MIN_WORKERS
  if float_gt "$ollama_lat" "3.0"; then
    base_workers=$(( base_workers - 2 ))
  fi

  if [ "$base_workers" -lt "$MIN_WORKERS" ]; then
    base_workers="$MIN_WORKERS"
  fi

  echo "$base_workers"
}

# ----------------------------------------------------------
# 5. ОПРЕДЕЛЕНИЕ ФАЗЫ ЯЗЫКОВ (EN-ONLY / MIX / ES-FOCUS)
# ----------------------------------------------------------

detect_language_phase() {
  local en_pages="$1"
  local es_pages="$2"

  # Фаза 1: чисто EN, пока EN < EN_THRESHOLD_FOR_ES
  if [ "$en_pages" -lt "$EN_THRESHOLD_FOR_ES" ]; then
    echo "en_only"
    return
  fi

  # Фаза 2: микс, пока ES < ES_HARD_MIN
  if [ "$es_pages" -lt "$ES_HARD_MIN" ]; then
    echo "mixed"
    return
  fi

  # Фаза 3: ES-фокус, EN догоняет только по новым темам
  echo "es_focus"
}

# ----------------------------------------------------------
# 6. ВЫБОР ОЧЕРЕДИ ДЛЯ ОСНОВНОГО БАТЧА
# ----------------------------------------------------------

prepare_main_queue() {
  local phase="$1"
  local length_mode="$2"

  case "$phase" in
    en_only)
      if [ ! -f "data/topics_queue.en.json" ]; then
        log "ERROR: data/topics_queue.en.json not found"
        exit 1
      fi
      cp data/topics_queue.en.json data/topics_queue.json
      echo "en"
      ;;
    mixed)
      # В смешанной фазе: основной батч EN, ES идёт фоном
      if [ ! -f "data/topics_queue.en.json" ]; then
        log "ERROR: data/topics_queue.en.json not found"
        exit 1
      fi
      cp data/topics_queue.en.json data/topics_queue.json
      echo "en"
      ;;
    es_focus)
      if [ ! -f "data/topics_queue.es.json" ]; then
        log "ERROR: data/topics_queue.es.json not found"
        exit 1
      fi
      cp data/topics_queue.es.json data/topics_queue.json
      echo "es"
      ;;
    *)
      if [ ! -f "data/topics_queue.en.json" ]; then
        log "ERROR: data/topics_queue.en.json not found"
        exit 1
      fi
      cp data/topics_queue.en.json data/topics_queue.json
      echo "en"
      ;;
  esac
}

# ----------------------------------------------------------
# 7. BPG — СОСТОЯНИЕ, ЯЗЫК И ОЧЕРЕДЬ (УПРОЩЕННАЯ ВЕРСИЯ)
# ----------------------------------------------------------

load_bpg_state() {
  if [ -f "$BPG_STATE_FILE" ]; then
    # shellcheck disable=SC1090
    source "$BPG_STATE_FILE"
  else
    BPG_LAST_LANG="en"
    BPG_LAST_PHASE="en_only"
  fi
}

save_bpg_state() {
  cat > "$BPG_STATE_FILE" <<EOF
BPG_LAST_LANG="$BPG_LAST_LANG"
BPG_LAST_PHASE="$BPG_LAST_PHASE"
EOF
}

select_bpg_lang() {
  local current_phase="$1"
  local en_pages="$2"
  local es_pages="$3"

  if [ "$current_phase" = "en_only" ]; then
    echo "en"
    return
  fi

  if [ "$current_phase" = "mixed" ]; then
    local target_es
    target_es=$(( en_pages * ES_START_RATIO / 100 ))
    if [ "$es_pages" -lt "$target_es" ]; then
      echo "es"
    else
      echo "en"
    fi
    return
  fi

  # es_focus: чередуем языки
  load_bpg_state
  if [ "${BPG_LAST_LANG:-es}" = "es" ]; then
    echo "en"
  else
    echo "es"
  fi
}

# ----------------------------------------------------------
# 8. BPG ЗАПУСК (УПРОЩЕННАЯ ВЕРСИЯ - ПОКА ОТКЛЮЧЕНА)
# ----------------------------------------------------------

run_background_prep() {
  local current_batch_number="$1"
  local current_phase="$2"
  local en_pages="$3"
  local es_pages="$4"

  if [ "$MONSTER8_BPG" != "1" ]; then
    log "BPG disabled (set MONSTER8_BPG=1 to enable)"
    return
  fi

  if [ "$current_batch_number" -lt 2 ]; then
    log "BPG skipped for first batch."
    return
  fi

  # Если предыдущий BPG ещё не завершился — не дублируем
  if pgrep -f "build_topics_batch.*background" >/dev/null 2>&1; then
    log "BPG already running — skip new launch."
    return
  fi

  # Проверяем наличие next очередей
  if [ ! -f "data/topics_queue_next.en.json" ] && [ ! -f "data/topics_queue_next.es.json" ]; then
    log "BPG: next queues not found, skipping (create data/topics_queue_next.{en,es}.json to enable)"
    return
  fi

  rm -f "$BPG_DONE_FILE"

  local bpg_lang
  bpg_lang="$(select_bpg_lang "$current_phase" "$en_pages" "$es_pages")"
  prepare_bpg_queue "$bpg_lang"

  BPG_LAST_LANG="$bpg_lang"
  BPG_LAST_PHASE="$current_phase"
  save_bpg_state

  log "BPG: starting background prep for lang=$bpg_lang, phase=$current_phase"

  # BPG: используем background режим с задержками и skip-render
  nohup node scripts/build_topics_batch.js \
    --queue="$STATE_DIR/bpg_queue.json" \
    --mode=background \
    --workers=1 \
    --delay-ms=240000 \
    --skip-render \
    --length-mode=long \
    --lang="$bpg_lang" \
    > "$STATE_DIR/bpg.log" 2>&1 && touch "$BPG_DONE_FILE" &

  log "BPG: launched (1 worker, 240s delay, skip-render). Log: $STATE_DIR/bpg.log"
}

is_bpg_ready() {
  if [ -f "$BPG_DONE_FILE" ]; then
    echo "1"
  else
    echo "0"
  fi
}

# ----------------------------------------------------------
# 9. ОСНОВНОЙ БАТЧ
# ----------------------------------------------------------

run_main_batch() {
  local phase="$1"
  local length_mode="$2"
  local workers="$3"
  local lang="$4"
  local bpg_ready="$5"

  log "Main batch: phase=$phase, lang=$lang, length_mode=$length_mode, workers=$workers"

  # Используем параллельный батч с поддержкой length_mode и lang
  log "Starting batch generation..."
  
  # Определяем режим: fast (если BPG готов) или prod
  local batch_mode="prod"
  if [ "$bpg_ready" = "1" ]; then
    log "Using FAST mode (precomputed blocks from BPG)"
    batch_mode="fast"
  fi
  
  # Автоматический деплой после генерации (по умолчанию включен)
  export AUTO_DEPLOY="${AUTO_DEPLOY:-1}"
  
  if ! node scripts/build_topics_batch_parallel.js \
    --queue=data/topics_queue.json \
    --mode="$batch_mode" \
    --workers="$workers" \
    --length-mode="$length_mode" \
    --lang="$lang"; then
    log "ERROR: Batch generation failed"
    return 1
  fi
  log "Batch generation completed successfully"
  
  # Автоматический деплой после успешной генерации
  if [ "${AUTO_DEPLOY:-1}" = "1" ]; then
    log "Starting automatic deployment of generated pages..."
    if bash scripts/auto_deploy_page.sh batch; then
      log "✅ Automatic deployment completed"
      log "📅 Next batch will be scheduled automatically by batch_scheduler"
    else
      log "⚠️  Deployment failed (non-critical, pages are still generated locally)"
    fi
  fi
}

# ----------------------------------------------------------
# 10. РАСПИСАНИЕ / ДНЯМИ
# ----------------------------------------------------------

detect_day_phase() {
  local en_pages="$1"
  local es_pages="$2"

  if [ "$en_pages" -lt 50 ]; then
    echo "1"
    return
  fi
  if [ "$en_pages" -lt 200 ]; then
    echo "2"
    return
  fi
  if [ "$es_pages" -lt "$ES_HARD_MIN" ]; then
    echo "3"
    return
  fi
  echo "4"
}

# ----------------------------------------------------------
# 11. ГЛАВНЫЙ ВХОД
# ----------------------------------------------------------

main() {
  log "Monster 8.0 orchestrator starting…"

  local en_pages es_pages
  en_pages="$(count_pages "en")"
  es_pages="$(count_pages "es")"

  log "Current pages: EN=$en_pages, ES=$es_pages"

  local length_mode
  length_mode="$(detect_length_mode)"
  log "Length mode by time: $length_mode"

  local deepseek_lat ollama_lat
  deepseek_lat="$(measure_latency deepseek)"
  ollama_lat="$(measure_latency ollama)"
  log "Latency: DeepSeek=${deepseek_lat}s, Ollama=${ollama_lat}s"

  # Если DeepSeek совсем мёртв — не даём стартануть тяжёлому батчу
  if float_ge "$deepseek_lat" "$MONSTER8_LATENCY_HARD_MAX"; then
    log "ERROR: DeepSeek latency too high (${deepseek_lat}s >= ${MONSTER8_LATENCY_HARD_MAX}s). Aborting batch."
    exit 1
  fi

  local workers
  workers="$(decide_workers_by_latency "$deepseek_lat" "$ollama_lat" "$length_mode")"
  log "Workers decided: $workers"

  local lang_phase
  lang_phase="$(detect_language_phase "$en_pages" "$es_pages")"
  log "Language phase: $lang_phase"

  local main_lang
  main_lang="$(prepare_main_queue "$lang_phase" "$length_mode")"
  log "Main batch language: $main_lang"

  local day_phase
  day_phase="$(detect_day_phase "$en_pages" "$es_pages")"
  log "Day-phase (by coverage): $day_phase"

  # Batch номер — грубо как (EN+ES)/N_PER_BATCH
  local total_pages="$(( en_pages + es_pages ))"
  local current_batch_number=$(( total_pages / 30 + 1 ))
  log "Approx batch number: $current_batch_number"

  # BPG запуск (пока отключен)
  run_background_prep "$current_batch_number" "$lang_phase" "$en_pages" "$es_pages"

  # Проверка готовности BPG
  local bpg_ready
  bpg_ready="$(is_bpg_ready)"
  if [ "$bpg_ready" = "1" ]; then
    log "BPG is ready: will use FAST mode in main batch."
  else
    log "BPG not ready: main batch will generate fresh content."
  fi

  # Главный батч
  run_main_batch "$lang_phase" "$length_mode" "$workers" "$main_lang" "$bpg_ready"

  log "Monster 8.0 orchestrator finished."
}

main "$@"

