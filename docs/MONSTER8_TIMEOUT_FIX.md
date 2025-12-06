# MONSTER 8.0 — Timeout Fix

## Проблема
Скрипты `gen_article_blocks.js` и `qa_llm_blocks.js` не имели таймаутов для HTTP-запросов к DeepSeek и Ollama API. При зависании или долгом ответе API скрипты могли ждать бесконечно.

## Исправления

### 1. Добавлены таймауты в `httpPostJson`
- По умолчанию: 120 секунд для DeepSeek, 90 секунд для Ollama
- Настраиваются через переменные окружения:
  - `DEEPSEEK_TIMEOUT_MS` (по умолчанию 120000)
  - `LOCAL_AI_TIMEOUT_MS` (по умолчанию 90000)
  - `DEEPSEEK_QA_TIMEOUT_MS` (по умолчанию 120000)
  - `LOCAL_AI_QA_TIMEOUT_MS` (по умолчанию 90000)

### 2. Добавлены прогресс-логи
Теперь видно, на каком этапе находится выполнение:
- `[LLM] DeepSeek: calling API...`
- `[LLM] Ollama: calling API...`
- `[LLM] prod mode: trying DeepSeek first...`
- `[LLM] ensemble mode: calling DeepSeek and Ollama in parallel...`

### 3. Обновлён конфиг
В `config/monster8_env.json` добавлены значения таймаутов по умолчанию.

## Результат
- Скрипты больше не зависают бесконечно
- При таймауте выводится понятная ошибка
- Видно прогресс выполнения через логи

