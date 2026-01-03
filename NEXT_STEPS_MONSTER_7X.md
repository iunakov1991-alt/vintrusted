# 🚀 MONSTER 7.x — Следующие Шаги

**После выполнения bash-скрипта и создания всех компонентов:**

---

## 📋 Шаг 1: Подготовка Tasks Файлов

Создайте CSV файлы с задачами для каждой ступени:

```bash
# Генерация tasks для stage1 (10 страниц)
node scripts/generate_tasks.js --stage stage1

# Генерация tasks для stage2 (50 страниц)
node scripts/generate_tasks.js --stage stage2

# Генерация tasks для stage3 (100 страниц)
node scripts/generate_tasks.js --stage stage3

# Генерация tasks для stage4 (1000 страниц)
node scripts/generate_tasks.js --stage stage4
```

**Или вручную создайте файлы:**

```bash
mkdir -p tasks

# tasks/stage1_tasks.csv
cat > tasks/stage1_tasks.csv << EOF
VIN,MODEL,YEAR,STATE
19UUB2F50KA123456,Honda Accord,2019,Texas
4T1BF1FK3JU123456,Toyota Camry,2018,California
1FTFW1ET5JFA12345,Ford F-150,2018,Florida
EOF
```

---

## 🎯 Шаг 2: Запуск Первой Ступени (Stage1)

**Рекомендуется начать с малого для проверки:**

```bash
# Запуск только stage1 (10 страниц)
node scripts/monster_7x_batch_pipeline.js --stage stage1
```

**Что произойдет:**
1. Генерация 10 страниц
2. QA проверка каждой страницы
3. Исправление концовок
4. Валидация
5. Извлечение паттернов из логов
6. Компиляция новых правил
7. Оптимизация правил
8. Эскалация правил

**Результаты:**
- `output/` — готовые страницы
- `logs/stage1.log` — лог обработки
- `rules/error_patterns.json` — извлеченные паттерны
- `rules/rules.json` — обновленные правила
- `qc_issues/stage1_failed_pages.json` — проваленные страницы (если есть)

---

## 🔍 Шаг 3: Проверка Результатов

### Проверка Логов

```bash
# Просмотр логов
tail -f logs/stage1.log

# Поиск ошибок
grep ERROR logs/stage1.log

# Статистика
grep "✅ Published" logs/stage1.log | wc -l
```

### Проверка Правил

```bash
# Просмотр обновленных правил
cat rules/rules.json | jq '.rules | length'

# Просмотр извлеченных паттернов
cat rules/error_patterns.json | jq '.patterns | length'
```

### Проверка Качества

```bash
# Проверка одной страницы
node scripts/qa_page.js output/19UUB2F50KA123456.json --depth deep --stage stage1

# Проверка SEO метрик
node scripts/seo_metrics.js --input output/19UUB2F50KA123456.json

# Проверка intent coverage
node scripts/validate_intents.js --input output/19UUB2F50KA123456.json
```

---

## 📈 Шаг 4: Ручное Улучшение Правил (Опционально)

Если на stage1 обнаружены проблемы:

1. **Просмотрите `rules/error_patterns.json`** — какие паттерны чаще всего встречаются
2. **Просмотрите `logs/stage1.log`** — какие ошибки повторяются
3. **Отредактируйте `rules/rules.json`** — добавьте/измените правила вручную
4. **Запустите stage1 снова** — проверьте улучшения

---

## 🚀 Шаг 5: Запуск Всех Ступеней

После успешного stage1 запустите все ступени:

```bash
# Запуск всех ступеней (10 → 50 → 100 → 1000)
node scripts/monster_7x_batch_pipeline.js
```

**Время выполнения (примерно):**
- Stage1 (10 страниц): ~5-10 минут
- Stage2 (50 страниц): ~20-40 минут
- Stage3 (100 страниц): ~40-80 минут
- Stage4 (1000 страниц): ~6-12 часов

---

## 🔄 Шаг 6: Мониторинг и Оптимизация

### Мониторинг в Реальном Времени

```bash
# Просмотр логов в реальном времени
tail -f logs/stage1.log

# Мониторинг использования правил
watch -n 5 'cat rules/rules.json | jq ".stats.usage"'
```

### Анализ Результатов

```bash
# Статистика по ступеням
for stage in stage1 stage2 stage3 stage4; do
  echo "=== $stage ==="
  echo "Published: $(grep "✅ Published" logs/${stage}.log 2>/dev/null | wc -l | tr -d ' ')"
  echo "Failed: $(cat qc_issues/${stage}_failed_pages.json 2>/dev/null | jq 'length' 2>/dev/null || echo 0)"
done
```

---

## 📊 Шаг 7: Анализ Golden Reports

Проверьте golden samples (примерно каждая 37-я страница):

```bash
# Просмотр golden reports
ls -la golden_reports/

# Анализ качества
for file in golden_reports/*.json; do
  echo "=== $(basename $file) ==="
  node scripts/qa_page.js "$file" --depth deep --stage stage1 | jq '.validation, .intent_coverage, .domain_density, .seo_metrics'
done
```

---

## 🎯 Рекомендуемый Порядок Действий

1. ✅ **Подготовка** — создать tasks файлы
2. ✅ **Тест** — запустить stage1 (10 страниц)
3. ✅ **Проверка** — проанализировать результаты
4. ✅ **Оптимизация** — улучшить правила при необходимости
5. ✅ **Масштабирование** — запустить все ступени
6. ✅ **Мониторинг** — отслеживать качество на каждой ступени

---

## ⚠️ Важные Замечания

1. **Stage1 критичен** — здесь вы доводите систему до 10/10 качества
2. **Правила обновляются автоматически** — но можно улучшать вручную
3. **Логи важны** — они используются для самообучения
4. **Golden reports** — сохраняйте для анализа качества

---

## 🎉 Готово!

После выполнения всех шагов система будет:
- ✅ Самообучаться из логов
- ✅ Автоматически улучшать правила
- ✅ Масштабироваться до 1000+ страниц
- ✅ Поддерживать высокое качество

**Удачи!** 🚀

















