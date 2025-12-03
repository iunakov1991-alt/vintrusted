# 📚 MONSTER 7.0 — ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ API

## 🔗 Базовый URL

```
http://localhost:3000/api
```

---

## 📊 Статус и мониторинг

### Получить статус системы

```bash
curl http://localhost:3000/api/status
```

**Ответ:**
```json
{
  "status": "running",
  "memory": {
    "heapUsed": 256,
    "heapTotal": 512,
    "rss": 1024,
    "percent": 4
  },
  "tasks": {
    "total": 5,
    "running": 1,
    "completed": 3,
    "failed": 1
  },
  "performance": {
    "cpuUser": 0.5,
    "cpuSystem": 0.2,
    "uptime": 3600
  },
  "isRunning": false,
  "timestamp": 1701234567890
}
```

### Получить историю метрик

```bash
curl http://localhost:3000/api/metrics?limit=20
```

### Получить последние логи

```bash
curl http://localhost:3000/api/logs?limit=50
```

---

## 🚀 Управление

### Запустить полный цикл

```bash
curl -X POST http://localhost:3000/api/start \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "vintrusted.com",
    "forceRefresh": false
  }'
```

### Остановить все задачи

```bash
curl -X POST http://localhost:3000/api/stop
```

### Запустить отдельный модуль

```bash
# Semantic Scanner
curl -X POST http://localhost:3000/api/module/semanticScanner \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "vintrusted.com",
    "fromDashboard": true
  }'

# Strategy Generator
curl -X POST http://localhost:3000/api/module/strategyGenerator \
  -H "Content-Type: application/json" \
  -d '{
    "semanticMap": {...},
    "fromDashboard": true
  }'
```

---

## 📋 Задачи

### Получить все задачи

```bash
curl http://localhost:3000/api/tasks
```

### Получить статус задачи

```bash
curl http://localhost:3000/api/task/task_1234567890_abc123
```

---

## 📊 Отчеты

### Экспортировать отчет

```bash
# JSON
curl -X POST http://localhost:3000/api/export-report \
  -H "Content-Type: application/json" \
  -d '{
    "results": {...},
    "format": "json"
  }'

# HTML
curl -X POST http://localhost:3000/api/export-report \
  -H "Content-Type: application/json" \
  -d '{
    "results": {...},
    "format": "html"
  }'

# Markdown
curl -X POST http://localhost:3000/api/export-report \
  -H "Content-Type: application/json" \
  -d '{
    "results": {...},
    "format": "markdown"
  }'
```

### Получить список отчетов

```bash
curl http://localhost:3000/api/reports
```

---

## 🧠 База знаний

### Инициализировать базу знаний

```bash
curl -X POST http://localhost:3000/api/init-knowledge
```

**Ответ:**
```json
{
  "success": true,
  "message": "Knowledge base initialized",
  "path": "./data/knowledge/knowledge-base.jsonl"
}
```

---

## 💬 Human Feedback Loop

### Отправить обратную связь

```bash
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Should we change the content strategy?",
    "answer": "Yes, focus on E-E-A-T signals",
    "context": {
      "module": "strategyGenerator",
      "quality": 0.65
    }
  }'
```

---

## 📝 Примеры использования в JavaScript

### Node.js

```javascript
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

// Получить статус
async function getStatus() {
  const response = await fetch(`${API_BASE}/status`);
  const data = await response.json();
  console.log('Status:', data);
}

// Запустить цикл
async function startCycle() {
  const response = await fetch(`${API_BASE}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      domain: 'vintrusted.com',
      fromDashboard: true
    })
  });
  const data = await response.json();
  console.log('Cycle started:', data);
}

// Получить метрики
async function getMetrics() {
  const response = await fetch(`${API_BASE}/metrics?limit=20`);
  const data = await response.json();
  console.log('Metrics:', data);
}
```

### Browser (JavaScript)

```javascript
const API_BASE = '/api';

// Получить статус
async function getStatus() {
  const response = await fetch(`${API_BASE}/status`);
  const data = await response.json();
  console.log('Status:', data);
  return data;
}

// Запустить цикл
async function startCycle() {
  const response = await fetch(`${API_BASE}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      domain: 'vintrusted.com',
      fromDashboard: true
    })
  });
  const data = await response.json();
  console.log('Cycle started:', data);
  return data;
}

// Экспортировать отчет
async function exportReport(results, format = 'json') {
  const response = await fetch(`${API_BASE}/export-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      results,
      format
    })
  });
  const data = await response.json();
  console.log('Report exported:', data);
  return data;
}
```

---

## 🔄 WebSocket (Real-time обновления)

```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:3000');

// События задач
socket.on('task:started', (task) => {
  console.log('Task started:', task);
});

socket.on('task:running', (task) => {
  console.log('Task running:', task);
});

socket.on('task:completed', (task) => {
  console.log('Task completed:', task);
});

socket.on('task:failed', (task) => {
  console.log('Task failed:', task);
});

// События цикла
socket.on('cycle:step', (step) => {
  console.log('Cycle step:', step);
});

socket.on('cycle:completed', (results) => {
  console.log('Cycle completed:', results);
});

socket.on('cycle:failed', (error) => {
  console.log('Cycle failed:', error);
});
```

---

## ⚠️ Важно

Все запросы к модулям должны включать `fromDashboard: true`:

```json
{
  "fromDashboard": true,
  ...
}
```

Без этого флага запросы будут отклонены.

---

## 📚 Дополнительная информация

- Полная документация: `README.md`
- Архитектура: `MONSTER_7.0_ARCHITECTURE.md`
- Быстрый старт: `MONSTER_7.0_QUICKSTART.md`

