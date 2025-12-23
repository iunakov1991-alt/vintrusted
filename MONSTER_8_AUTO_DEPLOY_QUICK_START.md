# MONSTER 8.0 — Автодеплой: Быстрый старт

## ✅ Что исправлено

### Проблема 1: Ссылки не выводились
**Было:** `pagesGenerated: 0`, нет ссылок на страницы  
**Стало:** Оркестратор извлекает пути из stdout и сохраняет в `tmp/batch-html-paths.json`

### Проблема 2: Нет автодеплоя
**Было:** После генерации нужно вручную деплоить  
**Стало:** Автоматический деплой через API дашборда сразу после генерации

## 🚀 Как работает

```
Генерация → Извлечение путей → Сохранение → Автодеплой → Vercel
   ↓              ↓                ↓             ↓          ↓
6 топиков    stdout parse    tmp/*.json    HTTP API   Production
```

## 📋 Запуск

```bash
# 1. Запустить дашборд
npm run monster:dashboard:local

# 2. Открыть в браузере
open http://localhost:3030/local-batch-dashboard.html

# 3. Нажать "Start New Batch"
# → Генерация начнется автоматически
# → После завершения - автоматический деплой
# → Ссылки на страницы появятся в истории
```

## 🎯 Результат в дашборде

```
┌─────────────────────────────────────────────────┐
│ ✅ Batch 2025-12-09T15-28-52-223Z               │
│ Phase: PHASE1_DMV_CORE                          │
│ Pages: 6 (avg 1234 words)                      │
│ Deploy: ✓ Deployed at 15:30:00                 │
│                                                 │
│ [Show 6 pages ▼]                                │
│   📄 /semantic-pages/en/dmv/ca/title-types      │
│      (1245 words)                               │
│   📄 /semantic-pages/en/dmv/tx/title-types      │
│      (1223 words)                               │
│   ...                                           │
└─────────────────────────────────────────────────┘
```

## 🔧 Технические изменения

### 1. Извлечение путей (`build_topics_batch_parallel.js`)
```javascript
// Парсим stdout от build_topic_page.sh
const match = stdout.match(/Page built → .*\/(public\/[^\s]+\.html)/);
if (match) {
  htmlPath = '/' + match[1].replace('public/', '').replace('/index.html', '');
}
resolve({ success: true, htmlPath });
```

### 2. Сохранение (`build_topics_batch_parallel.js`)
```javascript
// Сохраняем все пути в файл
const htmlPaths = results.filter(r => r.success && r.htmlPath).map(r => r.htmlPath);
fs.writeFileSync('tmp/batch-html-paths.json', JSON.stringify(htmlPaths));
```

### 3. Автодеплой (`build_topics_batch_parallel.js`)
```javascript
// HTTP запрос к дашборду
http.request({
  hostname: 'localhost',
  port: 3030,
  path: '/api/local-deploy',
  method: 'POST',
  body: JSON.stringify({ batchId: process.env.BATCH_ID, force: true })
});
```

### 4. Чтение путей (`monster8_local_dashboard_server.js`)
```javascript
// Читаем пути из файла
const htmlPaths = JSON.parse(fs.readFileSync('tmp/batch-html-paths.json'));

// Анализируем каждую страницу
for (const htmlPath of htmlPaths) {
  const html = fs.readFileSync(`public${htmlPath}/index.html`);
  const words = countWords(html);
  results.pages.push({ path: htmlPath, words });
}
```

### 5. Передача Batch ID (`monster8_local_dashboard_server.js`)
```javascript
// Передаем ID батча в оркестратор
const child = spawn('node', ['build_topics_batch_parallel.js'], {
  env: { ...process.env, BATCH_ID: record.id }
});
```

## 📊 Мониторинг

### Логи оркестратора
```bash
tail -f logs/local_batch_*.log
```

### Логи деплоя
```bash
tail -f logs/deploy_*.log
```

### Статус батча
```bash
curl http://localhost:3030/api/local-status | jq
```

## 🎉 Итого

**Теперь полностью автоматически:**
1. ✅ Генерация страниц
2. ✅ Извлечение путей
3. ✅ Подсчет слов
4. ✅ Автодеплой на Vercel
5. ✅ Отображение ссылок в дашборде

**Никаких ручных действий!** 🚀





