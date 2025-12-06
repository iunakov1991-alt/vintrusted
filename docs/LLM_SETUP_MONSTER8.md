# MONSTER 8.0 — LLM SETUP

## Вариант A: удалённый LLM (DeepSeek / аналогичный сервис)

1. Зарегистрируйтесь у выбранного провайдера и получите API-ключ.
2. В терминале, перед запуском пайплайна, выполните:
   ```bash
   export DEEPSEEK_API_KEY="ВАШ_КЛЮЧ"
   export DEEPSEEK_MODEL="deepseek-chat"    # при необходимости
   ```
3. Пайплайн уже настроен на `https://api.deepseek.com/v1/chat/completions`.
   При необходимости задайте:
   ```bash
   export DEEPSEEK_BASE_URL="https://api.deepseek.com"  # если нужен кастомный endpoint
   export DEEPSEEK_TEMPERATURE=0.3                      # тонкая настройка
   export DEEPSEEK_MAX_TOKENS=4000                      # при необходимости ограничить токены
   ```
   Скрипт автоматически парсит ответ и делит текст на блоки по `spec.delim`.

## Вариант B: локальный LLM (Ollama)

1. Установите Ollama, скачайте модель (`ollama pull phi3:mini`).
2. Перед запуском:
   ```bash
   export USE_LOCAL_AI=1
   export LOCAL_AI_MODEL="phi3:mini"
   # при необходимости:
   export LOCAL_AI_BASE_URL="http://localhost:11434"
   export LOCAL_AI_TEMPERATURE=0.4
   ```
3. Скрипт уже делает POST-запрос на `<BASE_URL>/api/chat` и обрабатывает ответ Ollama.

## Вариант C: без LLM (STUB-режим)

Если переменные не заданы, генератор создаёт техничные stub-тексты для каждого блока,
чтобы пайплайн оставался рабочим. `scripts/debug_run_topic.sh` в этом случае пропускает
`validate_page.js`, чтобы не получать FATAL-ы за пустые блоки.
