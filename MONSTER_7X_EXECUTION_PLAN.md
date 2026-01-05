# 📋 MONSTER 7.x — План Выполнения

**После создания всех компонентов:**

---

## ✅ Что Уже Сделано

1. ✅ Все скрипты созданы (19 скриптов)
2. ✅ Все templates созданы (3 файла)
3. ✅ Все директории созданы (tasks, logs, tmp, output, etc.)
4. ✅ Интеграция завершена
5. ✅ Документация создана

---

## 🎯 Что Делать Дальше (По Порядку)

### Шаг 1: Подготовка Tasks Файлов ✅

```bash
# Генерация tasks для всех ступеней
node scripts/generate_tasks.js --stage stage1  # 10 страниц
node scripts/generate_tasks.js --stage stage2  # 50 страниц
node scripts/generate_tasks.js --stage stage3  # 100 страниц
node scripts/generate_tasks.js --stage stage4  # 1000 страниц
```

**Проверка:**
```bash
ls -la tasks/
# Должны быть: stage1_tasks.csv, stage2_tasks.csv, stage3_tasks.csv, stage4_tasks.csv
```

---

### Шаг 2: Тестовый Запуск Stage1

**Рекомендуется начать с малого для проверки:**

```bash
# Запуск только stage1 (10 страниц)
node scripts/monster_7x_batch_pipeline.js --stage stage1
```

**Что произойдет:**
1. ✅ Генерация 10 страниц через `gen_page.js`
2. ✅ QA проверка каждой страницы через `qa_page.js` (все метрики)
3. ✅ Исправление концовок через `fix_endings.js`
4. ✅ Валидация через `validate_page.js`
5. ✅ Извлечение паттернов из `logs/stage1.log`
6. ✅ Компиляция новых правил в `rules/rules.json`
7. ✅ Оптимизация правил
8. ✅ Эскалация правил

**Ожидаемое время:** 5-10 минут

---

### Шаг 3: Проверка Результатов Stage1

#### 3.1 Проверка Логов

```bash
# Просмотр логов
cat logs/stage1.log

# Поиск ошибок
grep ERROR logs/stage1.log

# Статистика успешных публикаций
grep "✅ Published" logs/stage1.log | wc -l
```

#### 3.2 Проверка Правил

```bash
# Количество правил
cat rules/rules.json | jq '.rules | length'

# Извлеченные паттерны
cat rules/error_patterns.json | jq '.patterns | length'

# Новые правила (auto-generated)
cat rules/rules.json | jq '.rules[] | select(.meta.auto_generated == true) | .id'
```

#### 3.3 Проверка Качества Страниц

```bash
# Проверка одной страницы (полная QA)
node scripts/qa_page.js output/19UUB2F50KA123456.json --depth deep --stage stage1

# Проверка SEO метрик
node scripts/seo_metrics.js --input output/19UUB2F50KA123456.json

# Проверка intent coverage
node scripts/validate_intents.js --input output/19UUB2F50KA123456.json

# Проверка domain density
node scripts/measure_density.js --input output/19UUB2F50KA123456.json
```

#### 3.4 Проверка Проваленных Страниц

```bash
# Просмотр проваленных страниц
cat qc_issues/stage1_failed_pages.json | jq '.'

# Анализ причин провала
for vin in $(cat qc_issues/stage1_failed_pages.json | jq -r '.[].vin'); do
  echo "=== $vin ==="
  grep "$vin" logs/stage1.log | grep -E "(ERROR|FAILED|INVALID)"
done
```

---

### Шаг 4: Ручное Улучшение Правил (Если Нужно)

Если на stage1 обнаружены проблемы:

1. **Анализ паттернов:**
   ```bash
   cat rules/error_patterns.json | jq '.patterns[] | select(.count >= 3) | {kind, pattern, count}'
   ```

2. **Редактирование правил:**
   ```bash
   # Откройте rules/rules.json
   # Добавьте/измените правила вручную
   ```

3. **Повторный запуск stage1:**
   ```bash
   node scripts/monster_7x_batch_pipeline.js --stage stage1
   ```

---

### Шаг 5: Запуск Всех Ступеней

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

**Можно запускать в фоне:**
```bash
nohup node scripts/monster_7x_batch_pipeline.js > batch.log 2>&1 &
```

---

### Шаг 6: Мониторинг Процесса

#### 6.1 Мониторинг в Реальном Времени

```bash
# Просмотр логов в реальном времени
tail -f logs/stage1.log

# Мониторинг всех логов
tail -f logs/*.log

# Мониторинг использования правил
watch -n 5 'cat rules/rules.json | jq ".stats.usage"'
```

#### 6.2 Статистика по Ступеням

```bash
# Создайте скрипт для статистики
cat > scripts/check_stats.sh << 'EOF'
#!/bin/bash
for stage in stage1 stage2 stage3 stage4; do
  if [ -f "logs/${stage}.log" ]; then
    echo "=== $stage ==="
    echo "Published: $(grep "✅ Published" logs/${stage}.log 2>/dev/null | wc -l | tr -d ' ')"
    echo "Failed: $(cat qc_issues/${stage}_failed_pages.json 2>/dev/null | jq 'length' 2>/dev/null || echo 0)"
    echo "Rules: $(cat rules/rules.json 2>/dev/null | jq '.rules | length' 2>/dev/null || echo 0)"
  fi
done
EOF

chmod +x scripts/check_stats.sh
./scripts/check_stats.sh
```

---

### Шаг 7: Анализ Golden Reports

Проверьте golden samples (примерно каждая 37-я страница):

```bash
# Просмотр golden reports
ls -la golden_reports/

# Анализ качества golden reports
for file in golden_reports/*.json; do
  if [ -f "$file" ]; then
    echo "=== $(basename $file) ==="
    node scripts/qa_page.js "$file" --depth deep --stage stage1 | jq '{
      validation: .validation.valid,
      intent_coverage: .intent_coverage.coverage_rate,
      domain_density: .domain_density.valid,
      seo_metrics: .seo_metrics.valid
    }'
  fi
done
```

---

## 📊 Критерии Успеха

### Stage1 (10 страниц)
- ✅ Минимум 8/10 страниц прошли валидацию
- ✅ Правила обновились (новые правила в rules.json)
- ✅ Паттерны извлечены (error_patterns.json не пустой)
- ✅ Нет критических ошибок в логах

### Stage2-4 (50-1000 страниц)
- ✅ Процент успешных страниц ≥ 90%
- ✅ Правила автоматически улучшаются
- ✅ Качество не падает при масштабировании

---

## 🔧 Troubleshooting

### Проблема: Много проваленных страниц

**Решение:**
1. Проверьте логи: `grep ERROR logs/stage1.log`
2. Улучшите правила в `rules/rules.json`
3. Запустите stage1 снова

### Проблема: Правила не обновляются

**Решение:**
1. Проверьте наличие логов: `ls -la logs/stage1.log`
2. Проверьте извлечение паттернов: `cat rules/error_patterns.json`
3. Запустите вручную:
   ```bash
   node scripts/auto_pattern_extractor.js --log logs/stage1.log --out rules/error_patterns.json
   node scripts/rule_compiler.js --patterns rules/error_patterns.json --rules-in rules/rules.json --rules-out rules/rules.json.tmp
   ```

### Проблема: Генерация слишком медленная

**Решение:**
1. Уменьшите количество страниц в tasks файлах
2. Используйте оптимизированный генератор (если доступен)
3. Запускайте ступени последовательно, а не все сразу

---

## ✅ Чеклист Готовности

Перед запуском проверьте:

- [ ] Tasks файлы созданы (`tasks/stage*_tasks.csv`)
- [ ] Директории созданы (`logs/`, `tmp/`, `output/`, `qc_issues/`)
- [ ] Правила загружаются (`rules/rules.json` существует)
- [ ] Templates загружаются (`templates/*.json` существуют)
- [ ] Скрипты исполняемые (`chmod +x scripts/*.js`)
- [ ] Данные доступны (`data/makes-models.json`, `data/seo/url-seeds.json`)

---

## 🎉 Готово к Запуску!

После выполнения всех шагов система будет:
- ✅ Самообучаться из логов
- ✅ Автоматически улучшать правила
- ✅ Масштабироваться до 1000+ страниц
- ✅ Поддерживать высокое качество

**Начните с Stage1 и двигайтесь дальше!** 🚀


















