# 🚀 MONSTER 7.1 — БЫСТРЫЙ СТАРТ

## ✅ ЧТО ГОТОВО

Monster 7.1 (Phi-3 TRIZ Edition) полностью реализован и готов к использованию!

### Архитектура:
- ✅ Генерация по секциям (принцип "Дробление")
- ✅ Батчи и очередь задач (принцип "Динамичность")
- ✅ Лёгкий Knowledge Core (принцип "Использование ресурсов")
- ✅ Разделение на Ядро и Надстройки (принцип "Отделение")

### Модули:
- ✅ SectionedContentGenerator — генерация по секциям
- ✅ TaskQueue — очередь задач с паузой/возобновлением
- ✅ LightKnowledgeCore — лёгкий Knowledge Core
- ✅ OrchestratorCore — упрощённый оркестратор
- ✅ Все модули ядра (Semantic Scanner, Strategy Generator, Prompt Engine, Quality Score)

### Дашборд:
- ✅ Обновлённый сервер с поддержкой батчей
- ✅ UI с прогресс-баром для батчей
- ✅ Кнопки Пауза / Возобновление
- ✅ Отображение текущей задачи
- ✅ Статистика: completed/total/failed

---

## 🚀 ЗАПУСК

### 1. Проверка системы

```bash
# Проверить, что Ollama установлен
ollama --version

# Проверить, что модель phi3 загружена
ollama list | grep phi3
```

Если модель не загружена:
```bash
ollama pull phi3
```

### 2. Запуск дашборда Monster 7.1

```bash
npm run monster:start:7.1
```

Дашборд откроется на: **http://localhost:3000/monster-ui**

### 3. Использование дашборда

1. **Нажмите "СТАРТ"** — запустится полный цикл генерации
2. **Наблюдайте прогресс** — прогресс-бар показывает completed/total/failed
3. **Используйте "ПАУЗА"** — приостановить обработку батча
4. **Используйте "ВОЗОБНОВИТЬ"** — продолжить обработку
5. **Используйте "СТОП"** — остановить все задачи

---

## 📊 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ

### Производительность:
- **1 страница:** 5-10 минут (10-15 AI-вызовов по секциям)
- **Батч (20 страниц):** 2-3 часа
- **Использование памяти:** < 4GB

### Качество:
- **Слов на страницу:** > 3000
- **Секций:** 8-12
- **FAQ вопросов:** 10-15
- **Quality Score:** > 0.8

---

## 🧪 ТЕСТИРОВАНИЕ

### Тест генерации одной страницы:

```bash
node monster-7.1/test/generate-single-page.js
```

Этот скрипт:
- Генерирует одну страницу по секциям
- Показывает статистику (слова, секции, таблицы, FAQ)
- Сохраняет страницу в `public/seo-pages/vin-check-test/`

---

## 📁 СТРУКТУРА ФАЙЛОВ

```
monster-7.1/
├── core/
│   ├── orchestrator-core.js              ✅ Упрощённый оркестратор
│   ├── modules/
│   │   ├── content-generator-sectioned.js ✅ Генерация по секциям
│   │   ├── semantic-scanner-simple.js     ✅ Упрощённый сканер
│   │   ├── strategy-generator-basic.js    ✅ Базовый генератор
│   │   ├── prompt-engine-phi3.js          ✅ Промпты под Phi-3
│   │   └── quality-score-minimal.js       ✅ Минимальная оценка
│   ├── ai-knowledge-core/
│   │   └── knowledge-core-light.js       ✅ Лёгкий Knowledge Core
│   ├── utils/
│   │   └── task-queue.js                 ✅ Очередь задач
│   └── dashboard/
│       ├── server-7.1.js                 ✅ Сервер с батчами
│       └── ui/
│           ├── index-7.1.html            ✅ HTML с батчами
│           └── dashboard-7.1.js          ✅ JS для UI
├── test/
│   └── generate-single-page.js           ✅ Тестовый скрипт
└── config/
    └── monster-7.1.config.json          ✅ Конфиг Phi-3
```

---

## 🔧 КОНФИГУРАЦИЯ

### Основные настройки в `config/monster-7.1.config.json`:

```json
{
  "phi3Profile": {
    "maxInputTokens": 500,
    "maxOutputTokens": 1000,
    "callsPerPage": 15,
    "timeout": 60000
  },
  "batches": {
    "maxPagesPerRun": 20,
    "pauseEnabled": true,
    "resumeEnabled": true
  }
}
```

### Изменение размера батча:

Измените `maxPagesPerRun` в конфиге (рекомендуется: 20-50 для M1 8GB).

---

## 📝 ЛОГИ

Логи доступны в дашборде на вкладке "Логи" или через API:

```bash
curl http://localhost:3000/api/logs?limit=50
```

---

## 🐛 РЕШЕНИЕ ПРОБЛЕМ

### Проблема: "Ollama not available"
**Решение:**
```bash
# Установить Ollama
brew install ollama

# Запустить Ollama
ollama serve

# Загрузить модель
ollama pull phi3
```

### Проблема: "Module not found"
**Решение:**
```bash
# Убедитесь, что вы в корне проекта
cd /Users/dmitrii/Desktop/website

# Проверьте пути в конфиге
cat config/monster-7.1.config.json
```

### Проблема: Таймауты при генерации
**Решение:**
- Увеличьте `timeout` в `phi3Profile` (по умолчанию: 60000 мс = 1 минута)
- Уменьшите `maxOutputTokens` (по умолчанию: 1000)
- Проверьте нагрузку на систему (закройте другие приложения)

---

## 📚 ДОКУМЕНТАЦИЯ

- `MONSTER_7.1_TRIZ_ANALYSIS.md` — ТРИЗ-анализ с противоречиями и решениями
- `MONSTER_7.1_IMPLEMENTATION_PLAN.md` — План реализации
- `MONSTER_7.1_STATUS.md` — Текущий статус
- `GENERATION_PROCESS_PLAN.md` — План процесса генерации

---

## 🎯 СЛЕДУЮЩИЕ ШАГИ

1. **Протестировать генерацию одной страницы:**
   ```bash
   node monster-7.1/test/generate-single-page.js
   ```

2. **Запустить дашборд и протестировать батч:**
   ```bash
   npm run monster:start:7.1
   ```

3. **Проверить качество сгенерированных страниц**

4. **Оптимизировать промпты под Phi-3** (если нужно)

---

**Дата создания:** 2024-12-03  
**Версия:** Monster 7.1 (Phi-3 TRIZ Edition)  
**Статус:** Готов к использованию! 🚀











