# 📊 Dashboard & Deploy Flow - Что отображается

**URL:** http://localhost:3030/local-batch-dashboard.html  
**Дата:** 2025-12-10

---

## 🖥️ Интерфейс дашборда

```
┌────────────────────────────────────────────────────────────────┐
│                  Monster 8.0 — Local Dashboard                 │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Controls                                                  │ │
│  │                                                           │ │
│  │  Phase: [auto ▼]  Length: [auto ▼]  [START] [STOP]     │ │
│  │                                                           │ │
│  │  Result: {"ok": true, "id": "2025-12-10...", ...}       │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐ │
│  │ 📊 Current Phase        │  │ 🌐 Production Stats         │ │
│  │                         │  │                             │ │
│  │ Phase: PHASE1_DMV_CORE  │  │ Total: 10                   │ │
│  │ Description: EN only    │  │ EN: 7    ES: 3              │ │
│  │ Target: 5,000 pages     │  │                             │ │
│  │ Current: 10 pages       │  │ 🌐 Live on vintrusted.com   │ │
│  │ EN: 7    ES: 3          │  │                             │ │
│  └─────────────────────────┘  └─────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Current Batch                                             │ │
│  │                                                           │ │
│  │ ID: 2025-12-10T01-08-03-151Z                             │ │
│  │ Status: [running]                                         │ │
│  │ Phase: PHASE1_DMV_CORE                                    │ │
│  │ Language: en                                              │ │
│  │                                                           │ │
│  │ ┌────────────────────────────────────────────────────┐   │ │
│  │ │ Progress: ████████████████░░░░░░░░░░░░░░░░░░ 67%  │   │ │
│  │ └────────────────────────────────────────────────────┘   │ │
│  │ 20 / 30 topics    ⏱️ 3m 45s left                         │ │
│  │                                                           │ │
│  │ Started: 12/10/2025, 1:08:03 AM                          │ │
│  │ PID: 25301                                                │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ History                                                   │ │
│  │                                                           │ │
│  │ ┌───────────┬─────────┬────────┬────────┬──────────────┐ │ │
│  │ │ ID        │ Status  │ Phase  │ Length │ Started      │ │ │
│  │ ├───────────┼─────────┼────────┼────────┼──────────────┤ │ │
│  │ │ 2025-12-10│[success]│ PHASE1 │ auto   │ 12/10, 1:08 │ │ │
│  │ │ T00-58-00 │         │        │        │              │ │ │
│  │ │           │ 📊 6 pages, avg 3324 words               │ │ │
│  │ │           │ 🔗 🔗 🔗 ▼ Show all 6                    │ │ │
│  │ │           │ ✓ Deployed at 1:02 AM                    │ │ │
│  │ ├───────────┼─────────┼────────┼────────┼──────────────┤ │ │
│  │ │ 2025-12-10│[success]│ PHASE1 │ auto   │ 12/10, 0:29 │ │ │
│  │ │ T00-29-51 │         │        │        │              │ │ │
│  │ │           │ 📊 6 pages, avg 3600 words               │ │ │
│  │ │           │ ✓ Deployed at 0:33 AM                    │ │ │
│  │ └───────────┴─────────┴────────┴────────┴──────────────┘ │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Logs (live)                                               │ │
│  │                                                           │ │
│  │ [BATCH] Processing 30 topic(s)...                        │ │
│  │ [BATCH] Parallel workers: 5                              │ │
│  │ [BATCH] [2/30] Starting topic...                         │ │
│  │ [BATCH] [2/30] ✅ Completed in 94.1s                     │ │
│  │ [BATCH] [2/30] 📄 HTML: /semantic-pages/en/...          │ │
│  │ [BATCH] API push failed: 404                             │ │
│  │ [BATCH] Batch completed in 94.2s                         │ │
│  │ [QUALITY-ANALYSIS] Starting analysis...                  │ │
│  │ [QUALITY-ANALYSIS] Found 6 pages                         │ │
│  │ [QUALITY-ANALYSIS] Average score: 60.7%                  │ │
│  │ [DEPLOY] Starting automatic deployment...                │ │
│  │ [DEPLOY] Deployment initiated                            │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Процесс деплоя в дашборде

### 1. **До запуска батча**

```
┌─────────────────────────────────┐
│ Current Batch                   │
│                                 │
│ No current batch                │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ History                         │
│                                 │
│ 2025-12-10T00-58-00 [success]  │
│ ✓ Deployed at 1:02 AM          │
└─────────────────────────────────┘
```

---

### 2. **Нажатие START**

```
User clicks: [START]
  ↓
POST /api/local-start
  ↓
Dashboard показывает:
┌─────────────────────────────────┐
│ Result:                         │
│ {"ok": true,                    │
│  "id": "2025-12-10T01-08-03",  │
│  "phase": "PHASE1_DMV_CORE",   │
│  "topics": 30}                  │
└─────────────────────────────────┘
```

---

### 3. **Батч запущен (0%)**

```
┌─────────────────────────────────────────┐
│ Current Batch                           │
│                                         │
│ ID: 2025-12-10T01-08-03-151Z           │
│ Status: [running] ← синий pill         │
│ Phase: PHASE1_DMV_CORE                  │
│ Language: en                            │
│                                         │
│ ┌─────────────────────────────────┐    │
│ │ Progress: ░░░░░░░░░░░░░░░░░ 0% │    │
│ └─────────────────────────────────┘    │
│ 0 / 30 topics    ⏱️ - left            │
│                                         │
│ Started: 12/10/2025, 1:08:03 AM        │
│ PID: 25301                              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Logs (live)                             │
│                                         │
│ [BATCH] Processing 30 topic(s)...      │
│ [BATCH] Parallel workers: 5             │
│ [BATCH] Mode: prod                      │
│ [BATCH] Processing batch 1 (5 pages)...│
│ [BATCH] [2/30] Starting topic...       │
└─────────────────────────────────────────┘
```

---

### 4. **Генерация идет (17%)**

```
┌─────────────────────────────────────────┐
│ Current Batch                           │
│                                         │
│ ID: 2025-12-10T01-08-03-151Z           │
│ Status: [running]                       │
│ Phase: PHASE1_DMV_CORE                  │
│ Language: en                            │
│                                         │
│ ┌─────────────────────────────────┐    │
│ │ Progress: ███░░░░░░░░░░░░░ 17% │    │
│ └─────────────────────────────────┘    │
│ 5 / 30 topics    ⏱️ 7m 55s left       │
│                                         │
│ Started: 12/10/2025, 1:08:03 AM        │
│ PID: 25301                              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Logs (live) - обновляется каждые 3 сек │
│                                         │
│ [BATCH] [2/30] ✅ Completed in 94.1s   │
│ [BATCH] [2/30] 📄 HTML: /semantic...   │
│ [BATCH] [3/30] ✅ Completed in 94.1s   │
│ [BATCH] [4/30] ✅ Completed in 94.0s   │
│ [BATCH] [5/30] ✅ Completed in 94.1s   │
│ [BATCH] Batch completed in 94.2s        │
│ [BATCH] Processing batch 2 (5 pages)...│
│ [BATCH] [6/30] Starting topic...       │
└─────────────────────────────────────────┘
```

---

### 5. **Генерация завершена (100%)**

```
┌─────────────────────────────────────────┐
│ Current Batch                           │
│                                         │
│ ID: 2025-12-10T01-08-03-151Z           │
│ Status: [running] ← еще running        │
│ Phase: PHASE1_DMV_CORE                  │
│ Language: en                            │
│                                         │
│ ┌─────────────────────────────────┐    │
│ │ Progress: ████████████████ 100% │    │
│ └─────────────────────────────────┘    │
│ 30 / 30 topics    ⏱️ 0s left          │
│                                         │
│ Started: 12/10/2025, 1:08:03 AM        │
│ PID: 25301                              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Logs (live)                             │
│                                         │
│ [BATCH] [30/30] ✅ Completed           │
│ [BATCH] Success: 30, Failed: 0          │
│ [BATCH] Average page time: 94.1s        │
│ [BATCH] Speedup: 4.5x vs sequential     │
│ [BATCH] Saved 30 HTML paths             │
│                                         │
│ [QUALITY-ANALYSIS] Starting...          │
│ [QUALITY-ANALYSIS] Found 30 pages       │
│ [QUALITY-ANALYSIS] Analyzing...         │
└─────────────────────────────────────────┘
```

---

### 6. **Анализ качества**

```
┌─────────────────────────────────────────┐
│ Logs (live)                             │
│                                         │
│ [QUALITY-ANALYSIS] [1/30] Analyzing...  │
│ [QUALITY-ANALYSIS] ✅ Score: 65.2%      │
│ [QUALITY-ANALYSIS] [2/30] Analyzing...  │
│ [QUALITY-ANALYSIS] ✅ Score: 62.8%      │
│ ...                                     │
│ [QUALITY-ANALYSIS] Analyzed: 30/30      │
│ [QUALITY-ANALYSIS] Average score: 63.5% │
│ [QUALITY-ANALYSIS] ✅ Completed         │
└─────────────────────────────────────────┘
```

---

### 7. **Автоматический деплой начался**

```
┌─────────────────────────────────────────┐
│ Logs (live)                             │
│                                         │
│ [DEPLOY] Starting automatic deployment  │
│ [DEPLOY] Batch ID: 2025-12-10T01-08-03 │
│ [DEPLOY] Sending request to dashboard...│
│ [DEPLOY] Deployment initiated           │
│ [DEPLOY] Check dashboard for progress   │
│                                         │
│ [BATCH] API push failed: 404            │
└─────────────────────────────────────────┘
```

---

### 8. **Батч завершен, переходит в History**

```
┌─────────────────────────────────┐
│ Current Batch                   │
│                                 │
│ No current batch ← очистился   │
└─────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ History                                                 │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 2025-12-10T01-08-03 [success] ← зеленый pill       ││
│ │                                                     ││
│ │ 📊 30 pages, avg 3324 words ← статистика           ││
│ │                                                     ││
│ │ 🔗 🔗 🔗 ▼ Show all 30 ← ссылки на страницы       ││
│ │                                                     ││
│ │ [✓ Check & Deploy] ← кнопка если не задеплоено    ││
│ │                                                     ││
│ └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

### 9. **Деплой через дашборд (если нажать кнопку)**

```
User clicks: [✓ Check & Deploy]
  ↓
Confirm dialog: "Check quality and deploy batch?"
  ↓
POST /api/local-quality-check
  ↓
Response: {
  "ok": true,
  "pagesGenerated": 30,
  "avgWords": 3324,
  "passed": true
}
  ↓
POST /api/local-deploy
  ↓
Dashboard показывает:
┌─────────────────────────────────┐
│ Result:                         │
│ Quality check passed!           │
│ Deploying batch...              │
│ {"ok": true,                    │
│  "deployUrl": "https://..."}   │
└─────────────────────────────────┘
```

---

### 10. **Деплой в процессе (Git + Vercel)**

```
┌─────────────────────────────────────────┐
│ Logs (видны в терминале, не в UI)      │
│                                         │
│ [deploy] git add public/semantic-pages/ │
│ [deploy] git commit -m "Add 30 pages"  │
│ [deploy] git push origin main           │
│ [deploy] ✅ Pushed to GitHub            │
│                                         │
│ [vercel] Webhook received               │
│ [vercel] Cloning repository...          │
│ [vercel] Building...                    │
│ [vercel] Deploying...                   │
└─────────────────────────────────────────┘

Vercel Console (отдельно):
┌─────────────────────────────────────────┐
│ 22:30:11 Running build in iad1          │
│ 22:30:11 Cloning github.com/...         │
│ 22:30:14 Cloning completed: 2.6s        │
│ 22:30:15 Running "vercel build"         │
│ 22:30:17 Installing dependencies...     │
│ 22:30:18 Running "npm run vercel-build" │
│ 22:30:28 Build Completed [12s]          │
│ 22:30:29 Deploying outputs...           │
│ 22:30:37 Deployment completed           │
└─────────────────────────────────────────┘
```

---

### 11. **Деплой завершен**

```
┌─────────────────────────────────────────────────────────┐
│ History                                                 │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 2025-12-10T01-08-03 [success]                       ││
│ │                                                     ││
│ │ 📊 30 pages, avg 3324 words                         ││
│ │                                                     ││
│ │ 🔗 🔗 🔗 ▼ Show all 30                              ││
│ │                                                     ││
│ │ ✓ Deployed at 1:02 AM ← статус обновлен           ││
│ │                                                     ││
│ └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────┐
│ 🌐 Production Stats             │
│                                 │
│ Total: 40 ← обновилось!        │
│ EN: 37    ES: 3                 │
│                                 │
│ 🌐 Live on vintrusted.com       │
└─────────────────────────────────┘
```

---

### 12. **Раскрытие списка страниц**

```
User clicks: "▼ Show all 30"
  ↓
┌─────────────────────────────────────────────────────────┐
│ 🔗 🔗 🔗 ▲ Show all 30 ← стрелка вверх                 │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ /semantic-pages/en/dmv-titles/ca/... (3324 words)  ││
│ │ /semantic-pages/en/dmv-titles/tx/... (3521 words)  ││
│ │ /semantic-pages/en/dmv-titles/fl/... (3198 words)  ││
│ │ /semantic-pages/en/dmv-titles/ny/... (3445 words)  ││
│ │ ... (еще 26 страниц)                                ││
│ └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Что показывает каждый элемент

### **Current Phase & Strategy**
```javascript
{
  phase: "PHASE1_DMV_CORE",
  phaseDesc: "EN only, core DMV states",
  targetPages: 5000,
  totalPages: 10,
  enCount: 7,
  esCount: 3
}
```

**Отображается:**
- Текущая фаза стратегии
- Описание фазы
- Целевое количество страниц
- Текущее количество (EN/ES)

---

### **Production Stats**
```javascript
{
  total: 10,
  en: 7,
  es: 3,
  timestamp: "2025-12-10T..."
}
```

**Отображается:**
- Общее количество страниц на проде
- Разбивка по языкам
- Ссылка на vintrusted.com

**Источник:** API `https://vintrusted.com/api/seo-pages-count`

---

### **Current Batch**
```javascript
{
  id: "2025-12-10T01-08-03-151Z",
  status: "running",
  phase: "PHASE1_DMV_CORE",
  language: "en",
  topicsPlanned: 30,
  topicsDone: 5,
  progress: 17,
  estimatedTimeLeft: 477,
  startedAt: "2025-12-10T01:08:03.152Z",
  pid: 25301
}
```

**Отображается:**
- ID батча
- Статус (running/success/failed)
- Фаза и язык
- **Progress bar** с процентами
- **Countdown timer** (минуты:секунды)
- Количество обработанных топиков
- Время старта
- PID процесса

---

### **History**
```javascript
{
  id: "2025-12-10T00-58-00-451Z",
  status: "success",
  phase: "PHASE1_DMV_CORE",
  length: "auto",
  startedAt: "2025-12-10T00:58:00.451Z",
  finishedAt: "2025-12-10T01:01:10.591Z",
  pagesGenerated: 6,
  avgWords: 3324,
  totalWords: 19943,
  samplePages: [
    {
      path: "/semantic-pages/en/dmv-titles/ca/...",
      words: 3324,
      created: "2025-12-10T..."
    },
    ...
  ],
  deployed: true,
  deployedAt: "2025-12-10T01:02:13.665Z"
}
```

**Отображается:**
- ID батча (сокращенный)
- Статус (цветной pill)
- Статистика: количество страниц, средние слова
- Ссылки на первые 3 страницы
- Кнопка "Show all" для раскрытия полного списка
- Статус деплоя:
  - Если не задеплоено: кнопка `[✓ Check & Deploy]`
  - Если задеплоено: `✓ Deployed at HH:MM`

---

### **Logs (live)**
```
[BATCH] Processing 30 topic(s)...
[BATCH] [2/30] ✅ Completed in 94.1s
[QUALITY-ANALYSIS] Average score: 63.5%
[DEPLOY] Deployment initiated
```

**Обновляется:** Каждые 3 секунды  
**Источник:** `logs/local_batch_<id>.log`  
**Показывает:** Последние 200 строк

---

## 🎨 Цветовая схема

### Status Pills:
```
[running]  → Синий (#4a67ff)
[queued]   → Голубой (#3498db)
[success]  → Зеленый (#27ae60)
[failed]   → Красный (#e74c3c)
[stopped]  → Оранжевый (#f39c12)
[idle]     → Серый (#999)
```

### Progress Bar:
```
Фон:       #e0e0e0 (светло-серый)
Заполнение: linear-gradient(90deg, #4a67ff, #6b85ff)
Текст:     #fff (белый)
```

### Buttons:
```
START:  #4a67ff (синий)
STOP:   #e74c3c (красный)
Deploy: #27ae60 (зеленый)
```

---

## 🔄 Автообновление

### Интервалы:
```javascript
// Статус батча
setInterval(fetchStatus, 3000);  // Каждые 3 секунды

// Логи
setInterval(fetchLogs, 3000);    // Каждые 3 секунды

// Production stats
// Обновляется при каждом fetchStatus
```

### Что обновляется автоматически:
- ✅ Current Batch (статус, прогресс, таймер)
- ✅ History (новые батчи, статус деплоя)
- ✅ Production Stats (количество страниц)
- ✅ Logs (новые строки)
- ❌ Phase Info (только при перезагрузке)

---

## 📱 Responsive Design

```
Desktop (>1024px):
┌─────────────┬─────────────┐
│ Phase Info  │ Prod Stats  │
├─────────────┴─────────────┤
│ Current Batch             │
├───────────────────────────┤
│ History                   │
└───────────────────────────┘

Mobile (<768px):
┌───────────────────────────┐
│ Phase Info                │
├───────────────────────────┤
│ Prod Stats                │
├───────────────────────────┤
│ Current Batch             │
├───────────────────────────┤
│ History                   │
└───────────────────────────┘
```

---

## 🎯 Итого: Что видит пользователь

1. **Запуск батча** → Кнопка START → Результат в JSON
2. **Генерация** → Progress bar растет, таймер считает
3. **Логи** → Видны все этапы в реальном времени
4. **Завершение** → Батч переходит в History
5. **Статистика** → Показывает количество страниц, слова
6. **Ссылки** → Можно открыть любую сгенерированную страницу
7. **Деплой** → Кнопка или автоматически
8. **Production** → Счетчик обновляется после деплоя

**Все в одном окне, обновляется автоматически! 🎉**

---

**Документация актуальна на:** 2025-12-10  
**Dashboard URL:** http://localhost:3030/local-batch-dashboard.html








