# 🚀 КАК ПОПАСТЬ В DASHBOARD MONSTER 7.0

## 📋 БЫСТРАЯ ИНСТРУКЦИЯ

### Шаг 1: Запуск Dashboard

Откройте терминал и выполните:

```bash
cd /Users/dmitrii/Desktop/website
npm run monster:start
```

Или напрямую:

```bash
node monster-7.1/core/dashboard/server-7.1.js
```

### Шаг 2: Открыть в браузере

После запуска откройте в браузере:

```
http://localhost:3000/monster-ui
```

Или просто:

```
http://localhost:3000
```

---

## 🔍 ПРОВЕРКА

### Проверить, запущен ли Dashboard:

```bash
lsof -i :3000
```

Если видите процесс Node.js на порту 3000 — Dashboard запущен.

### Проверить статус через API:

```bash
curl http://localhost:3000/api/status
```

---

## ⚠️ ВОЗМОЖНЫЕ ПРОБЛЕМЫ

### Порт 3000 занят

Если порт 3000 занят, измените порт в `config/monster.config.json`:

```json
{
  "dashboard": {
    "port": 3001
  }
}
```

Затем откройте:
```
http://localhost:3001/monster-ui
```

### Зависимости не установлены

```bash
npm install
```

### Ошибки при запуске

Проверьте логи в консоли. Убедитесь, что:
- Node.js установлен (v14+)
- Все зависимости установлены
- Конфигурация существует

---

## 🎯 ПОЛНАЯ ПОСЛЕДОВАТЕЛЬНОСТЬ

1. **Проверка системы:**
   ```bash
   npm run monster:check
   ```

2. **Запуск Dashboard:**
   ```bash
   npm run monster:start
   ```

3. **Открыть в браузере:**
   ```
   http://localhost:3000/monster-ui
   ```

4. **Инициализация базы знаний (первый раз):**
   - В Dashboard нажмите кнопку **INIT KNOWLEDGE**
   - Или через API:
     ```bash
     curl -X POST http://localhost:3000/api/init-knowledge
     ```

5. **Запуск первого цикла:**
   - В Dashboard нажмите кнопку **START**

---

## 📱 ДОСТУПНЫЕ URL

- **Dashboard UI:** `http://localhost:3000/monster-ui`
- **API Status:** `http://localhost:3000/api/status`
- **API Metrics:** `http://localhost:3000/api/metrics`
- **API Logs:** `http://localhost:3000/api/logs`

---

## ✅ ГОТОВО!

После выполнения этих шагов вы увидите Dashboard Monster 7.0 с:
- Панелью управления
- Метриками системы
- Прогрессом задач
- Результатами работы

