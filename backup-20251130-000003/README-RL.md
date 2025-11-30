# 🤖 BUILD 5.0 — SELF-LEARNING RL ENGINE

## 🚀 Быстрый старт

### Шаг 1: Подготовь GSC данные

1. **Скачай CSV из Google Search Console:**
   - Зайди: https://search.google.com/search-console
   - Выбери сайт (vintrusted.com)
   - Перейди в "Производительность" (Performance)
   - Нажми "Экспорт" → "CSV"
   - Сохрани файл

2. **Подготовь файл:**
   ```bash
   # Положи скачанный CSV в:
   cp ~/Downloads/your-gsc-export.csv data/gsc/gsc-raw.csv
   
   # Автоматически подготовь правильный формат:
   node scripts/rl/prepare-gsc-csv.js
   ```

3. **Проверь результат:**
   ```bash
   # Должен появиться файл:
   cat data/gsc/gsc-latest.csv
   ```

### Шаг 2: Запусти RL обучение

```bash
# Вариант 1: Только RL обучение
npm run rl:train

# Вариант 2: Полный билд с RL (автоматически включится)
npm run build:seo
```

### Шаг 3: Проверь результаты

```bash
# Посмотри обновлённые политики:
cat data/a-b-tests/policy.json
cat data/rl/sitemap-policy.json
cat data/rl/lang-policy.json
```

## 📊 Что делает RL система

1. **Анализирует данные:**
   - Behavior logs (clicks, scroll, CTA, bounce) из `data/behavior-logs/behavior.log`
   - GSC данные (clicks, impressions, CTR, position) из `data/gsc/gsc-latest.csv`

2. **Вычисляет reward для каждого URL:**
   - Объединяет поведенческие и SEO метрики
   - Учитывает bounce penalty

3. **Обновляет политики:**
   - **A/B веса:** какой шаблон работает лучше (Template A или B)
   - **Sitemap скорость:** как быстро раскрывать страницы
   - **Языковой микс:** баланс EN/ES контента
   - **Link boost:** топ-200 страниц для приоритетного линкинга

## 🔄 Цикл работы

```
1. Пользователи посещают страницы
   ↓
2. Behavior logs собираются автоматически (seo-events.js)
   ↓
3. Ты экспортируешь GSC CSV раз в неделю/месяц
   ↓
4. Запускаешь: npm run rl:train
   ↓
5. RL обновляет политики
   ↓
6. Следующий билд использует новые политики
   ↓
7. Повторяй шаги 3-6
```

## ⚙️ Ручная настройка (опционально)

Если хочешь запустить RL даже без данных:

```bash
# Принудительно включить RL
SEO_ENABLE_RL=true npm run build:seo
```

## 📝 Формат GSC CSV

Ожидаемый формат `data/gsc/gsc-latest.csv`:

```csv
url,clicks,impressions,ctr,position
https://vintrusted.com/vin-check/ca/toyota/2020,150,5000,0.03,5.2
https://vintrusted.com/vin-check/tx/honda/2019,120,4500,0.027,6.1
```

Скрипт `prepare-gsc-csv.js` автоматически конвертирует экспорт GSC в этот формат.

## 🐛 Troubleshooting

**Проблема:** "RL training пропущен"
- **Решение:** Убедись, что есть `data/gsc/gsc-latest.csv` или `data/behavior-logs/behavior.log`

**Проблема:** "Не найдены обязательные колонки"
- **Решение:** Используй `prepare-gsc-csv.js` для автоматической конвертации

**Проблема:** "RL policies не обновляются"
- **Решение:** Проверь, что в GSC CSV есть данные (clicks > 0)
