# 🎯 ОРКЕСТРАТОР — ПОЛНАЯ РЕАЛИЗАЦИЯ

**Дата:** 2025-12-06

---

## ✅ ВСЕ ФУНКЦИИ РЕАЛИЗОВАНЫ

### **1. BPG (Background Prep)** ✅

**Реализовано:**
- ✅ `--mode=background` в build_topics_batch.js
- ✅ `--delay-ms` (задержка между запросами)
- ✅ `--skip-render` (только генерация блоков без HTML)
- ✅ `--skip-validate` (опциональный пропуск валидации)
- ✅ `--length-mode` (short/long для настройки длины)
- ✅ `--lang` (фильтрация по языку)

**Использование в оркестраторе:**
```bash
node scripts/build_topics_batch.js \
  --queue=tmp/bpg_queue.json \
  --mode=background \
  --workers=1 \
  --delay-ms=240000 \
  --skip-render \
  --length-mode=long \
  --lang=en
```

**Как работает:**
- Генерирует блоки контента в фоне
- Не рендерит HTML (экономит время)
- Использует длинные блоки (long mode)
- Добавляет задержку между запросами (240 секунд)
- Сохраняет блоки в `tmp/*.blocks.json`

---

### **2. Fast mode** ✅

**Реализовано:**
- ✅ `--mode=fast` в build_topics_batch_parallel.js
- ✅ Логика использования precomputed blocks из BPG
- ✅ Пропуск LLM генерации, только validate + render

**Использование:**
```bash
node scripts/build_topics_batch_parallel.js \
  --queue=data/topics_queue.json \
  --mode=fast \
  --workers=10
```

**Как работает:**
- Проверяет наличие `tmp/*.blocks.json` файлов
- Если блоки есть → использует `--skip-gen` в build_topic_page.sh
- Пропускает LLM генерацию
- Выполняет только validate + render
- Значительно ускоряет генерацию страниц

**В оркестраторе:**
- Если `bpg_ready=1` → использует `--mode=fast`
- Если `bpg_ready=0` → использует `--mode=prod` (полная генерация)

---

### **3. Length mode влияние** ✅

**Реализовано:**
- ✅ `--length-mode` передается в батч-скрипты
- ✅ Влияет на длину контента через `build_article_spec.js`
- ✅ `short` → уменьшает длину на 30%
- ✅ `long` → увеличивает длину на 30%

**Использование:**
```bash
node scripts/build_topics_batch_parallel.js \
  --queue=data/topics_queue.json \
  --length-mode=short  # или long
```

**Как работает:**
- `LENGTH_MODE` передается в окружение
- `build_article_spec.js` читает `process.env.LENGTH_MODE`
- Применяет фактор к длине блоков:
  - `short` → `factor *= 0.7` (уменьшение на 30%)
  - `long` → `factor *= 1.3` (увеличение на 30%)

**В оркестраторе:**
- Day (6-22) → `length_mode=short`
- Night (22-6) → `length_mode=long`

---

### **4. Lang параметр** ✅

**Реализовано:**
- ✅ `--lang` передается в батч-скрипты
- ✅ Фильтрация топиков по языку
- ✅ Автоматическая проверка `topic.language`

**Использование:**
```bash
node scripts/build_topics_batch_parallel.js \
  --queue=data/topics_queue.json \
  --lang=en  # или es
```

**Как работает:**
- Читает `topic.language` из каждого топика
- Пропускает топики с другим языком
- Обрабатывает только указанный язык

**В оркестраторе:**
- Определяется автоматически по фазе:
  - `en_only` → `lang=en`
  - `mixed` → `lang=en` (основной батч)
  - `es_focus` → `lang=es`

---

## 📋 ПОЛНЫЙ СПИСОК ПАРАМЕТРОВ

### **build_topics_batch.js**

```bash
--queue <path>              # Путь к очереди топиков
--mode <mode>               # prod|background|ensemble
--qa-mode <mode>            # deepseek|ollama|none
--delay-ms <ms>             # Задержка между элементами (для background)
--skip-render               # Пропустить рендеринг HTML
--skip-validate             # Пропустить валидацию блоков
--length-mode <mode>        # short|long
--lang <lang>               # en|es (фильтр)
--workers <n>               # Количество воркеров (для background)
--stop-on-error             # Остановить при ошибке
```

### **build_topics_batch_parallel.js**

```bash
--queue <path>              # Путь к очереди топиков
--mode <mode>               # prod|fast|ensemble
--qa-mode <mode>            # deepseek|ollama|none
--workers <n>               # Количество параллельных воркеров
--length-mode <mode>        # short|long
--lang <lang>               # en|es (фильтр)
--stop-on-error             # Остановить при ошибке
```

### **build_topic_page.sh**

```bash
<topic_file>                # Путь к топику
--skip-gen                  # Использовать существующие блоки
```

**Переменные окружения:**
- `SKIP_RENDER=1` → пропустить рендеринг
- `SKIP_VALIDATE=1` → пропустить валидацию
- `LENGTH_MODE=short|long` → режим длины

---

## 🔄 ПОЛНЫЙ ЦИКЛ РАБОТЫ

### **1. BPG (Background Prep)**

```bash
# Оркестратор запускает BPG в фоне:
node scripts/build_topics_batch.js \
  --queue=tmp/bpg_queue.json \
  --mode=background \
  --workers=1 \
  --delay-ms=240000 \
  --skip-render \
  --length-mode=long \
  --lang=en

# Результат: блоки сохранены в tmp/*.blocks.json
```

### **2. Основной батч (Fast mode)**

```bash
# Если BPG готов, используем fast mode:
node scripts/build_topics_batch_parallel.js \
  --queue=data/topics_queue.json \
  --mode=fast \
  --workers=10 \
  --length-mode=short \
  --lang=en

# Результат: страницы сгенерированы из precomputed blocks
```

### **3. Основной батч (Prod mode)**

```bash
# Если BPG не готов, используем prod mode:
node scripts/build_topics_batch_parallel.js \
  --queue=data/topics_queue.json \
  --mode=prod \
  --workers=10 \
  --length-mode=short \
  --lang=en

# Результат: полная генерация через LLM
```

---

## 🎯 ИТОГ

**Все функции реализованы и работают:**

- ✅ **BPG (Background Prep)** — полная реализация
- ✅ **Fast mode** — использование precomputed blocks
- ✅ **Length mode** — влияние на длину контента
- ✅ **Lang параметр** — фильтрация по языку

**Оркестратор полностью функционален!**

---

## 📝 ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ

### **Запуск оркестратора:**

```bash
export MONSTER8_BPG=1
export EN_THRESHOLD_FOR_ES=100
export NIGHT_START_HOUR=22
export NIGHT_END_HOUR=6

./monster8_orchestrator.sh
```

### **Ручной запуск BPG:**

```bash
node scripts/build_topics_batch.js \
  --queue=data/topics_queue_next.en.json \
  --mode=background \
  --workers=1 \
  --delay-ms=240000 \
  --skip-render \
  --length-mode=long \
  --lang=en
```

### **Ручной запуск Fast mode:**

```bash
node scripts/build_topics_batch_parallel.js \
  --queue=data/topics_queue.json \
  --mode=fast \
  --workers=10 \
  --length-mode=short \
  --lang=en
```

---

**Все готово к продакшену! 🚀**

