# 🚀 MONSTER 7.x — Быстрый Старт

## ✅ Все Компоненты Реализованы

Система полностью готова к использованию. Все компоненты из bash-скрипта реализованы и интегрированы.

---

## 📋 Быстрая Проверка

### 1. Проверка наличия скриптов

```bash
ls scripts/gen_page.js scripts/qa_page.js scripts/fix_endings.js scripts/validate_page.js
ls scripts/auto_pattern_extractor.js scripts/rule_compiler.js scripts/rule_optimizer.js
ls scripts/monster_7x_batch_pipeline.js
```

### 2. Проверка templates

```bash
ls templates/intent_matrix.json templates/domain_terms.json templates/differentiation_rules.json
```

---

## 🎯 Использование

### Генерация Одной Страницы

```bash
node scripts/gen_page.js \
  --vin "19UUB2F50KA123456" \
  --model "Honda Accord" \
  --year "2019" \
  --state "Texas" \
  --analysis-depth "deep" \
  --max-retries 3
```

**Результат:** JSON с полной статьей выводится в stdout

### Сохранение в файл

```bash
node scripts/gen_page.js \
  --vin "19UUB2F50KA123456" \
  --model "Honda Accord" \
  --year "2019" \
  --state "Texas" > output/test_page.json
```

### QA Проверка

```bash
node scripts/qa_page.js output/test_page.json \
  --depth deep \
  --stage stage1
```

### Исправление Концовок

```bash
node scripts/fix_endings.js output/test_page.json \
  --output output/test_page_fixed.json
```

### Валидация Перед Публикацией

```bash
node scripts/validate_page.js output/test_page_fixed.json \
  --analysis-depth deep
```

---

## 🔄 Batch Pipeline

### Подготовка Tasks Файлов

Создайте файлы с задачами в формате CSV:

```bash
mkdir -p tasks

# tasks/stage1_tasks.csv
cat > tasks/stage1_tasks.csv << EOF
VIN,MODEL,YEAR,STATE
19UUB2F50KA123456,Honda Accord,2019,Texas
4T1BF1FK3JU123456,Toyota Camry,2018,California
EOF
```

### Запуск Одной Ступени

```bash
node scripts/monster_7x_batch_pipeline.js --stage stage1
```

### Запуск Всех Ступеней

```bash
node scripts/monster_7x_batch_pipeline.js
```

**Процесс:**
1. Генерация страниц (10 → 50 → 100 → 1000)
2. QA проверка каждой страницы
3. Исправление концовок
4. Валидация
5. Извлечение паттернов из логов
6. Компиляция новых правил
7. Оптимизация правил
8. Эскалация частых ошибок

---

## 📊 Структура Директорий

```
scripts/
├── gen_page.js                    ✅ Генерация
├── qa_page.js                     ✅ QA проверка
├── fix_endings.js                 ✅ Исправление концовок
├── validate_page.js               ✅ Валидация
├── auto_pattern_extractor.js      ✅ Извлечение паттернов
├── rule_compiler.js               ✅ Компиляция правил
├── rule_optimizer.js              ✅ Оптимизация
├── rule_escalator.js              ✅ Эскалация
├── rule_usage_tracker.js          ✅ Трекинг
└── monster_7x_batch_pipeline.js   ✅ Batch pipeline

templates/
├── intent_matrix.json              ✅ Матрица интентов
├── domain_terms.json               ✅ Доменные термины
└── differentiation_rules.json      ✅ Дифференциация

rules/
└── rules.json                      ✅ Правила (обновляются автоматически)

tasks/
└── stage*_tasks.csv                📝 CSV файлы с задачами

logs/
└── stage*.log                      📋 Логи для анализа

tmp/
└── *.json                          🔄 Временные файлы

output/
└── *.json                          ✅ Готовые страницы
```

---

## 🔍 Отладка

### Проверка Логов

```bash
# Просмотр логов stage1
tail -f logs/stage1.log

# Поиск ошибок
grep ERROR logs/stage1.log
```

### Ручной Запуск Компонентов

```bash
# Извлечение паттернов
node scripts/auto_pattern_extractor.js \
  --log logs/stage1.log \
  --out rules/error_patterns.json

# Компиляция правил
node scripts/rule_compiler.js \
  --patterns rules/error_patterns.json \
  --rules-in rules/rules.json \
  --rules-out rules/rules.json.tmp

# Оптимизация правил
node scripts/rule_optimizer.js \
  --rules-in rules/rules.json \
  --rules-out rules/rules.json.tmp
```

---

## ✅ Статус

**Все компоненты реализованы и готовы к использованию!**

- ✅ Self-Learning Pipeline
- ✅ CLI скрипты
- ✅ Batch Processing
- ✅ Templates
- ✅ Интеграция с существующей системой

**Система полностью функциональна!** 🎉














