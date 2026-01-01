# MONSTER 8.0 — Архитектура системы

## 🏗️ Компоненты

```
┌─────────────────────────────────────────────────────────────────┐
│                        MONSTER 8.0 SYSTEM                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────┐     │
│  │          LOCAL DASHBOARD (Port 3030)                  │     │
│  │  • Express.js сервер                                  │     │
│  │  • Управление батчами                                 │     │
│  │  • Мониторинг прогресса                               │     │
│  │  • API для деплоя                                     │     │
│  └────────────┬──────────────────────────────────────────┘     │
│               │                                                 │
│               │ spawn + env.BATCH_ID                            │
│               ▼                                                 │
│  ┌───────────────────────────────────────────────────────┐     │
│  │      ORCHESTRATOR (build_topics_batch_parallel.js)    │     │
│  │  • Параллельная генерация                             │     │
│  │  • Извлечение HTML путей                              │     │
│  │  • Автодеплой через HTTP                              │     │
│  └────────────┬──────────────────────────────────────────┘     │
│               │                                                 │
│               │ spawn bash                                      │
│               ▼                                                 │
│  ┌───────────────────────────────────────────────────────┐     │
│  │       PAGE BUILDER (build_topic_page.sh)              │     │
│  │  • Генерация блоков контента                          │     │
│  │  • Рендеринг HTML                                     │     │
│  │  • Сохранение в public/semantic-pages/                │     │
│  └────────────┬──────────────────────────────────────────┘     │
│               │                                                 │
│               │ stdout: "Page built → .../index.html"           │
│               ▼                                                 │
│  ┌───────────────────────────────────────────────────────┐     │
│  │         FILE SYSTEM (tmp/, public/)                   │     │
│  │  • tmp/batch-html-paths.json                          │     │
│  │  • public/semantic-pages/*/index.html                 │     │
│  │  • logs/local_batch_*.log                             │     │
│  └────────────┬──────────────────────────────────────────┘     │
│               │                                                 │
│               │ HTTP POST /api/local-deploy                     │
│               ▼                                                 │
│  ┌───────────────────────────────────────────────────────┐     │
│  │           VERCEL CLI (vercel --prod --yes)            │     │
│  │  • Деплой на production                               │     │
│  │  • Получение URL                                      │     │
│  │  • Логирование в logs/deploy_*.log                    │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Поток данных

### 1. Запуск батча

```
USER (Browser)
    │
    │ POST /api/local-start
    ▼
DASHBOARD
    │
    │ 1. detectCurrentPhase()
    │    → Считает страницы в public/semantic-pages
    │    → Определяет фазу (PHASE1_DMV_CORE, etc.)
    │
    │ 2. generatePhaseQueue(phaseInfo)
    │    → Генерирует data/topics_queue.json
    │    → Фильтрует по языку, зоне, штату
    │
    │ 3. startNewBatchRecord()
    │    → Создает запись в data/local_batch_state.json
    │    → ID: "2025-12-09T15-28-52-223Z"
    │
    │ 4. spawn('node', ['build_topics_batch_parallel.js'], {
    │      env: { BATCH_ID: record.id }
    │    })
    ▼
ORCHESTRATOR запущен
```

---

### 2. Генерация страниц

```
ORCHESTRATOR
    │
    │ 1. loadQueue('data/topics_queue.json')
    │    → Загружает топики для генерации
    │
    │ 2. processQueueParallel(queue, 6 параллельно)
    │    │
    │    ├─► buildPage(topic1) ──┐
    │    ├─► buildPage(topic2) ──┤
    │    ├─► buildPage(topic3) ──┤
    │    ├─► buildPage(topic4) ──┼─► Promise.allSettled()
    │    ├─► buildPage(topic5) ──┤
    │    └─► buildPage(topic6) ──┘
    │
    │ 3. Каждый buildPage():
    │    │
    │    │ spawn('bash', ['build_topic_page.sh', 'data/topic.json'])
    │    │
    │    │ stdout: "[DONE] Page built → .../public/semantic-pages/en/dmv/ca/title-types/index.html"
    │    │
    │    │ Парсинг stdout:
    │    │   match = stdout.match(/Page built → .*\/(public\/[^\s]+\.html)/)
    │    │   htmlPath = "/semantic-pages/en/dmv/ca/title-types"
    │    │
    │    └─► resolve({ success: true, htmlPath })
    │
    │ 4. Сбор результатов:
    │    results = [
    │      { success: true, htmlPath: "/semantic-pages/en/dmv/ca/title-types" },
    │      { success: true, htmlPath: "/semantic-pages/en/dmv/tx/title-types" },
    │      ...
    │    ]
    │
    │ 5. Сохранение путей:
    │    const htmlPaths = results.filter(r => r.success && r.htmlPath).map(r => r.htmlPath);
    │    fs.writeFileSync('tmp/batch-html-paths.json', JSON.stringify(htmlPaths));
    │
    ▼
tmp/batch-html-paths.json создан
```

---

### 3. Автодеплой

```
ORCHESTRATOR
    │
    │ if (success > 0) {
    │
    │   HTTP POST http://localhost:3030/api/local-deploy
    │   Body: { batchId: process.env.BATCH_ID, force: true }
    │
    ▼
DASHBOARD получает запрос
    │
    │ 1. Читает tmp/batch-html-paths.json
    │    htmlPaths = ["/semantic-pages/en/dmv/ca/title-types", ...]
    │
    │ 2. Анализирует каждую страницу:
    │    for (const htmlPath of htmlPaths) {
    │      const fullPath = `public${htmlPath}/index.html`;
    │      const html = fs.readFileSync(fullPath);
    │      const words = countWords(html);
    │      results.pages.push({ path: htmlPath, words });
    │    }
    │
    │ 3. Обновляет историю батча:
    │    {
    │      id: "2025-12-09T15-28-52-223Z",
    │      pagesGenerated: 6,
    │      avgWords: 1234,
    │      samplePages: [
    │        { path: "/semantic-pages/en/dmv/ca/title-types", words: 1245 },
    │        ...
    │      ]
    │    }
    │
    │ 4. Запускает Vercel:
    │    spawn('vercel', ['--prod', '--yes'])
    │    │
    │    │ stdout: "✓ Production: https://your-site.vercel.app [1m 23s]"
    │    │
    │    │ Парсинг URL:
    │    │   match = stdout.match(/https:\/\/[^\s]+/)
    │    │   deployUrl = "https://your-site.vercel.app"
    │    │
    │    └─► Обновляет историю:
    │         {
    │           deployed: true,
    │           deployedAt: "2025-12-09T15:30:00.000Z",
    │           deployUrl: "https://your-site.vercel.app"
    │         }
    │
    ▼
Деплой завершен
```

---

### 4. Отображение в UI

```
BROWSER
    │
    │ setInterval(() => fetch('/api/local-status'), 2000)
    │
    ▼
DASHBOARD возвращает:
{
  "current": null,
  "history": [
    {
      "id": "2025-12-09T15-28-52-223Z",
      "phase": "PHASE1_DMV_CORE",
      "status": "success",
      "pagesGenerated": 6,
      "avgWords": 1234,
      "samplePages": [
        { "path": "/semantic-pages/en/dmv/ca/title-types", "words": 1245 },
        { "path": "/semantic-pages/en/dmv/tx/title-types", "words": 1223 },
        ...
      ],
      "deployed": true,
      "deployedAt": "2025-12-09T15:30:00.000Z",
      "deployUrl": "https://your-site.vercel.app"
    }
  ]
}
    │
    │ renderStatus(data)
    ▼
UI обновляется:
┌─────────────────────────────────────────────────┐
│ ✅ Batch 2025-12-09T15-28-52-223Z               │
│ Phase: PHASE1_DMV_CORE                          │
│ Pages: 6 (avg 1234 words)                      │
│ Deploy: ✓ Deployed at 15:30:00                 │
│                                                 │
│ [Show 6 pages ▼]                                │
│   📄 /semantic-pages/en/dmv/ca/title-types      │
│      (1245 words) 🔗                            │
│   📄 /semantic-pages/en/dmv/tx/title-types      │
│      (1223 words) 🔗                            │
│   ...                                           │
└─────────────────────────────────────────────────┘
```

---

## 📁 Структура файлов

```
website/
├── scripts/
│   ├── monster8_local_dashboard_server.js  ← Express сервер
│   ├── build_topics_batch_parallel.js      ← Оркестратор
│   ├── build_topic_page.sh                 ← Генератор страниц
│   └── report_progress.js                  ← Отправка прогресса
│
├── public/
│   ├── local-batch-dashboard.html          ← UI дашборда
│   └── semantic-pages/                     ← Сгенерированные страницы
│       └── en/dmv/ca/title-types/
│           └── index.html
│
├── data/
│   ├── local_batch_state.json              ← Состояние батчей
│   └── topics_queue.json                   ← Очередь топиков
│
├── tmp/
│   └── batch-html-paths.json               ← Пути к HTML (временный)
│
└── logs/
    ├── local_batch_*.log                   ← Логи генерации
    └── deploy_*.log                        ← Логи деплоя
```

---

## 🔐 Переменные окружения

```bash
# Передается из дашборда в оркестратор
BATCH_ID="2025-12-09T15-28-52-223Z"

# Используется оркестратором для автодеплоя
# (читается из process.env.BATCH_ID)
```

---

## 🌐 API эндпоинты

### GET /api/local-status
```json
{
  "current": { ... },
  "history": [ ... ],
  "phase": { ... }
}
```

### POST /api/local-start
```json
{
  "phase": "auto",
  "length": "auto"
}
```

### POST /api/local-deploy
```json
{
  "batchId": "2025-12-09T15-28-52-223Z",
  "force": true
}
```

### POST /api/local-progress
```json
{
  "topicsDone": 3
}
```

---

## 🎯 Ключевые особенности

### 1. Извлечение путей из stdout
```javascript
// Вместо поиска по файловой системе
const match = stdout.match(/Page built → .*\/(public\/[^\s]+\.html)/);
```

### 2. Временный файл для передачи данных
```javascript
// tmp/batch-html-paths.json - мост между оркестратором и дашбордом
fs.writeFileSync('tmp/batch-html-paths.json', JSON.stringify(htmlPaths));
```

### 3. HTTP API для автодеплоя
```javascript
// Оркестратор → Дашборд → Vercel
http.request({ path: '/api/local-deploy' });
```

### 4. Передача контекста через env
```javascript
// Дашборд передает ID батча оркестратору
spawn('node', ['orchestrator.js'], {
  env: { BATCH_ID: record.id }
});
```

---

## ✅ Преимущества архитектуры

1. **Разделение ответственности:**
   - Дашборд = управление + мониторинг
   - Оркестратор = генерация + координация
   - Builder = создание контента

2. **Асинхронность:**
   - Параллельная генерация (6 одновременно)
   - Неблокирующий автодеплой

3. **Прозрачность:**
   - Все логи в файлах
   - Полная история батчей
   - Real-time прогресс

4. **Надежность:**
   - Fallback на поиск по FS
   - Graceful error handling
   - Логирование всех операций

5. **Масштабируемость:**
   - Легко добавить новые фазы
   - Простое расширение API
   - Модульная структура

---

## 🚀 Итого

**Полностью автоматический пайплайн:**
- ✅ Генерация → Извлечение → Деплой → Мониторинг
- ✅ Без ручного вмешательства
- ✅ С полной прозрачностью
- ✅ И real-time обновлениями

**Архитектура готова к масштабированию до 1M страниц!** 🎉











