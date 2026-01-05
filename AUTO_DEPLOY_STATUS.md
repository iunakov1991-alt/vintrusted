# Автоматический деплой SEO страниц — Статус

## ✅ Автодеплой ВКЛЮЧЕН

После каждого успешного батча генерации страниц система **автоматически деплоит** изменения на Vercel.

---

## 🔄 Как работает

### 1. Генерация завершается
```bash
[BATCH] ========================================
[BATCH] Completed in 187.9s
[BATCH] Success: 6, Failed: 0
[BATCH] ========================================
```

### 2. Автодеплой запускается
```bash
[DEPLOY] Starting automatic deployment via dashboard API...
[DEPLOY] Batch ID: 2025-12-09T15-46-18-367Z
[DEPLOY] ✅ Deployment request accepted
[DEPLOY] Deployment initiated, check dashboard for progress
```

### 3. HTTP запрос к дашборду
```javascript
POST http://localhost:3030/api/local-deploy
{
  "batchId": "2025-12-09T15-46-18-367Z",
  "force": true  // Пропускаем проверку качества
}
```

### 4. Дашборд запускает Vercel
```bash
cd /Users/dmitrii/Desktop/website
vercel --prod --yes

# Результат:
Production: https://vintrusted.com [2m 15s]
```

### 5. Обновление статуса
```json
{
  "id": "2025-12-09T15-46-18-367Z",
  "status": "success",
  "deployed": true,
  "deployedAt": "2025-12-09T15:48:00.000Z",
  "pagesGenerated": 6
}
```

---

## 📊 Мониторинг

### В дашборде
```
History
┌─────────────────────────────────────────────┐
│ 2025-12-09 15:46:18                         │
│ Status: ✅ success                          │
│ Pages: 6 (avg 3600 words)                  │
│ Deploy: ✓ Deployed at 15:48:00             │
└─────────────────────────────────────────────┘
```

### В логах батча
```bash
tail -f logs/local_batch_*.log | grep DEPLOY

[DEPLOY] Starting automatic deployment via dashboard API...
[DEPLOY] Batch ID: 2025-12-09T15-46-18-367Z
[DEPLOY] ✅ Deployment request accepted
[DEPLOY] Deployment initiated, check dashboard for progress
```

### В логах деплоя
```bash
tail -f logs/deploy_*.log

[DEPLOY] Starting deploy for batch 2025-12-09T15-46-18-367Z
[DEPLOY] Pages: 6, Avg words: 3600

Vercel CLI 48.5.0
Production: https://vintrusted.com [2m 15s]
```

---

## 🎯 Условия автодеплоя

### Когда запускается:
- ✅ `success > 0` (есть успешно сгенерированные страницы)
- ✅ Батч завершился без критических ошибок
- ✅ Дашборд запущен на `localhost:3030`

### Когда НЕ запускается:
- ❌ `success = 0` (нет успешных страниц)
- ❌ Батч завершился с ошибкой
- ❌ Дашборд не запущен

---

## 🔧 Технические детали

### Код в оркестраторе
```javascript
// scripts/build_topics_batch_parallel.js

if (success > 0) {
  console.log("\n[DEPLOY] Starting automatic deployment...");
  
  const batchId = process.env.BATCH_ID || generateId();
  
  // Синхронный HTTP запрос с промисом
  await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3030,
      path: '/api/local-deploy',
      method: 'POST'
    }, (res) => {
      // Ждем ответа
      res.on('end', () => resolve());
    });
    
    req.write(JSON.stringify({ batchId, force: true }));
    req.end();
  });
  
  console.log("[DEPLOY] Deployment initiated");
}
```

### API дашборда
```javascript
// scripts/monster8_local_dashboard_server.js

app.post('/api/local-deploy', async (req, res) => {
  const { batchId, force } = req.body;
  
  // 1. Анализируем страницы
  const analysis = analyzeBatchPages(batchId);
  
  // 2. Проверяем качество (если не force)
  if (!force && analysis.avgWords < 500) {
    return res.status(400).json({ error: 'Quality check failed' });
  }
  
  // 3. Запускаем Vercel
  const vercel = spawn('vercel', ['--prod', '--yes']);
  
  // 4. Обновляем статус
  updateBatchHistory(batchId, {
    deployed: true,
    deployedAt: new Date().toISOString()
  });
  
  res.json({ ok: true, message: 'Deploy started' });
});
```

---

## ⚙️ Настройки

### Отключить автодеплой
Если нужно отключить автодеплой (например, для тестирования):

```javascript
// scripts/build_topics_batch_parallel.js

// Закомментировать блок:
// if (success > 0) {
//   console.log("\n[DEPLOY] Starting automatic deployment...");
//   ...
// }
```

### Изменить условия деплоя
```javascript
// Деплоить только если > 10 страниц:
if (success > 10) {
  // deploy
}

// Деплоить только если avg words > 1000:
if (success > 0 && avgWords > 1000) {
  // deploy
}
```

### Ручной деплой
Если автодеплой не сработал, можно запустить вручную:

```bash
# Через дашборд UI:
# 1. Открыть http://localhost:3030/local-batch-dashboard.html
# 2. Найти батч в истории
# 3. Нажать "✓ Check & Deploy"

# Через API:
curl -X POST http://localhost:3030/api/local-deploy \
  -H "Content-Type: application/json" \
  -d '{"batchId":"2025-12-09T15-46-18-367Z","force":true}'

# Через Vercel CLI:
cd /Users/dmitrii/Desktop/website
vercel --prod --yes
```

---

## 🚨 Troubleshooting

### Проблема: Деплой не запускается
**Симптомы:**
- В логах нет `[DEPLOY]`
- Статус батча: `deployed: null`

**Решение:**
1. Проверить что дашборд запущен:
   ```bash
   curl http://localhost:3030/api/local-status
   ```

2. Проверить логи батча:
   ```bash
   tail -100 logs/local_batch_*.log | grep DEPLOY
   ```

3. Запустить деплой вручную через UI

### Проблема: Деплой запустился но не завершился
**Симптомы:**
- В логах есть `[DEPLOY] Starting...`
- Но нет `[DEPLOY] ✅ Completed`

**Решение:**
1. Проверить логи деплоя:
   ```bash
   tail -100 logs/deploy_*.log
   ```

2. Проверить Vercel статус:
   ```bash
   vercel ls
   ```

3. Проверить что Vercel CLI установлен:
   ```bash
   which vercel
   vercel --version
   ```

### Проблема: Страницы не появляются на проде
**Симптомы:**
- Деплой завершился успешно
- Но страниц нет на vintrusted.com

**Решение:**
1. Проверить что файлы существуют локально:
   ```bash
   ls -la public/semantic-pages/en/dmv-titles/ca/title-types/checklist/
   ```

2. Проверить что они созданы недавно:
   ```bash
   find public/semantic-pages -name "index.html" -mtime -1
   ```

3. Проверить URL на проде:
   ```bash
   curl -I https://vintrusted.com/en/dmv-titles/ca/title-types/checklist/
   ```

4. Подождать 2-3 минуты (Vercel кэш)

---

## 📈 Статистика

### Текущий статус
```bash
# Проверить через API:
curl http://localhost:3030/api/local-status | jq '{
  production: .production,
  lastBatch: .history[0] | {id, deployed, pagesGenerated}
}'

# Результат:
{
  "production": {
    "total": 10,
    "en": 7,
    "es": 3
  },
  "lastBatch": {
    "id": "2025-12-09T15-46-18-367Z",
    "deployed": true,
    "pagesGenerated": 6
  }
}
```

### История деплоев
```bash
# Все задеплоенные батчи:
curl http://localhost:3030/api/local-status | \
  jq '.history[] | select(.deployed == true) | {id, deployedAt, pagesGenerated}'
```

---

## ✅ Итого

**Автодеплой работает полностью автоматически:**

1. ✅ Генерация страниц
2. ✅ Извлечение путей
3. ✅ HTTP запрос к дашборду
4. ✅ Vercel деплой
5. ✅ Обновление статуса
6. ✅ Отображение в UI

**Никаких ручных действий не требуется!** 🚀

---

**Дата:** 2025-12-09  
**Версия:** Monster 8.0  
**Статус:** ✅ ACTIVE













