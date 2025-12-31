#!/usr/bin/env bash

# ==========================================================
# MONSTER 8.0 — СТРАТЕГИЯ ФАЗ РАЗВЁРТЫВАНИЯ СТРАНИЦ
# БЕЗ VIN-LANDING, ЦЕЛЬ ≈ 0.8–1.0M СТРАНИЦ
# ==========================================================
# Файл: monster8_phase_strategy.sh
#
# Задача:
#   1) Определять текущую фазу по количеству уже созданных страниц.
#   2) Выбирать нужную очередь топиков (EN/ES + зона).
#   3) Вызывать батч-генератор (build_topics_batch_parallel.js) с нужным режимом.
#   4) Держать простую, но расширяемую стратегию до ~0.8–1M страниц.
#
# ЛОГИКА ФАЗ (без VIN-landing):
#   PHASE 1 — DMV CORE (EN only)         : до ~5k страниц
#   PHASE 2 — DMV FULL (EN+ES)           : ~5k–20k
#   PHASE 3 — BRAND/MODEL (EN+ES)        : ~20k–200k
#   PHASE 4 — FRAUD/DAMAGE (EN+ES, 10%)  : ~200k–400k
#   PHASE 5 — FRAUD FULL (EN+ES, 100%)   : ~400k–800k+
#
# Счётчик страниц — реальный: index.html в public/semantic-pages/**/index.html
#
# ВАЖНО:
#   • Очереди должны лежать в data/:
#       data/topics_queue.dmv.en.json
#       data/topics_queue.dmv.es.json
#       data/topics_queue.brand_model.en.json
#       data/topics_queue.brand_model.es.json
#       data/topics_queue.fraud.en.json
#       data/topics_queue.fraud_full.en.json
#       (и т.д. — Cursor должен их собрать по этому контракту)
#   • Скрипт просто подсовывает нужный *.json → topics_queue.json
#   • Генерация делает node scripts/build_topics_batch_parallel.js --mode=prod
#
# ==========================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# -------------------------------
# 1. ХЕЛПЕРЫ
# -------------------------------

log() {
  printf "[PHASE-STRATEGY] %s\n" "$*" >&2
}

# Подсчёт уже созданных страниц
count_pages() {
  # считаем только семантические SEO-страницы
  find "$ROOT_DIR/public/semantic-pages" -type f -name "index.html" 2>/dev/null | wc -l | tr -d ' '
}

# Подмена очереди
use_queue() {
  local SRC="$1"
  local DEST="$ROOT_DIR/data/topics_queue.json"
  if [[ ! -f "$SRC" ]]; then
    log "ОШИБКА: очередь не найдена: $SRC"
    exit 1
  fi
  cp "$SRC" "$DEST"
  log "Используем очередь: $(basename "$SRC") → topics_queue.json"
}

# Запуск батча
run_batch() {
  local MODE="${1:-prod}"
  log "Запуск батча: MODE=$MODE"
  node "$ROOT_DIR/scripts/build_topics_batch_parallel.js" --mode "$MODE"
}

# -------------------------------
# 2. ОПРЕДЕЛЕНИЕ ФАЗЫ
# -------------------------------

PAGES_TOTAL="$(count_pages)"
log "Найдено страниц: $PAGES_TOTAL"

PHASE=""

# Порог можно потом вынести в config/monster8_env.json
if   (( PAGES_TOTAL < 5000 )); then
  PHASE="PHASE1_DMV_CORE"
elif (( PAGES_TOTAL < 20000 )); then
  PHASE="PHASE2_DMV_FULL"
elif (( PAGES_TOTAL < 200000 )); then
  PHASE="PHASE3_BRAND_MODEL"
elif (( PAGES_TOTAL < 400000 )); then
  PHASE="PHASE4_FRAUD_PARTIAL"
else
  PHASE="PHASE5_FRAUD_FULL"
fi

log "Текущая фаза: $PHASE"

# -------------------------------
# 3. СТРАТЕГИЯ ПО ФАЗАМ
# -------------------------------

# ИДЕЯ:
#   • В каждой фазе — своя комбинация очередей и языков.
#   • EN всегда приоритетен, ES догоняет.
#   • Fraud/Damage сначала только «горячие» комбинации (10%),
#     потом полное развёртывание.
#   • Cursor обязан поддерживать этот контракт:
#       – собирать и обновлять соответствующие *.json очереди;
#       – каждую партию делать небольшой (10–50 топиков), чтобы не убивать API.

case "$PHASE" in
  PHASE1_DMV_CORE)
    # -----------------------------------------
    # ФАЗА 1 — DMV CORE (EN only, основные штаты)
    # Цель: быстро дать ядро EN-страниц (~0–5k)
    # Очередь: только dmv/en (title_types, transfer, registration, salvage_to_rebuilt)
    # Форматы: guide + checklist
    # Языки: EN
    # -----------------------------------------
    use_queue "$ROOT_DIR/data/topics_queue.dmv.en.json"
    run_batch "prod"
    ;;

  PHASE2_DMV_FULL)
    # -----------------------------------------
    # ФАЗА 2 — DMV FULL (EN + ES)
    # Цель: добить DMV до полного покрытия 50 штатов (12 тем × форматы)
    # Стратегия:
    #   1) Прогнать EN-очередь (остатки штатов/тем).
    #   2) Прогнать ES-очередь (mx_us аудитория).
    # Можно крутить скрипт два раза подряд.
    # -----------------------------------------
    # 2.1 EN догонка
    log "Фаза 2: EN догонка DMV"
    use_queue "$ROOT_DIR/data/topics_queue.dmv.en.json"
    run_batch "prod"

    # 2.2 ES догонка
    log "Фаза 2: ES догонка DMV"
    use_queue "$ROOT_DIR/data/topics_queue.dmv.es.json"
    run_batch "prod"
    ;;

  PHASE3_BRAND_MODEL)
    # -----------------------------------------
    # ФАЗА 3 — BRAND/MODEL
    # Цель: построить большую массу брендовых страниц (до ~200k).
    # Стратегия:
    #   • Параллельно с остатками DMV.
    #   • Основной объём — brand_model EN + ES по топ-брендам.
    # -----------------------------------------
    # 3.1 Остатки DMV (если очередь ещё не пустая)
    if [[ -s "$ROOT_DIR/data/topics_queue.dmv.en.json" ]] || [[ -s "$ROOT_DIR/data/topics_queue.dmv.es.json" ]]; then
      log "Фаза 3: остаточная DMV-генерация (EN)"
      use_queue "$ROOT_DIR/data/topics_queue.dmv.en.json"
      run_batch "prod"

      log "Фаза 3: остаточная DMV-генерация (ES)"
      use_queue "$ROOT_DIR/data/topics_queue.dmv.es.json"
      run_batch "prod"
    fi

    # 3.2 Brand/Model EN
    log "Фаза 3: Brand/Model EN"
    use_queue "$ROOT_DIR/data/topics_queue.brand_model.en.json"
    run_batch "prod"

    # 3.3 Brand/Model ES
    log "Фаза 3: Brand/Model ES"
    use_queue "$ROOT_DIR/data/topics_queue.brand_model.es.json"
    run_batch "prod"
    ;;

  PHASE4_FRAUD_PARTIAL)
    # -----------------------------------------
    # ФАЗА 4 — FRAUD/DAMAGE (частичное покрытие, 10%)
    # Цель: дать мощный кластер про повреждения/мошенничество
    #       без полного раздувания до 650k страниц.
    # Стратегия:
    #   • Работать по очереди fraud.en/es с уже отфильтрованными
    #     «горячими» комбинациями (штаты, бренды, типы damage).
    #   • EN в приоритете, ES — по мере сил.
    # -----------------------------------------
    log "Фаза 4: Fraud/Damage EN (горячие комбинации)"
    use_queue "$ROOT_DIR/data/topics_queue.fraud.en.json"
    run_batch "prod"

    log "Фаза 4: Fraud/Damage ES (горячие комбинации)"
    use_queue "$ROOT_DIR/data/topics_queue.fraud.es.json"
    run_batch "prod"
    ;;

  PHASE5_FRAUD_FULL)
    # -----------------------------------------
    # ФАЗА 5 — FRAUD FULL (полное развёртывание)
    # Цель: дотянуться до ~0.8–1M страниц.
    # Стратегия:
    #   • Использовать очереди fraud_full.* с расширенной комбинаторикой
    #     (бренды × типы damage × штаты × кузов × аукционы).
    #   • MONSTER может добавлять сюда только те комбинации, которые
    #     действительно нужны — не обязательно взрывать всё пространство.
    # -----------------------------------------
    log "Фаза 5: Fraud/Damage FULL EN"
    use_queue "$ROOT_DIR/data/topics_queue.fraud_full.en.json"
    run_batch "prod"

    log "Фаза 5: Fraud/Damage FULL ES"
    use_queue "$ROOT_DIR/data/topics_queue.fraud_full.es.json"
    run_batch "prod"
    ;;

  *)
    log "Неизвестная фаза: $PHASE"
    exit 1
    ;;
esac

log "Фаза $PHASE отработала. Текущая стратегия фаз страниц выполнена."










