# 🚀 РУКОВОДСТВО ПО ЗАПУСКУ ПО СТРАТЕГИИ

## 📊 ОПРЕДЕЛЕНИЕ ТЕКУЩЕЙ ФАЗЫ

### Фаза 1: `en_only` (EN < 100 страниц)
**Цель:** Быстро нарастить базу английского контента

**Характеристики:**
- Генерируем только EN контент
- ES не включается до достижения 100 EN страниц
- Максимальная скорость генерации EN

**Параметры:**
```bash
export EN_THRESHOLD_FOR_ES=100
export ES_HARD_MIN=50
export DEFAULT_DAY_WORKERS=10
export DEFAULT_NIGHT_WORKERS=6
export MONSTER8_BPG=1  # Фоновая подготовка EN
```

---

### Фаза 2: `mixed` (EN >= 100, ES < 50)
**Цель:** Начать наращивание ES контента

**Характеристики:**
- Основной батч: EN (продолжаем рост)
- Фоновая подготовка: ES (30% от EN)
- Балансировка двух языков

**Параметры:**
```bash
export EN_THRESHOLD_FOR_ES=100
export ES_HARD_MIN=50
export ES_START_RATIO=30  # 30% ES в фоне
export DEFAULT_DAY_WORKERS=10
export DEFAULT_NIGHT_WORKERS=6
export MONSTER8_BPG=1
```

---

### Фаза 3: `es_focus` (ES >= 50)
**Цель:** Полноценный двуязычный контент

**Характеристики:**
- Основной батч: ES (приоритет)
- Фоновая подготовка: баланс EN/ES
- Оба языка развиваются параллельно

**Параметры:**
```bash
export ES_HARD_MIN=50
export MONSTER8_BPG=1
export DEFAULT_DAY_WORKERS=10
export DEFAULT_NIGHT_WORKERS=6
```

---

## ⚙️ РЕЖИМЫ ДЛИНЫ

### Day Mode (6:00 - 22:00): `short`
- Короткий контент (быстрее генерация)
- Больше воркеров (10)
- Быстрый рост количества страниц

### Night Mode (22:00 - 6:00): `long`
- Длинный контент (качественнее)
- Меньше воркеров (6)
- Фокус на качестве

**Автоматически определяется по времени суток**

---

## 🎯 ПОШАГОВЫЙ ЗАПУСК

### Шаг 1: Проверка текущего состояния
```bash
# Подсчет страниц
EN_PAGES=$(find public/semantic-pages/en -type f -name 'index.html' 2>/dev/null | wc -l | tr -d ' ')
ES_PAGES=$(find public/semantic-pages/es -type f -name 'index.html' 2>/dev/null | wc -l | tr -d ' ')

echo "EN: $EN_PAGES, ES: $ES_PAGES"
```

### Шаг 2: Определение фазы
```bash
if [ "$EN_PAGES" -lt 100 ]; then
  PHASE="en_only"
elif [ "$ES_PAGES" -lt 50 ]; then
  PHASE="mixed"
else
  PHASE="es_focus"
fi
```

### Шаг 3: Настройка параметров
```bash
# Базовые параметры
export EN_THRESHOLD_FOR_ES=100
export ES_HARD_MIN=50
export ES_START_RATIO=30

# Воркеры
export DEFAULT_DAY_WORKERS=10
export DEFAULT_NIGHT_WORKERS=6
export MIN_WORKERS=2

# BPG (фоновая подготовка)
export MONSTER8_BPG=1

# Latency защита
export MONSTER8_LATENCY_HARD_MAX=4.0

# Ночной режим
export NIGHT_START_HOUR=22
export NIGHT_END_HOUR=6
```

### Шаг 4: Запуск оркестратора
```bash
./monster8_orchestrator.sh
```

---

## 📋 БЫСТРЫЙ СТАРТ

### Для начала работы (EN < 100):
```bash
export EN_THRESHOLD_FOR_ES=100
export ES_HARD_MIN=50
export DEFAULT_DAY_WORKERS=10
export MONSTER8_BPG=1
./monster8_orchestrator.sh
```

### Для смешанной фазы (EN >= 100, ES < 50):
```bash
export EN_THRESHOLD_FOR_ES=100
export ES_START_RATIO=30
export MONSTER8_BPG=1
./monster8_orchestrator.sh
```

### Для ES фокуса (ES >= 50):
```bash
export MONSTER8_BPG=1
./monster8_orchestrator.sh
```

---

## 🔍 МОНИТОРИНГ

### Через дашборд:
1. Откройте: http://localhost:3001
2. Проверьте:
   - Текущую фазу (Language Phase)
   - Количество страниц (EN/ES)
   - Статус BPG
   - Режим длины (Length Mode)

### Через логи:
```bash
tail -f logs/orchestrator.log
```

---

## ⚠️ ВАЖНЫЕ ЗАМЕЧАНИЯ

1. **Пороги можно настроить:**
   - `EN_THRESHOLD_FOR_ES` - когда включать ES (по умолчанию 100)
   - `ES_HARD_MIN` - минимальный ES для полноценной фазы (по умолчанию 50)

2. **BPG (Background Prep):**
   - Готовит блоки в фоне
   - Ускоряет основной батч (fast mode)
   - Рекомендуется включить (`MONSTER8_BPG=1`)

3. **Latency защита:**
   - Если DeepSeek > 4 сек - батч не запустится
   - Адаптивные воркеры при высокой latency

4. **Автоматическое определение:**
   - Фаза определяется автоматически
   - Режим длины определяется по времени
   - Воркеры адаптируются к latency

---

## 🎯 РЕКОМЕНДАЦИИ

### Для быстрого старта:
- Начните с `en_only` фазы
- Используйте 10 воркеров днем
- Включите BPG для ускорения

### Для качества:
- Используйте `long` режим ночью
- Меньше воркеров (6) для стабильности
- Мониторьте latency

### Для баланса:
- Переходите в `mixed` при 100+ EN страниц
- Настройте `ES_START_RATIO=30`
- Параллельно развивайте оба языка

---

## ✅ ЧЕКЛИСТ ПЕРЕД ЗАПУСКОМ

- [ ] Проверены текущие страницы (EN/ES)
- [ ] Определена фаза стратегии
- [ ] Настроены параметры окружения
- [ ] Проверены очереди (`topics_queue.en.json`, `topics_queue.es.json`)
- [ ] Проверены next очереди (для BPG)
- [ ] Настроен API ключ (DEEPSEEK_API_KEY)
- [ ] Проверена latency API
- [ ] Запущен дашборд (опционально)

---

**Готово к запуску! 🚀**

