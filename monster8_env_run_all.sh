#!/usr/bin/env bash
# =====================================================================
# MONSTER 8.0 — ПОЛНЫЙ ПРОГОН ПАЙПЛАЙНА С НАСТРОЙКОЙ LLM (DEEPSEEK + OLLAMA)
# Сценарий:
#   1) Переходим в корень проекта (где лежат scripts/, config/, data/).
#   2) Настраиваем переменные окружения для DeepSeek (prod).
#   3) Настраиваем Ollama как fallback (local).
#   4) Включаем режимы LLM_GEN_MODE и LLM_QA_MODE.
#   5) Создаём служебные директории (tmp/, logs/).
#   6) Прогоняем RL-инжест метрик и обновление стратегии.
#   7) Запускаем debug-пайплайн для тестового топика.
#   8) (Опционально) дампим граф топика.
#
# КАК ЗАПУСТИТЬ:
#   1) Убедись, что файл лежит в корне репозитория.
#   2) Сделай его исполняемым (однократно): chmod +x monster8_env_run_all.sh
#   3) Запускай:
#        ./monster8_env_run_all.sh            # режим ensemble (DeepSeek + Ollama fallback)
#        ./monster8_env_run_all.sh prod       # только DeepSeek
#        ./monster8_env_run_all.sh local      # только Ollama
#
# Проверка провайдеров перед запуском:
#   - DeepSeek: наличие ключа в переменной DEEPSEEK_API_KEY.
#   - Ollama:   команда `ollama list` должна показывать модель из LOCAL_AI_MODEL.
#
# После выполнения смотри артефакты в tmp/:
#   • *.blocks.json   — итоговые блоки для рендера
#   • *.qa.llm.txt    — отчёт LLM-QA с замечаниями
#   • *.validate.out  — вывод валидатора
#   • *.graph.json    — семантический граф топика
#
# Важно: сюда ключ DeepSeek лучше ЗАМЕНИТЬ СВОИМ, не коммитить в git.
# =====================================================================

set -euo pipefail

echo "=== MONSTER 8.0: запуск скрипта окружения и пайплайна ==="

# ---------------------------------------------------------------------
# 0. Переход в корень проекта
#    Скрипт предполагается лежащим в корне репо рядом с package.json, scripts/, config/, data/.
#    Если ты положишь его в другое место — поправь cd ниже.
# ---------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "[PWD] Текущая директория: $(pwd)"

# ---------------------------------------------------------------------
# 1. Загрузка переменных окружения
# ---------------------------------------------------------------------
ENV_FILE="$SCRIPT_DIR/config/monster8_env.json"
if [[ -f "$ENV_FILE" ]]; then
  while IFS='=' read -r KEY VAL; do
    export "$KEY"="$VAL"
  done < <(node -e 'const fs=require("fs");const data=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));Object.entries(data).forEach(([k,v])=>console.log(`${k}=${v}`));' "$ENV_FILE")
else
  echo "[WARN] config/monster8_env.json not found — using inline defaults"
  export DEEPSEEK_API_KEY="sk-462c6074494f4c95903866761589ce32"
  export DEEPSEEK_MODEL="deepseek-chat"
  export DEEPSEEK_BASE_URL="https://api.deepseek.com/v1/chat/completions"
  export DEEPSEEK_TEMPERATURE="0.4"
  export DEEPSEEK_MAX_TOKENS="3600"
  export USE_LOCAL_AI=1
  export LOCAL_AI_MODEL="phi3:latest"
  export LOCAL_AI_URL="http://localhost:11434/api/chat"
  export LOCAL_AI_TEMPERATURE="0.5"
  export LOCAL_AI_MAX_TOKENS="1200"
  export LLM_GEN_MODE="ensemble"
  export LLM_QA_MODE="deepseek"
fi

echo "[LLM] DeepSeek настроен как основной провайдер"
echo "[LLM] Ollama включен как fallback (local)"

# ---------------------------------------------------------------------
# 3. Режимы генерации и QA
#
#   Параметр запуска ($1) управляет режимом генерации:
#     - prod      → DeepSeek без fallback
#     - local     → только Ollama
#     - ensemble  → DeepSeek с fallback на Ollama (по умолчанию)
#
#   LLM_QA_MODE:
#     - "deepseek"  → QA через DeepSeek
#     - "local"     → QA через Ollama
#     - "none"      → без LLM-QA
# ---------------------------------------------------------------------

REQUESTED_GEN_MODE="${1:-ensemble}"
case "$REQUESTED_GEN_MODE" in
  prod)
    export LLM_GEN_MODE="prod"
    ;;
  local)
    export LLM_GEN_MODE="local"
    ;;
  ensemble|*)
    export LLM_GEN_MODE="ensemble"
    REQUESTED_GEN_MODE="ensemble"
    ;;
esac

export LLM_QA_MODE="deepseek"    # QA через DeepSeek

echo "[MODE] LLM_GEN_MODE=${LLM_GEN_MODE}, LLM_QA_MODE=${LLM_QA_MODE}"

# ---------------------------------------------------------------------
# 4. Служебные директории
# ---------------------------------------------------------------------
mkdir -p tmp logs data/metrics

echo "[FS] tmp/, logs/, data/metrics/ готовы"

# ---------------------------------------------------------------------
# 5. RL-пайплайн (self-learning skeleton)
#    rl_ingest_metrics.js:
#       - читает data/metrics/*.json / *.jsonl
#       - собирает в data/rl_aggregates.json
#    rl_update_strategy.js:
#       - обновляет config/learned_strategy.json (weights + updated_at)
#    Если метрик нет — просто обновляет timestamp.
# ---------------------------------------------------------------------
if [[ -f scripts/rl_ingest_metrics.js ]]; then
  echo "[RL] Шаг 1/2 — ingest метрик..."
  node scripts/rl_ingest_metrics.js || echo "[RL] rl_ingest_metrics завершился с ошибкой (не критично)"
else
  echo "[RL] scripts/rl_ingest_metrics.js не найден — шаг пропущен"
fi

if [[ -f scripts/rl_update_strategy.js ]]; then
  echo "[RL] Шаг 2/2 — обновление стратегии..."
  node scripts/rl_update_strategy.js || echo "[RL] rl_update_strategy завершился с ошибкой (не критично)"
else
  echo "[RL] scripts/rl_update_strategy.js не найден — шаг пропущен"
fi

# ---------------------------------------------------------------------
# 6. Запуск debug-пайплайна для тестового топика
#    scripts/debug_run_topic.sh должен:
#       - вызвать gen_article_blocks.js (LLM генерация блоков)
#       - прогнать LLM-QA (qa_llm_blocks.js), если включён
#       - прогнать валидатор блоков (validate_blocks.js), если есть
#
#    Входной топик: data/topic.dmv_ca_title_types_checklist_es_mx_us.json
# ---------------------------------------------------------------------
TOPIC_FILE="data/topic.dmv_ca_title_types_checklist_es_mx_us.json"

if [[ ! -f "$TOPIC_FILE" ]]; then
  echo "[ERR] Топик $TOPIC_FILE не найден. Проверь, что monster8_full_setup.sh был выполнен."
  exit 1
fi

if [[ ! -x scripts/debug_run_topic.sh ]]; then
  if [[ -f scripts/debug_run_topic.sh ]]; then
    chmod +x scripts/debug_run_topic.sh
  else
    echo "[ERR] scripts/debug_run_topic.sh не найден. Нечего запускать."
    exit 1
  fi
fi

echo "=== MONSTER 8.0: запуск debug_run_topic.sh для ${TOPIC_FILE} ==="
scripts/debug_run_topic.sh "$TOPIC_FILE"

echo "[OK] debug_run_topic.sh завершился (ошибки валидатора возможны, смотри tmp/*.validate.*)"

# ---------------------------------------------------------------------
# 7. Опционально: дамп графа топика (для дебага семантического ядра)
#    Вывод: tmp/<basename>.graph.json
# ---------------------------------------------------------------------
if [[ -f scripts/topic_graph_dump.js ]]; then
  BASENAME="$(basename "$TOPIC_FILE" .json)"
  GRAPH_OUT="tmp/${BASENAME}.graph.json"
  echo "[GRAPH] Генерируем граф топика → ${GRAPH_OUT}"
  node scripts/topic_graph_dump.js --topic-file "$TOPIC_FILE" > "$GRAPH_OUT" \
    || echo "[GRAPH] topic_graph_dump завершился с ошибкой (не критично)"
else
  echo "[GRAPH] scripts/topic_graph_dump.js не найден — дамп графа пропущен"
fi

# ---------------------------------------------------------------------
# 8. Итоговое сообщение
# ---------------------------------------------------------------------
echo
echo "==================================================================="
echo " MONSTER 8.0 — пайплайн пройден."
echo " Проверь файлы:"
echo "   • tmp/*.blocks.json      — сгенерированные LLM-блоки статьи"
echo "   • tmp/*.qa.llm.txt       — отчёт LLM-QA (если включён)"
echo "   • tmp/*.validate.*       — вывод валидатора (если интегрирован)"
echo "   • tmp/*.graph.json       — граф топика (nodes/edges) для дебага"
echo
echo " Если DeepSeek-ответы нормальные и длина блоков в пределах 1400–2600,"
echo " то машина уже в боеспособном состоянии. Дальше — расширяешь топик-очередь"
echo " и подключаешь реальные метрики GA4/GSC/Stripe в data/metrics/."
echo "==================================================================="

