# 🔄 Генерация страниц до Production - Полная схема

**Дата:** 2025-12-10  
**Версия:** Monster 8.0 (Local + Vercel)

---

## 📊 Общая схема (High-Level)

```
┌─────────────────┐
│  1. Локальная   │
│   генерация     │ ← Mac M1 (localhost:3030)
│  (Dashboard)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. Git commit  │
│   + push        │ ← Автоматически
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. Vercel      │
│   auto-deploy   │ ← Триггер на push
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. Production  │
│  vintrusted.com │ ← Живой сайт
└─────────────────┘
```

---

## 🔧 Детальная схема по шагам

### ШАГ 1: Локальная генерация (Mac M1)

#### 1.1. Запуск дашборда
```bash
npm run monster:dashboard:local
# → Запускает: scripts/monster8_local_dashboard_server.js
# → Порт: http://localhost:3030
# → UI: public/local-batch-dashboard.html
```

#### 1.2. Определение фазы
```javascript
// Автоматически определяется по количеству страниц
detectCurrentPhase() {
  const totalPages = countHTMLFiles('public/semantic-pages');
  
  if (totalPages < 5000)    return 'PHASE1_DMV_CORE';      // EN only
  if (totalPages < 20000)   return 'PHASE2_DMV_FULL';      // EN + ES
  if (totalPages < 200000)  return 'PHASE3_BRAND_MODEL';   // Brands
  if (totalPages < 400000)  return 'PHASE4_FRAUD_PARTIAL'; // Fraud 10%
  return 'PHASE5_FRAUD_FULL';                              // Fraud 100%
}
```

#### 1.3. Генерация очереди топиков
```javascript
// Создается data/topics_queue.json
generatePhaseQueue(phaseInfo) {
  // Берет топики из data/topic.*.json
  // Фильтрует по:
  // - Языку (en/es)
  // - Зоне (dmv_titles)
  // - Штату (CA, TX, FL, NY, AZ, NV для Phase 1)
  // - Формату (checklist, guide)
  
  // Рандомизирует порядок
  const shuffled = allTopics.sort(() => Math.random() - 0.5);
  
  // Берет targetCount топиков (20-30)
  return queue.slice(0, targetCount);
}
```

#### 1.4. Запуск батча
```bash
# Через UI дашборда или API:
POST http://localhost:3030/api/local-start
{
  "phase": "auto",
  "length": "auto"
}

# → Запускает: scripts/build_topics_batch_parallel.js
```

#### 1.5. Параллельная генерация
```javascript
// build_topics_batch_parallel.js
const PARALLEL_WORKERS = 5; // 5 страниц одновременно

for (const batch of batches) {
  await Promise.all(
    batch.map(topic => buildPage(topic))
  );
}

// Каждая страница:
// 1. Читает topic.*.json
// 2. Вызывает build_topic_page.sh
// 3. Генерирует блоки (через DeepSeek API)
// 4. Рендерит HTML
// 5. Сохраняет в public/semantic-pages/
```

#### 1.6. Структура генерации одной страницы
```
topic.dmv_ca_title_types_checklist_en_us_general.json
         ↓
build_topic_page.sh
         ↓
┌─────────────────────────────────────┐
│ 1. generate_blocks_from_topic.js   │ ← Создает блоки контента
│    → tmp/*.blocks.json              │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ 2. render_article_from_blocks.js   │ ← Рендерит HTML
│    → public/semantic-pages/.../    │
│       index.html                    │
└─────────────────────────────────────┘
```

#### 1.7. Анализ качества
```javascript
// После генерации батча
analyzeBatchPages(batchId) {
  // Читает tmp/batch-html-paths.json
  // Считает слова в каждой странице
  // Собирает статистику:
  return {
    pagesGenerated: 6,
    avgWords: 3324,
    totalWords: 19943,
    samplePages: [...]
  };
}
```

#### 1.8. Автоматический деплой (опционально)
```javascript
// Если AUTO_DEPLOY=1
if (success > 0) {
  // HTTP POST к дашборду
  await fetch('http://localhost:3030/api/local-deploy', {
    method: 'POST',
    body: JSON.stringify({ batchId, force: true })
  });
}
```

---

### ШАГ 2: Git commit + push

#### 2.1. Автоматический коммит (через дашборд)
```javascript
// POST /api/local-deploy
app.post('/api/local-deploy', async (req, res) => {
  // 1. Проверка качества
  if (!force && (avgWords < 2000 || pagesGenerated < 5)) {
    return res.json({ ok: false, error: 'quality_check_failed' });
  }
  
  // 2. Git add
  execSync('git add public/semantic-pages/');
  
  // 3. Git commit
  execSync(`git commit -m "Add ${pagesGenerated} SEO pages (batch ${batchId})"`);
  
  // 4. Git push
  execSync('git push origin main');
  
  // 5. Обновление статуса
  batch.deployed = true;
  batch.deployedAt = new Date().toISOString();
});
```

#### 2.2. Ручной коммит (если нужно)
```bash
cd /Users/dmitrii/Desktop/website

# Проверить изменения
git status

# Добавить страницы
git add public/semantic-pages/

# Коммит
git commit -m "Add 30 new DMV title pages"

# Push
git push origin main
```

---

### ШАГ 3: Vercel auto-deploy

#### 3.1. Триггер деплоя
```
Git push → GitHub webhook → Vercel
```

#### 3.2. Vercel build process
```yaml
# vercel.json
{
  "builds": [
    {
      "src": "public/**",
      "use": "@vercel/static"
    },
    {
      "src": "api/*.js",
      "use": "@vercel/node"
    }
  ]
}
```

#### 3.3. Build steps
```bash
# 1. Clone repo
Cloning github.com/iunakov1991-alt/vintrusted (Branch: main, Commit: 701845c)

# 2. Install dependencies
npm ci

# 3. Run build (skip SEO generation)
npm run vercel-build
# → "SEO pages are generated locally on Mac via Monster 7.1 dashboard. Skipping build-time generation."

# 4. Compile API functions
Compiling "api/*.js" from ESM to CommonJS...

# 5. Deploy outputs
Deploying outputs...

# 6. Create build cache
Creating build cache...

# 7. Done!
Deployment completed
```

#### 3.4. Deploy time
```
Total: ~30-40 секунд
- Clone: 2-3s
- Build: 12s
- Deploy: 8s
- Cache: 35s
```

---

### ШАГ 4: Production

#### 4.1. URL структура
```
https://vintrusted.com/
  ├── en/dmv-titles/ca/title-types/checklist/
  ├── en/dmv-titles/tx/title-types/checklist/
  ├── es/dmv-titles/ca/title-types/checklist/
  └── ...
```

#### 4.2. Файловая структура
```
public/
└── semantic-pages/
    ├── en/
    │   └── dmv-titles/
    │       ├── ca/title-types/checklist/index.html
    │       ├── tx/title-types/checklist/index.html
    │       └── ...
    └── es/
        └── dmv-titles/
            ├── ca/title-types/checklist/index.html
            └── ...
```

#### 4.3. Vercel routing
```javascript
// Автоматически:
/en/dmv-titles/ca/title-types/checklist
  → public/semantic-pages/en/dmv-titles/ca/title-types/checklist/index.html

// С кэшированием:
Cache-Control: public, max-age=3600
```

---

## 📊 Полная схема с деталями

```
┌──────────────────────────────────────────────────────────────┐
│                    ЛОКАЛЬНАЯ ГЕНЕРАЦИЯ (Mac M1)              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Dashboard UI (localhost:3030)                           │
│     └─> Показывает фазу, прогресс, статистику              │
│                                                              │
│  2. Определение фазы                                        │
│     └─> detectCurrentPhase() → PHASE1_DMV_CORE             │
│                                                              │
│  3. Генерация очереди                                       │
│     └─> generatePhaseQueue() → topics_queue.json           │
│         - Фильтр по языку (EN для Phase 1)                 │
│         - Фильтр по зоне (dmv_titles)                       │
│         - Фильтр по штатам (CA, TX, FL, NY, AZ, NV)        │
│         - Рандомизация                                      │
│         - Берет 20-30 топиков                               │
│                                                              │
│  4. Запуск батча                                            │
│     └─> build_topics_batch_parallel.js                      │
│         - Параллельность: 5 воркеров                        │
│         - Для каждого топика:                               │
│           ┌──────────────────────────────────┐             │
│           │ a) build_topic_page.sh           │             │
│           │    └─> Bash wrapper              │             │
│           │                                   │             │
│           │ b) generate_blocks_from_topic.js │             │
│           │    - Читает topic.*.json         │             │
│           │    - Вызывает DeepSeek API       │             │
│           │    - Создает блоки контента      │             │
│           │    - Сохраняет *.blocks.json     │             │
│           │                                   │             │
│           │ c) render_article_from_blocks.js │             │
│           │    - Читает *.blocks.json        │             │
│           │    - Рендерит HTML               │             │
│           │    - Добавляет навигацию         │             │
│           │    - Добавляет SEO meta          │             │
│           │    - Сохраняет index.html        │             │
│           └──────────────────────────────────┘             │
│         - Время: ~90 сек/страница                           │
│         - Speedup: 4.5x (5 параллельно)                     │
│                                                              │
│  5. Сбор HTML путей                                         │
│     └─> tmp/batch-html-paths.json                          │
│         ["/semantic-pages/en/dmv-titles/ca/...", ...]      │
│                                                              │
│  6. Анализ качества                                         │
│     └─> analyzeBatchPages()                                 │
│         - Читает HTML файлы                                 │
│         - Считает слова                                     │
│         - Собирает статистику:                              │
│           {                                                  │
│             pagesGenerated: 6,                              │
│             avgWords: 3324,                                 │
│             totalWords: 19943,                              │
│             samplePages: [...]                              │
│           }                                                  │
│                                                              │
│  7. Обновление дашборда                                     │
│     └─> data/local_batch_state.json                        │
│         - Сохраняет статус батча                            │
│         - История всех батчей                               │
│         - Метрики производительности                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                      GIT COMMIT + PUSH                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Автоматически (если AUTO_DEPLOY=1):                       │
│                                                              │
│  1. Quality check                                           │
│     └─> if (avgWords < 2000) → reject                      │
│     └─> if (pagesGenerated < 5) → reject                   │
│                                                              │
│  2. Git add                                                 │
│     └─> git add public/semantic-pages/                     │
│                                                              │
│  3. Git commit                                              │
│     └─> git commit -m "Add 6 SEO pages (batch xyz)"       │
│                                                              │
│  4. Git push                                                │
│     └─> git push origin main                               │
│                                                              │
│  5. Update batch status                                     │
│     └─> batch.deployed = true                              │
│     └─> batch.deployedAt = "2025-12-10T..."               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                     VERCEL AUTO-DEPLOY                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Trigger: Git push → GitHub webhook → Vercel                │
│                                                              │
│  1. Clone repository                                        │
│     └─> git clone github.com/.../vintrusted                │
│     └─> Branch: main                                        │
│     └─> Commit: 701845c2                                    │
│     └─> Time: ~2-3s                                         │
│                                                              │
│  2. Restore build cache                                     │
│     └─> From previous deployment                            │
│     └─> Time: ~1s                                           │
│                                                              │
│  3. Install dependencies                                    │
│     └─> npm ci                                              │
│     └─> Time: ~1s (cached)                                  │
│                                                              │
│  4. Run build                                               │
│     └─> npm run vercel-build                               │
│     └─> Output: "Skipping build-time generation"          │
│     └─> Time: ~1s                                           │
│                                                              │
│  5. Compile API functions                                   │
│     └─> api/*.js → ESM to CommonJS                         │
│     └─> Time: ~5s                                           │
│                                                              │
│  6. Build output                                            │
│     └─> /vercel/output/                                     │
│         ├── static/ (HTML, CSS, JS)                         │
│         └── functions/ (API endpoints)                      │
│     └─> Time: ~12s                                          │
│                                                              │
│  7. Deploy to CDN                                           │
│     └─> Upload to Vercel Edge Network                      │
│     └─> Global distribution                                 │
│     └─> Time: ~8s                                           │
│                                                              │
│  8. Create build cache                                      │
│     └─> For next deployment                                 │
│     └─> Time: ~35s                                          │
│                                                              │
│  Total time: ~30-40 seconds                                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                    PRODUCTION (vintrusted.com)               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  URL: https://vintrusted.com/en/dmv-titles/ca/...          │
│                                                              │
│  1. CDN Edge Network                                        │
│     └─> Vercel Global CDN                                   │
│     └─> Cache: public, max-age=3600                        │
│     └─> HTTPS: Auto SSL                                     │
│                                                              │
│  2. Static HTML serving                                     │
│     └─> public/semantic-pages/.../index.html               │
│     └─> Instant load                                        │
│     └─> No server-side rendering                            │
│                                                              │
│  3. SEO optimization                                        │
│     └─> Meta tags                                           │
│     └─> Structured data (JSON-LD)                          │
│     └─> Sitemap integration                                 │
│     └─> Internal linking                                    │
│                                                              │
│  4. Analytics                                               │
│     └─> Vercel Analytics                                    │
│     └─> Google Analytics (if configured)                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔢 Метрики производительности

### Локальная генерация:
```
Один топик:      ~90 секунд
Батч (6 топиков): ~95 секунд (5 параллельно)
Speedup:         4.5x vs sequential
Workers:         5 параллельных
```

### Git операции:
```
git add:    ~1 секунда
git commit: ~1 секунда
git push:   ~2-3 секунды
Total:      ~5 секунд
```

### Vercel deploy:
```
Clone:      2-3 секунды
Build:      12 секунд
Deploy:     8 секунд
Cache:      35 секунд
Total:      ~40 секунд
```

### End-to-end:
```
Генерация:  95 секунд
Git:        5 секунд
Vercel:     40 секунд
Total:      ~140 секунд (2.5 минуты)
```

---

## 📁 Ключевые файлы

### Локальная генерация:
```
scripts/monster8_local_dashboard_server.js  ← Дашборд сервер
scripts/build_topics_batch_parallel.js      ← Батч генератор
scripts/build_topic_page.sh                 ← Wrapper для генерации
scripts/generate_blocks_from_topic.js       ← AI генерация блоков
scripts/render_article_from_blocks.js       ← HTML рендеринг
scripts/generate-dmv-topics.js              ← Генератор топиков
```

### Конфигурация:
```
data/topics_queue.json                      ← Очередь топиков
data/local_batch_state.json                 ← Состояние батчей
data/topic.*.json                           ← Файлы топиков (1,007 шт)
.env.local                                  ← API ключи (DeepSeek)
```

### UI:
```
public/local-batch-dashboard.html           ← Дашборд UI
```

### Vercel:
```
vercel.json                                 ← Конфигурация деплоя
api/*.js                                    ← Serverless functions
```

### Output:
```
public/semantic-pages/                      ← Сгенерированные страницы
  ├── en/dmv-titles/.../index.html
  └── es/dmv-titles/.../index.html
```

---

## 🎯 Текущий статус

### Топики:
- **Создано:** 1,007 топиков
- **В очереди:** 30 (Phase 1)
- **Обработано:** 10+

### Страницы:
- **На проде:** 10 страниц
- **EN:** 7 страниц (чистая структура)
- **ES:** 3 страницы (полный контент)

### Прогресс:
- **Phase 1 target:** 5,000 страниц
- **Текущий прогресс:** 0.2% (10/5,000)
- **Осталось:** 4,990 страниц

---

## 🚀 Как запустить новый батч

### Через UI (рекомендуется):
```
1. Открыть: http://localhost:3030/local-batch-dashboard.html
2. Нажать: "Start New Batch"
3. Выбрать: phase=auto, length=auto
4. Дождаться завершения (~2-3 минуты)
5. Автоматический деплой на Vercel
```

### Через API:
```bash
curl -X POST http://localhost:3030/api/local-start \
  -H "Content-Type: application/json" \
  -d '{"phase":"auto","length":"auto"}'
```

### Вручную:
```bash
cd /Users/dmitrii/Desktop/website
export $(cat .env.local | grep -v '^#' | xargs)
node scripts/build_topics_batch_parallel.js --mode prod
```

---

**Документация актуальна на:** 2025-12-10  
**Версия системы:** Monster 8.0



