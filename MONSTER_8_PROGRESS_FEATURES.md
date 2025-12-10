# MONSTER 8.0 — ПРОГРЕСС-БАР И ВЫПАДАЮЩИЙ СПИСОК СТРАНИЦ

**Дата:** 2025-12-09  
**Статус:** ✅ Реализовано  

---

## 📊 REAL-TIME ПРОГРЕСС-БАР

### Что добавлено:

**Визуальный прогресс-бар** с анимацией, который показывает:
1. **Процент выполнения** (0-100%)
2. **Количество топиков** (выполнено / запланировано)
3. **Обратный отсчет времени** (⏱️ Xm Ys left)

### Как работает:

```
[████████████░░░░░░░░] 67%
4 / 6 topics  ⏱️ 1m 45s left
```

**Алгоритм расчета:**
1. **Progress:** `(topicsDone / topicsPlanned) × 100`
2. **Estimated Time Left:**
   - Вычисляем среднее время на 1 топик: `elapsed / topicsDone`
   - Умножаем на оставшиеся топики: `avgTime × (topicsPlanned - topicsDone)`
   - Конвертируем в минуты и секунды

### Обновление:

- **Автоматически** каждые 5 секунд (через `/api/local-status`)
- **Real-time** при завершении каждого топика (через `/api/local-progress`)

---

## ⏱️ ОБРАТНЫЙ ОТСЧЕТ ВРЕМЕНИ

### Отображение:

```
⏱️ 2m 15s left  - Осталось 2 минуты 15 секунд
⏱️ 45s left     - Осталось 45 секунд
⏱️ -            - Нет данных (первый топик еще не завершен)
```

### Точность:

- **Первый топик:** Нет оценки (нужны данные)
- **Второй топик:** Грубая оценка (на основе 1 топика)
- **Третий+ топик:** Точная оценка (среднее по всем завершенным)

### Адаптация:

Оценка **автоматически корректируется** по мере выполнения:
- Если топики генерируются быстрее → время уменьшается
- Если топики генерируются медленнее → время увеличивается

---

## 📋 ВЫПАДАЮЩИЙ СПИСОК СТРАНИЦ

### Что добавлено:

**Expandable список** всех сгенерированных страниц с:
1. **Быстрые ссылки** (первые 3 страницы)
2. **Кнопка "Show all X"** для раскрытия полного списка
3. **Количество слов** для каждой страницы

### Отображение:

**Свернутый вид:**
```
🔗 🔗 🔗  ▼ Show all 6
```

**Развернутый вид:**
```
🔗 🔗 🔗  ▲ Show all 6

/semantic-pages/en/dmv/ca/title-types (1,245 words)
/semantic-pages/en/dmv/tx/title-types (1,198 words)
/semantic-pages/en/dmv/fl/title-types (1,267 words)
/semantic-pages/en/dmv/ny/title-types (1,189 words)
/semantic-pages/en/dmv/az/title-types (1,234 words)
/semantic-pages/en/dmv/nv/title-types (1,271 words)
```

### Взаимодействие:

- **Клик на ссылку** → открывает страницу в новой вкладке
- **Клик на "Show all"** → раскрывает/сворачивает список
- **Стрелка** меняется: ▼ → ▲

---

## 🚀 СТАТУС ДЕПЛОЯ

### Что добавлено:

**Индикатор статуса деплоя** с временем:

```
✓ Deployed at 07:15:23  - Задеплоено в 7:15:23
✓ Check & Deploy        - Готово к деплою (кнопка)
```

### Workflow:

```
success → ✓ Check & Deploy → Quality Check → Deploy → ✓ Deployed at HH:MM:SS
```

---

## 🎯 API ENDPOINTS

### 1. `/api/local-progress` (POST)

**Назначение:** Обновление прогресса батча (вызывается из оркестратора)

**Request:**
```json
{
  "topicsDone": 4
}
```

**Response:**
```json
{
  "ok": true,
  "progress": 67,
  "estimatedTimeLeft": 105
}
```

### 2. `/api/local-status` (GET)

**Назначение:** Получение полного статуса (включая прогресс)

**Response:**
```json
{
  "ok": true,
  "current": {
    "id": "2025-12-09T15-28-52-223Z",
    "status": "running",
    "progress": 67,
    "topicsDone": 4,
    "topicsPlanned": 6,
    "estimatedTimeLeft": 105,
    "updatedAt": "2025-12-09T15:30:15.123Z"
  }
}
```

---

## 🔧 ИНТЕГРАЦИЯ С ОРКЕСТРАТОРОМ

### Автоматическая отправка прогресса:

В `scripts/build_topics_batch_parallel.js` добавлен код:

```javascript
// После каждого батча топиков
const topicsDone = i + batch.length;
spawn('node', ['scripts/report_progress.js', String(topicsDone)], {
  stdio: 'ignore',
  detached: true
}).unref();
```

### Скрипт `report_progress.js`:

```javascript
// Отправляет прогресс в локальный дашборд
const topicsDone = parseInt(process.argv[2], 10);
// POST http://localhost:3030/api/local-progress
// { "topicsDone": 4 }
```

**Преимущества:**
- ✅ Не блокирует оркестратор
- ✅ Работает асинхронно (detached)
- ✅ Игнорирует ошибки (если дашборд не запущен)

---

## 📊 СТРУКТУРА ДАННЫХ

### Current Batch (с прогрессом):

```json
{
  "id": "2025-12-09T15-28-52-223Z",
  "phase": "PHASE1_DMV_CORE",
  "status": "running",
  "topicsPlanned": 6,
  "topicsDone": 4,
  "progress": 67,
  "estimatedTimeLeft": 105,
  "startedAt": "2025-12-09T15:28:52.223Z",
  "updatedAt": "2025-12-09T15:30:15.123Z"
}
```

### Completed Batch (с страницами):

```json
{
  "id": "2025-12-09T15-28-52-223Z",
  "status": "success",
  "avgWords": 1234,
  "pagesGenerated": 6,
  "samplePages": [
    {
      "path": "/semantic-pages/en/dmv/ca/title-types",
      "words": 1245,
      "created": "2025-12-09T15:29:23.456Z"
    }
  ],
  "deployed": true,
  "deployedAt": "2025-12-09T15:35:00.000Z"
}
```

---

## 🎨 CSS СТИЛИ

### Progress Bar:

```css
.progress-container { margin: 12px 0; }
.progress-bar {
  width: 100%;
  height: 24px;
  background: #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4a67ff, #6b85ff);
  transition: width 0.3s ease;
  color: #fff;
  font-weight: 600;
}
```

### Timer:

```css
.timer {
  display: inline-block;
  padding: 4px 8px;
  background: #f0f0f0;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}
```

### Pages List:

```css
.pages-list {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}
.pages-list.expanded {
  max-height: 300px;
  overflow-y: auto;
}
```

---

## 🚨 TROUBLESHOOTING

### Проблема: Прогресс не обновляется

**Причины:**
1. Оркестратор не вызывает `report_progress.js`
2. Дашборд не запущен на порту 3030
3. Ошибка в скрипте `report_progress.js`

**Решение:**
```bash
# 1. Проверить что дашборд запущен
curl http://localhost:3030/api/local-status

# 2. Проверить логи оркестратора
tail -50 logs/local_batch_<id>.log | grep progress

# 3. Вручную отправить прогресс
node scripts/report_progress.js 3
```

### Проблема: Время "left" показывает "-"

**Причина:** Первый топик еще не завершен (нет данных для оценки)

**Решение:** Подождать завершения первого топика

### Проблема: Список страниц пустой

**Причина:** Страницы не найдены или созданы до старта батча

**Решение:** Проверить `analyzeBatchPages()` в серверном коде

---

## 📈 ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ

### 1. Мониторинг прогресса через API:

```bash
# Каждые 5 секунд
watch -n 5 'curl -s http://localhost:3030/api/local-status | jq ".current | {progress, topicsDone, topicsPlanned, estimatedTimeLeft}"'
```

**Вывод:**
```json
{
  "progress": 67,
  "topicsDone": 4,
  "topicsPlanned": 6,
  "estimatedTimeLeft": 105
}
```

### 2. Вручную обновить прогресс:

```bash
node scripts/report_progress.js 5
```

### 3. Раскрыть список страниц:

```javascript
// В браузере (DevTools Console)
togglePages('pages-0')  // Раскрыть первый батч в истории
```

---

## 🎯 ROADMAP

### Возможные улучшения:

1. **График прогресса** (chart.js)
   - Визуализация скорости генерации
   - История прогресса по времени

2. **Уведомления**
   - Push-уведомления при завершении батча
   - Email при ошибках

3. **Детальная статистика**
   - Среднее время на топик
   - Самый быстрый/медленный топик
   - Распределение по словам

4. **Экспорт данных**
   - CSV экспорт истории батчей
   - JSON экспорт статистики

---

**Статус:** ✅ Все возможности реализованы и работают!

**Следующий шаг:** Запустить батч и наблюдать real-time прогресс! 🚀

