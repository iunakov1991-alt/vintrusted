# 🚀 БЫСТРЫЙ СТАРТ: Выборочный анализ качества для самообучения

**Дата:** 2025-12-06  
**Статус:** ✅ **ГОТОВО К ИСПОЛЬЗОВАНИЮ**

---

## ✅ ЧТО РЕАЛИЗОВАНО

После генерации каждой партии страниц система автоматически:

1. ✅ **Сканирует** недавно созданные страницы (в пределах 1 часа)
2. ✅ **Выбирает** выборочно страницы по разным направлениям:
   - Разные языки (EN/ES)
   - Разные штаты (AZ, CA, TX, FL, NY и т.д.)
   - Разные типы тем (dmv-titles, vin-check и т.д.)
   - Разные уровни глубины URL
3. ✅ **Анализирует** качество выбранных страниц
4. ✅ **Сохраняет** результаты для самообучения
5. ✅ **Применяет** результаты к улучшению следующих генераций

---

## 🎯 КАК РАБОТАЕТ

### Автоматически:

После успешной генерации батча система автоматически запускает анализ:

```
[Генерация батча] → [Успешно: 30 страниц] → [Анализ качества] → [Самообучение] → [Деплой]
```

### Количество страниц для анализа:

- **Минимум:** 3 страницы в батче для запуска анализа
- **Целевое:** 20% от успешных страниц
  - Минимум: 5 страниц
  - Максимум: 10 страниц

**Примеры:**
- 10 страниц → 5 страниц (минимум)
- 30 страниц → 6 страниц (20%)
- 100 страниц → 10 страниц (максимум)

---

## ⚙️ КОНФИГУРАЦИЯ

### Включить/выключить анализ:

```bash
# Включить (по умолчанию)
export ENABLE_QUALITY_ANALYSIS=1

# Выключить
export ENABLE_QUALITY_ANALYSIS=0
```

### Настройка параметров:

В `scripts/batch_quality_analysis.js`:

```javascript
const analysisOptions = {
  maxAge: 3600000,        // Максимальный возраст страниц (1 час)
  targetCount: 10,        // Целевое количество страниц
  minPagesForAnalysis: 3 // Минимум страниц для запуска
};
```

---

## 📊 РЕЗУЛЬТАТЫ

### Где сохраняются:

1. **Детальный анализ каждой страницы:**
   - `data/seo/quality-analysis/quality-*.json`
   - `data/seo/quality_logs/quality_analysis.jsonl`

2. **Анализ батча:**
   - `data/seo/quality-analysis/batch-analysis.jsonl`

### Использование для самообучения:

Результаты автоматически используются системой RL:
- `scripts/rl_ingest_metrics.js` - читает метрики
- `scripts/rl_update_strategy.js` - обновляет стратегию
- Следующие генерации улучшаются

---

## 🔍 ПРИМЕР ВЫВОДА

```
[QUALITY-ANALYSIS] ========================================
[QUALITY-ANALYSIS] Starting batch quality analysis...
[QUALITY-ANALYSIS] Scanning for recently generated pages (max age: 3600s)...
[QUALITY-ANALYSIS] Found 25 recently generated pages
[QUALITY-ANALYSIS] Selected 10 pages for analysis:
  1. /en/dmv-titles/az/title-types/checklist/ (en, AZ, dmv-titles)
  2. /es/dmv-titles/ca/title-types/checklist/ (es, CA, dmv-titles)
  3. /en/dmv-titles/tx/title-types/checklist/ (en, TX, dmv-titles)
  ...

[QUALITY-ANALYSIS] [1/10] Analyzing: /en/dmv-titles/az/title-types/checklist/
[QUALITY-ANALYSIS] ✅ Score: 95.5%

[QUALITY-ANALYSIS] ========================================
[QUALITY-ANALYSIS] Analysis completed in 45.2s
[QUALITY-ANALYSIS] Analyzed: 10/10 pages
[QUALITY-ANALYSIS] Average score: 92.5%
[QUALITY-ANALYSIS] ========================================
```

---

## ✅ ПРЕИМУЩЕСТВА

1. ✅ **Автоматизация** - не требует ручного вмешательства
2. ✅ **Выборочность** - анализирует достаточное количество, но не все
3. ✅ **Разнообразие** - выборка по разным направлениям
4. ✅ **Эффективность** - анализ до деплоя, локально
5. ✅ **Самообучение** - результаты применяются автоматически

---

## 🎯 ИСПОЛЬЗОВАНИЕ

### Автоматически:

Просто запускайте генерацию батча как обычно:

```bash
node scripts/build_topics_batch_parallel.js --queue data/topics_queue.json
```

Анализ запустится автоматически после успешной генерации.

### Вручную (для тестирования):

```bash
# Анализ недавно созданных страниц
node scripts/batch_quality_analysis.js

# С настройками
node scripts/batch_quality_analysis.js --max-age 7200 --target-count 15
```

---

## 📝 ФАЙЛЫ

- `scripts/batch_quality_analysis.js` - Основной модуль анализа
- `scripts/analyze_page_quality_for_learning.js` - Анализ отдельной страницы
- `scripts/build_topics_batch_parallel.js` - Интеграция в процесс батча
- `docs/BATCH_QUALITY_ANALYSIS_IMPLEMENTATION.md` - Полная документация

---

## ✅ ГОТОВО!

Система автоматически анализирует качество страниц после каждой партии и применяет результаты для самообучения! 🎯

