# 🔴 Диагностика: Почему не растет количество страниц

## Проблема

**Production Stats показывает:** 10 страниц (EN: 7, ES: 3)  
**Запущено батчей:** 5+  
**Ожидалось:** 10 + (6 × 5) = 40+ страниц  
**Реально:** 10 страниц (не меняется!)

---

## 🔍 Расследование

### 1. Проверка файлов
```bash
find public/semantic-pages -name "index.html" | wc -l
# Результат: 10 файлов

stat public/semantic-pages/en/dmv-titles/ca/title-types/checklist/index.html
# Дата: 2025-12-09 16:55:44 (обновлен недавно)
```

**Вывод:** Файлы **перезаписываются**, а не создаются новые!

---

### 2. Проверка топиков
```bash
ls data/topic.*.json | wc -l
# Результат: 1,007 топиков

cat data/topics_queue.json | jq 'length'
# Результат: 6 топиков (всегда одни и те же!)
```

**Вывод:** Очередь генерирует **одни и те же 6 топиков** каждый раз!

---

### 3. Проверка очереди
```bash
cat data/topics_queue.json | jq '.'
# Результат:
[
  "topic.dmv_az_title_types_checklist_en_us_general.json",
  "topic.dmv_ca_title_types_checklist_en_us_general.json",
  "topic.dmv_fl_title_types_checklist_en_us_general.json",
  "topic.dmv_nv_title_types_checklist_en_us_general.json",
  "topic.dmv_ny_title_types_checklist_en_us_general.json",
  "topic.dmv_tx_title_types_checklist_en_us_general.json"
]
```

**Вывод:** Всегда одни и те же 6 файлов!

---

## 🐛 Корневая причина

### Проблема 1: Неправильная зона в топиках
```javascript
// Было в generate-dmv-topics.js:
{
  zone: "us_general",  // ❌ Неправильно!
  dimensions: { ... }
}

// Фильтр в generatePhaseQueue:
if (zones && !zones.includes(topic.zone)) continue;
// zones = ['dmv_titles']
// topic.zone = 'us_general'
// → Топик отфильтровывается!
```

**Решение:**
```javascript
// Исправлено:
{
  zone: "dmv_titles",  // ✅ Правильно!
  audience: "us_general",
  dimensions: { ... }
}
```

---

### Проблема 2: Нет рандомизации
```javascript
// Было:
const allTopics = fs.readdirSync(dataDir)
  .filter(f => f.startsWith('topic.'))
  .map(f => path.join(dataDir, f));

for (const topicFile of allTopics) {
  // Всегда берет первые 6 топиков в алфавитном порядке!
}
```

**Решение:**
```javascript
// Исправлено:
const shuffled = allTopics.sort(() => Math.random() - 0.5);

for (const topicFile of shuffled) {
  // Каждый раз разные топики!
}
```

---

### Проблема 3: Нет трекинга обработанных топиков
```javascript
// Сейчас нет механизма отслеживания:
// - Какие топики уже обработаны
// - Какие HTML файлы уже существуют
// - Нужно ли регенерировать

// Результат: одни и те же топики перезаписывают одни и те же файлы
```

---

## ✅ Исправления

### 1. Исправлен генератор топиков
```javascript
// scripts/generate-dmv-topics.js
const topic = {
  zone: 'dmv_titles',  // ✅ Правильная зона
  audience: lang.zone,  // us_general или mx_us
  dimensions: { state, dmv_topic, format_variant }
};
```

### 2. Добавлена рандомизация
```javascript
// scripts/monster8_local_dashboard_server.js
const shuffled = allTopics.sort(() => Math.random() - 0.5);
```

### 3. Создано 1,007 топиков
```bash
node scripts/generate-dmv-topics.js 500 en
# Создано: 500 новых топиков
# Всего: 1,007 топиков
```

---

## 🎯 Ожидаемый результат

### После исправлений:
```
Батч 1: 6 новых страниц → Total: 16 (было 10)
Батч 2: 6 новых страниц → Total: 22
Батч 3: 6 новых страниц → Total: 28
...
```

### Прогресс к Phase 2:
```
Current: 10 страниц
Target: 5,000 страниц
Remaining: 4,990 страниц
Batches needed: ~830 батчей (по 6 страниц)
```

---

## 📊 Следующие шаги

### 1. Запустить батч с новыми топиками
```bash
curl -X POST http://localhost:3030/api/local-start
```

### 2. Проверить что создаются НОВЫЕ файлы
```bash
find public/semantic-pages -name "index.html" -newermt "2025-12-10 01:00"
# Должно быть 6 новых файлов!
```

### 3. Проверить счетчик
```bash
curl http://localhost:3030/api/local-status | jq '.production'
# Должно быть: { total: 16, en: 13, es: 3 }
```

---

## 🚨 Дополнительные улучшения

### Трекинг обработанных топиков
```javascript
// Создать data/processed_topics.json:
{
  "processed": [
    "topic.dmv_ca_title_types_checklist_en_us_general.json",
    ...
  ],
  "last_updated": "2025-12-10T01:00:00.000Z"
}

// В generatePhaseQueue:
const processed = loadProcessedTopics();
const queue = shuffled.filter(t => !processed.includes(t));
```

### Проверка существования HTML
```javascript
// Перед добавлением в очередь:
const htmlPath = getExpectedHTMLPath(topic);
if (fs.existsSync(htmlPath)) {
  console.log(`[skip] HTML already exists: ${htmlPath}`);
  continue;
}
```

### Автоматическая регенерация старых страниц
```javascript
// Если страница старше 30 дней:
const stats = fs.statSync(htmlPath);
if (Date.now() - stats.mtimeMs > 30 * 24 * 60 * 60 * 1000) {
  queue.push({ topic_file: topicFile, reason: 'refresh' });
}
```

---

## ✅ Статус исправлений

- ✅ Создан генератор топиков (`generate-dmv-topics.js`)
- ✅ Сгенерировано 1,007 топиков
- ✅ Исправлена зона топиков (`dmv_titles`)
- ✅ Добавлена рандомизация очереди
- ⏳ Тестирование нового батча...

---

**Дата:** 2025-12-10  
**Статус:** ✅ ИСПРАВЛЕНО, ожидаем тестирования









