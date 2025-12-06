#!/usr/bin/env bash

# ==========================================================
# MONSTER 8.0 — EN→ES SEO-РАСКАТКА ПО СТРАТЕГИИ
# ----------------------------------------------------------
# ЦЕЛЬ:
#   1) Сначала нарастить EN-кластер до нужного объёма.
#   2) Только после порога включать генерацию ES-ветки.
#   3) Использовать ФАКТИЧЕСКОЕ число страниц (HTML) как счётчик.
#
# ПРИНЦИП РАБОТЫ:
#   - Считает количество index.html в EN и ES.
#   - Сравнивает EN с порогом EN_THRESHOLD_FOR_ES.
#   - В зависимости от фазы:
#       PHASE=en_only  → в data/topics_queue.json копируется EN-очередь.
#       PHASE=es_phase → копируется ES-очередь (или смешанная логика, если решишь).
#   - Запускает batch-генерацию:
#       node scripts/build_topics_batch.js --mode prod
#
# ПОДГОТОВКА (ОДИН РАЗ):
#   1) Сохрани этот файл как monster8_en_es_rollout.sh в корень repo.
#   2) Сделай исполняемым:
#        chmod +x monster8_en_es_rollout.sh
#   3) Разведи очереди:
#        data/topics_queue.en.json   # EN-темы
#        data/topics_queue.es.json   # ES-темы
#      Текущий data/topics_queue.json можно использовать как шаблон.
#
# ЗАПУСК:
#   ./monster8_en_es_rollout.sh
#
# ПЕРЕМЕННЫЕ, КОТОРЫЕ МОЖНО ТЮНИТЬ:
#   EN_THRESHOLD_FOR_ES — минимальное количество EN-страниц,
#                         после которого разрешаем ES.
# ==========================================================

set -euo pipefail

# --- НАСТРОЙКИ СТРАТЕГИИ -----------------------------------
# Порог EN-страниц, после которого можно включать ES.
# Можно смело регулировать:
#   50-100 → для старта (рекомендуется);
#   500-1000 → для среднего масштаба;
#   5000+ → консервативно, EN хорошо закреплён.
EN_THRESHOLD_FOR_ES=${EN_THRESHOLD_FOR_ES:-100}

# Корень проекта (если скрипт лежит в корне, этого достаточно)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Пути к очередям
QUEUE_EN="${PROJECT_ROOT}/data/topics_queue.en.json"
QUEUE_ES="${PROJECT_ROOT}/data/topics_queue.es.json"
QUEUE_ACTIVE="${PROJECT_ROOT}/data/topics_queue.json"

# Папки с HTML-страницами
EN_PAGES_DIR="${PROJECT_ROOT}/public/semantic-pages/en"
ES_PAGES_DIR="${PROJECT_ROOT}/public/semantic-pages/es"

# --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ------------------------------

count_pages() {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    # Нет папки — считаем, что 0 страниц.
    echo 0
    return 0
  fi
  # Считаем index.html во всех поддиректориях.
  find "$dir" -type f -name "index.html" 2>/dev/null | wc -l | tr -d ' '
}

log() {
  # Простой логер с префиксом.
  echo "[EN_ES_ROLLOUT] $*"
}

# --- ОПРЕДЕЛЕНИЕ ФАЗЫ -------------------------------------

log "Проект: ${PROJECT_ROOT}"

EN_COUNT=$(count_pages "$EN_PAGES_DIR")
ES_COUNT=$(count_pages "$ES_PAGES_DIR")

log "Текущее количество страниц:"
log "  EN: ${EN_COUNT}"
log "  ES: ${ES_COUNT}"
log "Порог EN для включения ES: ${EN_THRESHOLD_FOR_ES}"

PHASE="en_only"
if (( EN_COUNT >= EN_THRESHOLD_FOR_ES )); then
  PHASE="es_phase"
fi

log "Определённая фаза стратегии: ${PHASE}"

# --- ВЫБОР ОЧЕРЕДИ ТЕМ ------------------------------------

case "$PHASE" in
  en_only)
    # Пока EN не достиг порога — работаем ТОЛЬКО по английской очереди.
    if [[ ! -f "$QUEUE_EN" ]]; then
      echo "[EN_ES_ROLLOUT] ОШИБКА: не найден ${QUEUE_EN}" >&2
      exit 1
    fi
    log "Копирую EN-очередь → активная очередь:"
    log "  ${QUEUE_EN} → ${QUEUE_ACTIVE}"
    cp "$QUEUE_EN" "$QUEUE_ACTIVE"
    ;;

  es_phase)
    # Здесь можно сделать две стратегии:
    #   А) Только ES (как написано ниже).
    #   Б) Смешанную: заранее собрать combined-очередь, если захочешь.
    if [[ ! -f "$QUEUE_ES" ]]; then
      echo "[EN_ES_ROLLOUT] ОШИБКА: не найден ${QUEUE_ES}" >&2
      exit 1
    fi
    log "EN достиг порога. Включаем ES-очередь."
    log "Копирую ES-очередь → активная очередь:"
    log "  ${QUEUE_ES} → ${QUEUE_ACTIVE}"
    cp "$QUEUE_ES" "$QUEUE_ACTIVE"
    ;;

  *)
    echo "[EN_ES_ROLLOUT] ОШИБКА: неизвестная фаза: ${PHASE}" >&2
    exit 1
    ;;
esac

# --- ЗАПУСК ГЕНЕРАЦИИ ЧЕРЕЗ BATCH -------------------------
# Предполагается, что:
#   - monster8_env_run_all.sh уже настроен и тестировался,
#   - окружение (DEEPSEEK_API_KEY, USE_LOCAL_AI и т.д.) либо
#     задано в shell, либо ты запускаешь через него.
#
# Здесь — прямой запуск batch-строителя по активной очереди.
# При желании можно обернуть этот вызов через monster8_env_run_all.sh.

log "Запускаю batch-генерацию по активной очереди:"
log "  node scripts/build_topics_batch_parallel.js --queue data/topics_queue.json --workers 10"

cd "$PROJECT_ROOT"
# Используем параллельный батч для ускорения
node scripts/build_topics_batch_parallel.js --queue data/topics_queue.json --workers 10

log "Batch-генерация завершена."

# --- ПОСЛЕ ЗАПУСКА: КОНТРОЛЬ --------------------------------
# Можно пересчитать страницы и вывести обновлённую статистику.

NEW_EN_COUNT=$(count_pages "$EN_PAGES_DIR")
NEW_ES_COUNT=$(count_pages "$ES_PAGES_DIR")

log "Обновлённое количество страниц после генерации:"
log "  EN: ${NEW_EN_COUNT}"
log "  ES: ${NEW_ES_COUNT}"

# При желании тут же можно логировать в отдельный файл
# (например, data/monster8_rollout_log.txt) — оставлено на твой вкус.

exit 0

