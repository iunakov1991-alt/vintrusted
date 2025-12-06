# 📋 MONSTER 7.1 — СХЕМА СОЗДАНИЯ СТРАНИЦЫ (ОТ НАЧАЛА ДО ПРОДАКШЕНА)

**Версия:** Monster 7.1 (Phi-3 TRIZ Edition)  
**Дата:** 2025-12-03

---

## 🎯 ОБЩИЙ ПРОЦЕСС (5 ЭТАПОВ)

```
[1] Semantic Scanner → [2] Strategy Generator → [3] Prompt Engine → [4] Content Generator → [5] Quality Score
                                                                              ↓
                                                                        [СОХРАНЕНИЕ]
                                                                              ↓
                                                                        [ПРОДАКШЕН]
```

---

## 📝 ДЕТАЛЬНАЯ СХЕМА ПО ПУНКТАМ

### **ЭТАП 1: SEMANTIC SCANNER** (Семантическое сканирование)

**Модуль:** `semantic-scanner-simple.js`  
**Время:** ~1-2 секунды  
**Цель:** Определить, какие страницы уже есть и какие нужно создать

#### Шаги:

1. **Сканирование существующих страниц**
   ```
   📁 public/seo-pages/
   ├── vin-check-0/          ← Сканируется
   ├── accident-check-1/     ← Сканируется
   └── ...
   ```

2. **Извлечение метаданных**
   - Чтение `index.html` из каждой директории
   - Извлечение `<title>` и `<h1>`
   - Сохранение slug и пути

3. **Анализ покрытия тем**
   - Извлечение тем из заголовков
   - Подсчёт уникальных тем
   - Определение покрытия

4. **Определение пробелов (gaps)**
   - Сравнение с базовыми интентами:
     - `vin_check`
     - `accident_check`
     - `ownership_history`
     - `market_value`
     - `dmv_records`
     - `title_brand`
     - `odometer_rollback`
     - `theft_records`
   - Выявление отсутствующих интентов

5. **Формирование Semantic Map**
   ```json
   {
     "existing": 5,
     "coverage": {
       "themes": ["vin", "accident", ...],
       "count": 12
     },
     "gaps": {
       "intents": ["market_value", "odometer_rollback"],
       "count": 2
     }
   }
   ```

**Результат:** Semantic Map с пробелами для заполнения

---

### **ЭТАП 2: STRATEGY GENERATOR** (Генерация стратегии)

**Модуль:** `strategy-generator-basic.js`  
**Время:** ~1 секунда  
**Цель:** Создать список приоритетов для генерации страниц

#### Шаги:

1. **Получение Semantic Map**
   - Принимает результат от Semantic Scanner
   - Извлекает `gaps.intents`

2. **Генерация приоритетов**
   - Для каждого интента из gaps создаётся приоритет:
     ```javascript
     {
       type: 'market_value',
       theme: 'Market Value',
       intent: 'market_value',
       keywords: ['market value', 'car value', 'vehicle price', 'car worth'],
       pages: 1,
       priority: 'high' // или 'medium'
     }
     ```

3. **Ограничение количества**
   - Максимум страниц: `maxPages` (по умолчанию 1000)
   - Для батча: первые 20 приоритетов

4. **Формирование стратегии**
   ```json
   {
     "priorities": [
       {
         "type": "market_value",
         "theme": "Market Value",
         "intent": "market_value",
         "keywords": ["market value", "car value", ...],
         "pages": 1,
         "priority": "high"
       },
       ...
     ],
     "targetPages": 20,
     "timestamp": "2025-12-03T..."
   }
   ```

**Результат:** Список приоритетов для генерации

---

### **ЭТАП 3: PROMPT ENGINE** (Генерация промптов)

**Модуль:** `prompt-engine-phi3.js`  
**Время:** ~1-2 секунды на приоритет  
**Цель:** Создать оптимизированные промпты под Phi-3 для каждого приоритета

#### Шаги:

1. **Обработка каждого приоритета**
   - Для каждого приоритета из стратегии

2. **Построение базового промпта**
   ```
   Write ONE section of an SEO article about "Market Value".
   
   Topic: Market Value
   Intent: market_value
   Keywords: market value, car value, vehicle price, car worth
   
   Requirements:
   - Expert-level content
   - 300-500 words
   - Include examples and data
   - Professional tone
   - Markdown format
   ```

3. **Обогащение знаниями (опционально)**
   - Загрузка релевантных знаний из Knowledge Core
   - Обрезка до 30% от maxInputTokens (150 токенов)
   - Добавление к базовому промпту

4. **Обрезка до лимита**
   - Максимум: `maxInputTokens` (500 токенов)
   - ~2000 символов (4 символа на токен)

5. **Формирование промптов**
   ```json
   [
     {
       "priority": "market_value",
       "prompt": "Write ONE section...",
       "context": {
         "theme": "Market Value",
         "intent": "market_value",
         "keywords": [...]
       }
     },
     ...
   ]
   ```

**Результат:** Массив промптов для генерации контента

---

### **ЭТАП 4: CONTENT GENERATOR** (Генерация контента по секциям)

**Модуль:** `content-generator-sectioned.js`  
**Время:** 5-10 минут на страницу  
**Цель:** Сгенерировать полную HTML-страницу по секциям

#### Шаги:

#### **4.1. Генерация введения (Introduction)**

1. **Создание промпта для введения**
   ```
   Section type: introduction
   Section index: 0
   Topic: Market Value
   Keywords: market value, car value, vehicle price, car worth
   ```

2. **AI-вызов к API**
   - Провайдер: DeepSeek API
   - Input: ~500 токенов
   - Output: ~1000 токенов
   - Timeout: 25-30 секунд

3. **Парсинг ответа**
   ```json
   {
     "heading": "Understanding Market Value",
     "content": "Market value is the estimated price..."
   }
   ```

4. **Сохранение секции**
   ```javascript
   {
     type: 'main',
     heading: 'Understanding Market Value',
     content: 'Market value is the estimated price...'
   }
   ```

**Время:** ~30-60 секунд

---

#### **4.2. Генерация основных секций (8-12 секций)**

**Повторяется 10 раз** (среднее между 8 и 12):

1. **Создание промпта для секции**
   ```
   Section type: main
   Section index: 1, 2, 3, ..., 10
   Topic: Market Value
   ```

2. **AI-вызов к Phi-3**
   - Аналогично введению
   - Каждая секция: 300-500 слов

3. **Парсинг и сохранение**
   - Парсинг JSON ответа
   - Добавление в массив секций

**Время:** ~30-60 секунд на секцию × 10 = **5-10 минут**

**Пример секций:**
```
1. Introduction (введение)
2. What is Market Value? (что такое рыночная стоимость)
3. Factors Affecting Market Value (факторы влияния)
4. How to Calculate Market Value (как рассчитать)
5. Market Value vs. Trade-In Value (сравнение)
6. Market Value by Vehicle Type (по типам)
7. Regional Market Value Differences (региональные различия)
8. Market Value Trends (тренды)
9. Tips for Maximizing Market Value (советы)
10. Common Market Value Mistakes (ошибки)
11. Conclusion (заключение)
```

---

#### **4.3. Генерация таблиц (2-3 таблицы)**

**Повторяется 2 раза:**

1. **Создание промпта для таблицы**
   ```
   Create a Markdown table about "Market Value" for type "table-0".
   
   Requirements:
   - 3-5 columns
   - 5-8 rows
   - Clear headers
   - Relevant data
   ```

2. **AI-вызов к Phi-3**
   - Output: ~600 токенов
   - Формат: JSON с headers и rows

3. **Парсинг таблицы**
   ```json
   {
     "title": "Market Value by Vehicle Age",
     "headers": ["Age", "Depreciation %", "Market Value"],
     "rows": [
       ["0-1 year", "20%", "$30,000"],
       ["1-3 years", "40%", "$24,000"],
       ...
     ]
   }
   ```

4. **Сохранение таблицы**
   ```javascript
   {
     type: 'table',
     title: 'Market Value by Vehicle Age',
     headers: [...],
     rows: [...]
   }
   ```

**Время:** ~30-60 секунд на таблицу × 2 = **1-2 минуты**

---

#### **4.4. Генерация FAQ (10-15 вопросов)**

**Генерируется блоками по 5 вопросов:**

1. **Создание промпта для FAQ блока**
   ```
   Generate 5 FAQ questions and answers about "Market Value".
   
   Requirements:
   - Questions: Clear, common, relevant
   - Answers: 100-200 words each
   - Include examples
   ```

2. **AI-вызов к Phi-3**
   - Output: ~1200 токенов (5 вопросов × ~240 токенов)

3. **Парсинг FAQ**
   ```json
   {
     "questions": [
       {
         "q": "What is market value?",
         "a": "Market value is the estimated price..."
       },
       {
         "q": "How is market value calculated?",
         "a": "Market value is calculated based on..."
       },
       ...
     ]
   }
   ```

4. **Повторение для остальных вопросов**
   - Всего: 12 вопросов
   - Блоков: 3 (по 5 вопросов, последний 2 вопроса)

**Время:** ~1-2 минуты на блок × 3 = **3-6 минут**

**Пример FAQ:**
```
1. What is market value?
2. How is market value calculated?
3. What factors affect market value?
4. How does market value differ from trade-in value?
5. Can market value change over time?
6. How accurate are market value estimates?
7. Should I use market value for insurance?
8. How does mileage affect market value?
9. What is the difference between market value and retail price?
10. How can I increase my vehicle's market value?
11. Do market values vary by location?
12. How often should I check my vehicle's market value?
```

---

#### **4.5. Сборка HTML страницы (локально, без AI)**

**Метод:** `buildPage()`  
**Время:** ~0.1 секунды  
**Цель:** Объединить все части в готовую HTML-страницу

1. **Генерация метаданных**
   ```javascript
   title: "Market Value - Complete Guide | VINTrusted"
   h1: "Complete Guide to Market Value"
   metaDescription: "Learn everything about Market Value..."
   ```

2. **Рендеринг HTML**
   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
       <meta charset="UTF-8">
       <title>Market Value - Complete Guide | VINTrusted</title>
       <meta name="description" content="...">
   </head>
   <body>
       <h1>Complete Guide to Market Value</h1>
       
       <!-- Секции -->
       <section>
           <h2>Understanding Market Value</h2>
           <p>Market value is the estimated price...</p>
       </section>
       ...
       
       <!-- Таблицы -->
       <table>
           <thead>...</thead>
           <tbody>...</tbody>
       </table>
       ...
       
       <!-- FAQ -->
       <section class="faq">
           <h2>Frequently Asked Questions</h2>
           <div>
               <h3>What is market value?</h3>
               <p>Market value is the estimated price...</p>
           </div>
           ...
       </section>
   </body>
   </html>
   ```

3. **Подсчёт статистики**
   - Word Count: подсчёт слов во всех секциях и FAQ
   - Quality Score: оценка качества (0.0-1.0)

4. **Формирование объекта страницы**
   ```javascript
   {
     title: "...",
     h1: "...",
     metaDescription: "...",
     sections: [...],
     tables: [...],
     faqQuestions: [...],
     html: "<!DOCTYPE html>...",
     wordCount: 3247,
     qualityScore: 0.85
   }
   ```

**Результат:** Готовая HTML-страница в памяти

---

### **ЭТАП 5: СОХРАНЕНИЕ СТРАНИЦЫ**

**Метод:** `savePage(page, slug)`  
**Время:** ~0.1 секунды  
**Цель:** Сохранить HTML-файл на диск

#### Шаги:

1. **Генерация slug**
   ```javascript
   theme: "Market Value"
   index: 0
   slug: "market-value-0"
   ```

2. **Создание директории**
   ```
   📁 public/seo-pages/
   └── market-value-0/          ← Создаётся
       └── index.html           ← Создаётся
   ```

3. **Запись HTML файла**
   ```javascript
   fs.writeFileSync(
     'public/seo-pages/market-value-0/index.html',
     page.html,
     'utf8'
   )
   ```

4. **Возврат результата**
   ```javascript
   {
     path: "public/seo-pages/market-value-0/index.html",
     slug: "market-value-0",
     wordCount: 3247,
     qualityScore: 0.85
   }
   ```

**Результат:** HTML-файл сохранён на диск

---

### **ЭТАП 6: QUALITY SCORE** (Оценка качества)

**Модуль:** `quality-score-minimal.js`  
**Время:** ~0.1 секунды  
**Цель:** Оценить качество сгенерированной страницы

#### Критерии оценки:

1. **Количество секций**
   - >= 8 секций: +0.3
   - >= 12 секций: +0.1

2. **Количество таблиц**
   - >= 2 таблицы: +0.2

3. **Количество FAQ**
   - >= 10 вопросов: +0.2

4. **Количество слов**
   - >= 3000 слов: +0.2

**Максимальный балл:** 1.0

**Пример:**
```
Секций: 11 → +0.3
Таблиц: 2 → +0.2
FAQ: 12 → +0.2
Слов: 3247 → +0.2
─────────────────────
Итого: 0.9 (90%)
```

**Результат:** Quality Score сохранён в метаданных страницы

---

### **ЭТАП 7: ПРОДАКШЕН** (Деплой)

**Время:** Зависит от платформы  
**Цель:** Сделать страницу доступной в интернете

#### Шаги:

1. **Файл уже в `public/seo-pages/`**
   ```
   📁 public/seo-pages/
   └── market-value-0/
       └── index.html  ✅ Готово
   ```

2. **Деплой на Vercel** (автоматически)
   - Vercel сканирует `public/` директорию
   - Файлы из `public/seo-pages/` доступны по URL:
     ```
     https://vintrusted.com/seo-pages/market-value-0/
     ```

3. **Проверка доступности**
   ```bash
   curl https://vintrusted.com/seo-pages/market-value-0/
   ```

4. **Индексация Google** (автоматически)
   - Google сканирует сайт
   - Находит новые страницы через sitemap.xml
   - Индексирует страницы

**Результат:** Страница доступна в интернете и индексируется Google

---

## ⏱️ ВРЕМЕННАЯ СХЕМА

```
[ЭТАП 1] Semantic Scanner      → 1-2 сек
[ЭТАП 2] Strategy Generator    → 1 сек
[ЭТАП 3] Prompt Engine         → 1-2 сек × 20 = 20-40 сек
[ЭТАП 4] Content Generator      → 5-10 мин × 20 = 100-200 мин (1.7-3.3 часа)
  ├─ Introduction              → 30-60 сек
  ├─ Main Sections (×10)       → 5-10 мин
  ├─ Tables (×2)               → 1-2 мин
  └─ FAQ (×3 блока)            → 3-6 мин
[ЭТАП 5] Сохранение            → 0.1 сек × 20 = 2 сек
[ЭТАП 6] Quality Score         → 0.1 сек × 20 = 2 сек
[ЭТАП 7] Продакшен             → Автоматически (Vercel)

ИТОГО: ~2-3 часа на батч из 20 страниц
```

---

## 📊 СТАТИСТИКА ОДНОЙ СТРАНИЦЫ

### AI-вызовы:
- **Введение:** 1 вызов
- **Основные секции:** 10 вызовов
- **Таблицы:** 2 вызова
- **FAQ:** 3 вызова (по 5 вопросов)
- **ИТОГО:** 16 AI-вызовов

### Контент:
- **Слов:** 3000-5000
- **Секций:** 11 (1 введение + 10 основных)
- **Таблиц:** 2
- **FAQ вопросов:** 12-15

### Качество:
- **Quality Score:** 0.8-1.0 (80-100%)
- **SEO оптимизация:** ✅
- **Структурированные данные:** ✅ (HTML структура)

---

## 🔄 ПОЛНЫЙ ЦИКЛ (БАТЧ)

### Запуск через Dashboard:

1. **Нажатие "СТАРТ"**
   - Запускается `startFullCycle()`

2. **Обработка батча**
   - 20 страниц обрабатываются последовательно
   - Каждая страница: 5-10 минут
   - Прогресс отображается в Dashboard

3. **Пауза/Возобновление**
   - Можно приостановить в любой момент
   - Можно возобновить с места остановки

4. **Завершение**
   - Все страницы сохранены в `public/seo-pages/`
   - Статистика отображается в Dashboard
   - Страницы готовы к продакшену

---

## 🎯 ИТОГОВАЯ СХЕМА

```
[ПОЛЬЗОВАТЕЛЬ]
    ↓
[НАЖАТИЕ "СТАРТ" В DASHBOARD]
    ↓
[1] SEMANTIC SCANNER
    ├─ Сканирование существующих страниц
    ├─ Анализ покрытия
    └─ Определение пробелов
    ↓
[2] STRATEGY GENERATOR
    ├─ Генерация приоритетов
    └─ Ограничение до 20 страниц
    ↓
[3] PROMPT ENGINE
    ├─ Генерация промптов для каждого приоритета
    └─ Обогащение знаниями
    ↓
[4] CONTENT GENERATOR (×20 страниц)
    ├─ Генерация введения (1 AI-вызов)
    ├─ Генерация секций (10 AI-вызовов)
    ├─ Генерация таблиц (2 AI-вызова)
    ├─ Генерация FAQ (3 AI-вызова)
    └─ Сборка HTML (локально)
    ↓
[5] СОХРАНЕНИЕ
    ├─ Создание директории
    └─ Запись index.html
    ↓
[6] QUALITY SCORE
    └─ Оценка качества
    ↓
[7] ПРОДАКШЕН
    ├─ Vercel деплой (автоматически)
    └─ Google индексация (автоматически)
    ↓
[ГОТОВО] Страница доступна в интернете
```

---

**Дата создания:** 2025-12-03  
**Версия:** Monster 7.1 (Phi-3 TRIZ Edition)

