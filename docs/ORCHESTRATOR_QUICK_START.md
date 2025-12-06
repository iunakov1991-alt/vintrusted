# 🚀 ORCHESTRATOR — БЫСТРЫЙ СТАРТ

## Запуск

```bash
./monster8_orchestrator.sh
```

## Что делает

1. **Проверяет количество страниц** (EN/ES)
2. **Определяет фазу:**
   - `en_only` (EN < 100) → генерирует EN
   - `mixed` (EN >= 100, ES < 50) → генерирует EN
   - `es_focus` (EN >= 100, ES >= 50) → генерирует ES

3. **Проверяет latency** API (DeepSeek, Ollama)
4. **Адаптирует воркеры** (меньше при медленном API)
5. **Запускает генерацию** параллельно

## Настройки

```bash
# Порог для ES
export EN_THRESHOLD_FOR_ES=100

# Воркеры
export DEFAULT_DAY_WORKERS=10
export DEFAULT_NIGHT_WORKERS=6

# Latency защита
export MONSTER8_LATENCY_HARD_MAX=4.0
```

## Автоматизация

```bash
# Каждые 6 часов
0 */6 * * * cd /path/to/website && ./monster8_orchestrator.sh >> logs/orchestrator.log 2>&1
```

## Логи

Все логи сохраняются в: `logs/orchestrator.log`
