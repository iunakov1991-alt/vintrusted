# MONSTER 8.0 — НОВЫЕ ВОЗМОЖНОСТИ ДАШБОРДА

**Дата:** 2025-12-09  
**Статус:** ✅ Реализовано  

---

## 📊 СТАТИСТИКА ПО СЛОВАМ

### Что добавлено:

После завершения каждого батча система автоматически:
1. **Сканирует** все созданные страницы (за время батча)
2. **Считает слова** в каждой странице (чистый текст без HTML)
3. **Вычисляет среднее** количество слов на страницу
4. **Сохраняет** статистику в истории батча

### Отображение в дашборде:

```
📊 6 pages, avg 1,234 words
```

- **6 pages** - количество сгенерированных страниц
- **avg 1,234 words** - среднее количество слов на страницу

### Где искать страницы:

Система ищет `index.html` файлы в:
- `public/semantic-pages/`
- `public/seo-pages/`
- `public/random-articles/`
- `public/` (корень)

**Критерий:** Файлы созданные после старта батча (с запасом 1 минута)

---

## 🔗 ССЫЛКИ НА РАНДОМНЫЕ СТРАНИЦЫ

### Что добавлено:

После завершения батча система:
1. **Собирает** пути ко всем сгенерированным страницам
2. **Сохраняет** первые 5 страниц как примеры
3. **Отображает** ссылки в истории батча

### Отображение в дашборде:

```
🔗 🔗 🔗
```

Каждая ссылка открывает страницу в новой вкладке.

**Пример URL:**
- `/semantic-pages/en/dmv/ca/title-types`
- `/seo-pages/vin-check-california`

---

## ✅ ПРОВЕРКА КАЧЕСТВА И ДЕПЛОЙ

### Workflow:

```
Батч завершен (success)
    ↓
Кнопка "✓ Check & Deploy"
    ↓
1. Проверка качества
    ↓
2. Автоматический деплой (если качество ОК)
    ↓
Статус: "✓ Deployed"
```

### 1. Проверка качества

**API:** `POST /api/local-quality-check`

**Критерии:**
- ✅ Есть сгенерированные страницы (`pagesGenerated > 0`)
- ✅ Среднее количество слов >= 500 (`avgWords >= 500`)

**Ответ:**
```json
{
  "ok": true,
  "quality": "good",
  "canDeploy": true,
  "stats": {
    "pages": 6,
    "avgWords": 1234,
    "minWords": 500
  },
  "message": "Quality check passed: 6 pages, avg 1234 words"
}
```

**Если качество НЕ ОК:**
```json
{
  "ok": true,
  "quality": "needs_review",
  "canDeploy": false,
  "message": "Quality check failed: avg words 320 < 500"
}
```

### 2. Автоматический деплой

**API:** `POST /api/local-deploy`

**Что происходит:**
1. Повторная проверка качества (если не `force`)
2. Запуск `vercel --prod --yes`
3. Логирование в `logs/deploy_<batchId>.log`
4. Обновление статуса батча: `deployed: true`

**Ответ:**
```json
{
  "ok": true,
  "message": "Deploy started",
  "batchId": "2025-12-09T15-10-48-944Z",
  "logFile": "deploy_2025-12-09T15-10-48-944Z.log"
}
```

### 3. Принудительный деплой

Если нужно задеплоить батч с низким качеством:

```bash
curl -X POST http://localhost:3030/api/local-deploy \
  -H "Content-Type: application/json" \
  -d '{"batchId":"2025-12-09T15-10-48-944Z","force":true}'
```

---

## 🎯 ПРИМЕР ИСПОЛЬЗОВАНИЯ

### 1. Запуск батча

```bash
# Через дашборд: нажать START
# Или через API:
curl -X POST http://localhost:3030/api/local-start \
  -H "Content-Type: application/json" \
  -d '{"phase":"auto","length":"auto"}'
```

### 2. Ожидание завершения

Дашборд автоматически обновляется каждые 5 секунд.

**Статус батча:**
- `running` - в процессе
- `success` - завершен успешно
- `failed` - ошибка
- `stopped` - остановлен вручную

### 3. Проверка результатов

После завершения в истории появится:

```
2025-12-09T15-10-48  success  PHASE1_DMV_CORE  auto
📊 6 pages, avg 1,234 words
🔗 🔗 🔗
✓ Check & Deploy
```

### 4. Деплой

**Вариант A: Через дашборд**
- Нажать кнопку "✓ Check & Deploy"
- Дождаться проверки качества
- Деплой запустится автоматически

**Вариант B: Через API**
```bash
# 1. Проверка качества
curl -X POST http://localhost:3030/api/local-quality-check \
  -H "Content-Type: application/json" \
  -d '{"batchId":"2025-12-09T15-10-48-944Z"}'

# 2. Деплой (если качество ОК)
curl -X POST http://localhost:3030/api/local-deploy \
  -H "Content-Type: application/json" \
  -d '{"batchId":"2025-12-09T15-10-48-944Z"}'
```

### 5. Проверка деплоя

**Логи:**
```bash
tail -f logs/deploy_2025-12-09T15-10-48-944Z.log
```

**Статус в дашборде:**
```
✓ Deployed
```

---

## 📋 СТРУКТУРА ДАННЫХ

### Batch Record (в `data/local_batch_state.json`):

```json
{
  "id": "2025-12-09T15-10-48-944Z",
  "phase": "PHASE1_DMV_CORE",
  "length": "auto",
  "language": "en",
  "status": "success",
  "startedAt": "2025-12-09T15:10:48.944Z",
  "finishedAt": "2025-12-09T15:13:56.123Z",
  "pid": 37329,
  "topicsPlanned": 6,
  "topicsDone": 6,
  "lastError": null,
  
  // Новые поля:
  "avgWords": 1234,
  "totalWords": 7404,
  "pagesGenerated": 6,
  "samplePages": [
    {
      "path": "/semantic-pages/en/dmv/ca/title-types",
      "words": 1245,
      "created": "2025-12-09T15:11:23.456Z"
    },
    {
      "path": "/semantic-pages/en/dmv/tx/title-types",
      "words": 1198,
      "created": "2025-12-09T15:11:45.789Z"
    }
  ],
  
  // После деплоя:
  "deployed": true,
  "deployedAt": "2025-12-09T15:15:00.000Z"
}
```

---

## 🔧 НАСТРОЙКИ

### Минимальное количество слов для деплоя:

По умолчанию: **500 слов**

Изменить в `scripts/monster8_local_dashboard_server.js`:

```javascript
const minWords = 500; // Измените на нужное значение
```

### Количество ссылок в истории:

По умолчанию: **3 ссылки** (из 5 сохраненных)

Изменить в `public/local-batch-dashboard.html`:

```javascript
h.samplePages.slice(0, 3) // Измените на нужное количество
```

### Глубина поиска страниц:

По умолчанию: **5 уровней вложенности**

Изменить в `scripts/monster8_local_dashboard_server.js`:

```javascript
if (depth > 5) return; // Измените на нужную глубину
```

---

## 🚨 TROUBLESHOOTING

### Проблема: Статистика показывает 0 страниц

**Причины:**
1. Страницы создаются в неожиданной директории
2. Страницы создаются до старта батча
3. Ошибка при чтении HTML файлов

**Решение:**
```bash
# 1. Проверить где создаются страницы
find public -name "index.html" -mmin -10 -type f

# 2. Проверить логи батча
tail -100 logs/local_batch_<id>.log | grep -E "(Completed|Success|Failed)"

# 3. Проверить логи дашборда
tail -50 ~/.cursor/projects/Users-dmitrii-Desktop-website/terminals/<id>.txt | grep batch-analysis
```

### Проблема: Деплой не запускается

**Причины:**
1. Качество не прошло проверку
2. Vercel CLI не установлен
3. Нет прав на запуск `vercel`

**Решение:**
```bash
# 1. Проверить качество
curl -X POST http://localhost:3030/api/local-quality-check \
  -H "Content-Type: application/json" \
  -d '{"batchId":"<id>"}'

# 2. Установить Vercel CLI
npm install -g vercel

# 3. Принудительный деплой
curl -X POST http://localhost:3030/api/local-deploy \
  -H "Content-Type: application/json" \
  -d '{"batchId":"<id>","force":true}'
```

### Проблема: Ссылки не работают

**Причины:**
1. Страницы не в `public/`
2. Неправильный путь в `samplePages`

**Решение:**
Проверить структуру `samplePages` в `data/local_batch_state.json`:

```bash
cat data/local_batch_state.json | jq '.history[0].samplePages'
```

---

## 📊 МЕТРИКИ КАЧЕСТВА

### Хорошее качество:
- ✅ `avgWords >= 500`
- ✅ `pagesGenerated > 0`
- ✅ `status === 'success'`

### Среднее качество:
- ⚠️ `avgWords >= 300 && avgWords < 500`
- ⚠️ Требует ручной проверки

### Низкое качество:
- ❌ `avgWords < 300`
- ❌ `pagesGenerated === 0`
- ❌ Деплой заблокирован

---

**Статус:** ✅ Все возможности реализованы и протестированы!










