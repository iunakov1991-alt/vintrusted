# MONSTER 8.0 — Автоматический деплой после генерации

## 🚀 Обзор

После завершения каждого батча генерации страниц система **автоматически деплоит** изменения на Vercel **без ручного вмешательства**.

## 📋 Как это работает

### 1. Генерация страниц
```bash
# Оркестратор генерирует страницы
node scripts/build_topics_batch_parallel.js --mode prod
```

### 2. Извлечение путей к HTML
```javascript
// Из stdout скрипта build_topic_page.sh:
// "Page built → /Users/.../public/semantic-pages/en/dmv/ca/title-types/index.html"

const match = stdout.match(/Page built → .*\/(public\/[^\s]+\.html)/);
if (match) {
  htmlPath = '/' + match[1].replace('public/', '').replace('/index.html', '');
}
// Результат: "/semantic-pages/en/dmv/ca/title-types"
```

### 3. Сохранение путей
```javascript
// Оркестратор сохраняет все пути в файл
const htmlPaths = results.filter(r => r.success && r.htmlPath).map(r => r.htmlPath);
fs.writeFileSync('tmp/batch-html-paths.json', JSON.stringify(htmlPaths));
```

### 4. Автоматический деплой
```javascript
// После успешной генерации (success > 0):
const postData = JSON.stringify({ 
  batchId: process.env.BATCH_ID,
  force: true  // Пропускаем проверку качества
});

http.request({
  hostname: 'localhost',
  port: 3030,
  path: '/api/local-deploy',
  method: 'POST'
});
```

### 5. Vercel деплой
```bash
# Дашборд выполняет:
cd /Users/dmitrii/Desktop/website
vercel --prod --yes

# Результат:
# ✅ Production: https://your-site.vercel.app [1m 23s]
```

### 6. Обновление статуса
```javascript
// Дашборд обновляет историю батча:
{
  "id": "2025-12-09T15-28-52-223Z",
  "status": "success",
  "pagesGenerated": 6,
  "avgWords": 1234,
  "deployed": true,
  "deployedAt": "2025-12-09T15:30:00.000Z",
  "deployUrl": "https://your-site.vercel.app"
}
```

## 🔧 Технические детали

### Передача Batch ID
```javascript
// monster8_local_dashboard_server.js
const child = spawn('node', ['build_topics_batch_parallel.js'], {
  env: {
    ...process.env,
    BATCH_ID: record.id  // Передаем ID батча
  }
});
```

### HTTP запрос к дашборду
```javascript
// build_topics_batch_parallel.js
const batchId = process.env.BATCH_ID || new Date().toISOString();
const postData = JSON.stringify({ batchId, force: true });

const req = http.request({
  hostname: 'localhost',
  port: 3030,
  path: '/api/local-deploy',
  method: 'POST'
});

req.write(postData);
req.end();
```

### Vercel CLI
```javascript
// monster8_local_dashboard_server.js
const vercel = spawn('vercel', ['--prod', '--yes'], {
  cwd: path.join(__dirname, '..'),
  stdio: ['ignore', 'pipe', 'pipe']
});

vercel.stdout.on('data', chunk => {
  const match = chunk.toString().match(/https:\/\/[^\s]+/);
  if (match) deployUrl = match[0];
});
```

## 📊 Мониторинг в дашборде

### История батчей
```
┌─────────────────────────────────────────────────────────────┐
│ Batch History                                               │
├─────────────────────────────────────────────────────────────┤
│ 2025-12-09 15:28:52                                         │
│ Phase: PHASE1_DMV_CORE                                      │
│ Status: ✅ success                                          │
│ Pages: 6 (avg 1234 words)                                  │
│ Deploy: ✓ Deployed at 15:30:00                             │
│                                                             │
│ [Show 6 pages ▼]                                            │
│   • /semantic-pages/en/dmv/ca/title-types (1245 words)     │
│   • /semantic-pages/en/dmv/tx/title-types (1223 words)     │
│   • ...                                                     │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Преимущества

1. **Нет ручного деплоя** — всё автоматически после генерации
2. **Мгновенная публикация** — страницы сразу в production
3. **Полная прозрачность** — видно когда и что задеплоено
4. **Ссылки на страницы** — можно сразу проверить результат
5. **Статистика** — среднее количество слов, количество страниц

## 🔍 Логи

### Оркестратор
```
[BATCH] Saved 6 HTML paths to tmp/batch-html-paths.json
[DEPLOY] Starting automatic deployment via dashboard API...
[DEPLOY] ✅ Automatic deployment completed
[DEPLOY] 🌐 Live at: https://your-site.vercel.app
```

### Дашборд
```
[batch-analysis] Found 6 HTML paths from orchestrator
[batch-analysis] Found 6 pages, avg 1234 words, total 7404 words
[deploy] Starting Vercel deployment for batch 2025-12-09T15-28-52-223Z
[deploy] ✅ Deployed to https://your-site.vercel.app
```

## ⚙️ Конфигурация

### Отключить автодеплой (если нужно)
```javascript
// build_topics_batch_parallel.js
// Закомментировать блок:
// if (success > 0) {
//   console.log("\n[DEPLOY] Starting automatic deployment...");
//   ...
// }
```

### Изменить порог качества
```javascript
// monster8_local_dashboard_server.js
app.post('/api/local-quality-check', (req, res) => {
  const MIN_AVG_WORDS = 500;  // Изменить здесь
  const MIN_PAGES = 1;        // Минимум страниц
});
```

## 🚨 Troubleshooting

### Деплой не происходит
```bash
# Проверить что дашборд запущен:
curl http://localhost:3030/api/local-status

# Проверить логи батча:
tail -f logs/local_batch_*.log

# Проверить логи деплоя:
tail -f logs/deploy_*.log
```

### Vercel CLI не установлен
```bash
npm install -g vercel
vercel login
```

### Нет прав на деплой
```bash
# Залогиниться в Vercel:
vercel login

# Проверить проект:
vercel --prod --yes
```

## 📝 Итого

**Полностью автоматический пайплайн:**
1. Генерация → 2. Анализ → 3. Деплой → 4. Мониторинг

**Без ручного вмешательства, с полной прозрачностью!** 🎉













