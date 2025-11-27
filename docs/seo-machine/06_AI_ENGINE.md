# AI Engine — Technical Documentation

## 1. Overview

AI Engine — это унифицированный слой для генерации SEO-контента с использованием LLM провайдеров. Система состоит из нескольких компонентов:

1. **AI Client** (`scripts/ai/client.js`) — унифицированный клиент с поддержкой DeepSeek (primary) и Groq/Grok (secondary)
2. **SEO Writer** (`scripts/ai/seo-writer.js`) — высокоуровневый генератор SEO-текста
3. **DeepSeek Integration** (`scripts/ai/deepseek-client.js`, `scripts/ai/seo-writer-deepseek.js`) — специализированная интеграция DeepSeek
4. **AI Engine 11/10** (`ai/`) — экспериментальный multi-stage pipeline с critic и валидацией

## 2. DeepSeek Integration

### 2.1. Архитектура

```
scripts/ai/
  ├── deepseek-client.js      # Базовый клиент (OpenAI SDK совместимый)
  └── seo-writer-deepseek.js  # Генератор EN/ES контента
```

### 2.2. Модули

#### `scripts/ai/deepseek-client.js`

**Назначение:** Универсальный клиент DeepSeek API через OpenAI SDK.

**Функции:**
- `callDeepseekChat({messages, model, maxTokens, temperature})` — базовый вызов chat/completions
- `callDeepseekReasoner({messages, maxTokens, temperature})` — reasoning-модель для сложных задач

**ENV переменные:**
- `DEEPSEEK_API_KEY` (обязательно)
- `DEEPSEEK_MODEL_WRITER` (default: `deepseek-chat`)
- `DEEPSEEK_MODEL_REASONER` (default: `deepseek-reasoner`)
- `DEEPSEEK_BASE_URL` (default: `https://api.deepseek.com`)

#### `scripts/ai/seo-writer-deepseek.js`

**Назначение:** Генерация EN/ES SEO-контента с жёстким ТЗ по качеству.

**Функции:**
- `generateSeoArticleEN(context)` — генерация английской страницы
- `generateSeoArticleES(context)` — генерация испанской страницы (US Hispanic)

**Входные данные (context):**
```javascript
{
  vin: "1HGCM82633A004352",
  make: "Honda",
  model: "Accord",
  year: 2021,
  stateCode: "CA",
  stateName: "California",
  intent: "vin-check" // или "vehicle-history", "accident-check", etc.
}
```

**Выходные данные:**
```javascript
{
  title: "2021 Honda Accord VIN Check - California...",
  metaDescription: "Verify 2021 Honda Accord...",
  h1: "2021 Honda Accord VIN History Report...",
  introHtml: "<p>...</p>",
  sections: [
    { id: "intro", heading: "...", html: "<p>...</p>" },
    ...
  ],
  table: {
    caption: "...",
    columns: ["Col1", "Col2"],
    rows: [["Cell1", "Cell2"], ...]
  },
  faq: [
    { q: "Question?", a: "Answer." },
    ...
  ],
  summaryFact: "Main fact in <=180 characters..."
}
```

**Требования к качеству:**
- EN: 600-1200 слов
- ES: 650-1300 слов
- Плотность фактов: минимум 0.35 "useful data units" на 100 слов
- Структура: H1, H2/H3, таблица (5-8 строк), FAQ (12-16 вопросов)
- Стиль: EN — industrial, ES — US Hispanic auto slang

### 2.3. Использование

```javascript
const {generateSeoArticleEN, generateSeoArticleES} = require('./scripts/ai/seo-writer-deepseek');

// EN страница
const enPage = await generateSeoArticleEN({
  vin: '1HGCM82633A004352',
  make: 'Honda',
  model: 'Accord',
  year: 2021,
  stateCode: 'CA',
  stateName: 'California',
  intent: 'vin-check'
});

// ES страница
const esPage = await generateSeoArticleES({
  vin: '1HGCM82633A004352',
  make: 'Honda',
  model: 'Accord',
  year: 2021,
  stateCode: 'CA',
  stateName: 'California',
  intent: 'vin-check'
});
```

## 3. AI Engine 11/10

### 3.1. Архитектура

```
ai/
  ├── generator.js              # Главный движок (orchestrator)
  ├── generator-skeleton.js     # Stage A: структура (Groq)
  ├── generator-block.js        # Stage B: блоки контента (DeepSeek/Groq)
  ├── critic.js                 # Stage C1: оценка качества (Groq)
  ├── postprocessor.js          # Stage C2: очистка текста
  ├── entropy.js                # Stage D: перемешивание секций
  ├── validator.js              # Валидация длины/плотности
  ├── pattern-engine.js         # Управление паттернами
  ├── providers/
  │   ├── groq.js              # Groq провайдер (Llama 3.3 70B)
  │   └── gemini.js             # DEPRECATED (использует DeepSeek)
  ├── patterns/
  │   └── phrases.json          # 400+ паттернов фраз
  ├── rl/
  │   ├── gsc-extract.js       # Извлечение данных GSC
  │   └── gsc-train.js         # RL обучение паттернов
  └── test-ai-engine.js        # Тестовый скрипт
```

### 3.2. Pipeline Stages

1. **Stage A (Skeleton):** Генерация структуры страницы (Groq)
2. **Stage B (Blocks):** Генерация блоков контента (DeepSeek/Groq fallback)
3. **Stage C1 (Critic):** Оценка качества (water, repetitions, weak_facts)
4. **Stage C2 (Postprocess):** Очистка текста от LLM-мусора
5. **Stage D (Entropy):** Перемешивание секций для вариаций
6. **Validation:** Проверка длины (700-1500 слов) и плотности (>4.2 символов/слово)

### 3.3. Модули

#### `ai/generator.js`

**Назначение:** Главный orchestrator для полной генерации страницы.

**Функция:** `generateFullPage(data, options)`

**Входные данные:**
```javascript
{
  vin: "1HGCM82633A004352",
  state: "California",
  make: "Honda",
  model: "Accord",
  year: 2021,
  lang: "en" // или "es"
}
```

**Опции:**
```javascript
{
  maxRetries: 3,        // Максимум попыток регенерации
  enableCritic: true,   // Включить оценку качества
  enableShuffle: true   // Включить перемешивание секций
}
```

**Выходные данные:**
```javascript
{
  skeleton: {...},      // Сгенерированная структура
  blocks: [...],        // Блоки контента
  text: "...",          // Финальный текст
  critic: {             // Оценка качества
    water: 0.27,
    repetitions: 0.23,
    weak_facts: 0.17,
    overall_score: 82,
    needs_regeneration: false
  },
  validity: {           // Результаты валидации
    length_ok: false,
    density_ok: true,
    word_count: 531,
    density: 6.36
  }
}
```

#### `ai/providers/groq.js`

**Назначение:** Провайдер Groq (Llama 3.3 70B).

**Модель:** `llama-3.3-70b-versatile`

**ENV:** `GROQ_API_KEY`

**Использование:** Skeleton generation, critic evaluation

#### `ai/providers/gemini.js`

**Назначение:** DEPRECATED — теперь использует DeepSeek как fallback.

**Статус:** Перенаправляет вызовы на DeepSeek через `scripts/ai/deepseek-client.js`

**ENV:** `GEMINI_API_KEY` (не используется, оставлен для обратной совместимости)

### 3.4. Тестирование

```bash
npm run ai:test
```

Или напрямую:
```bash
node ai/test-ai-engine.js
```

## 4. ENV Variables

| Переменная | Где используется | Обязательно | Default |
| --- | --- | --- | --- |
| `DEEPSEEK_API_KEY` | `scripts/ai/deepseek-client.js` | Да | — |
| `DEEPSEEK_MODEL_WRITER` | `scripts/ai/deepseek-client.js` | Нет | `deepseek-chat` |
| `DEEPSEEK_MODEL_REASONER` | `scripts/ai/deepseek-client.js` | Нет | `deepseek-reasoner` |
| `DEEPSEEK_BASE_URL` | `scripts/ai/deepseek-client.js` | Нет | `https://api.deepseek.com` |
| `GROQ_API_KEY` | `ai/providers/groq.js` | Да (для AI Engine) | — |
| `GEMINI_API_KEY` | `ai/providers/gemini.js` | Нет (DEPRECATED) | — |

## 5. Зависимости

```json
{
  "groq-sdk": "^0.4.0",
  "@google/generative-ai": "^0.21.0",
  "openai": "^latest",
  "dotenv": "^16.3.1"
}
```

## 6. Статус интеграции

- ✅ DeepSeek Integration — **IMPLEMENTED** (протестировано)
- ✅ AI Engine 11/10 — **IMPLEMENTED** (протестировано)
- ⏳ Интеграция в основной пайплайн — **PLANNED** (нужно добавить `USE_AI_CONTENT=1` в генераторы)

## 7. AI Client (scripts/ai/client.js)

### 7.1. Архитектура

Унифицированный клиент для работы с несколькими AI провайдерами:

- **Primary:** DeepSeek (по умолчанию)
- **Secondary:** Groq или Grok (fallback)

### 7.2. Провайдеры

| Провайдер | ENV переменная | Endpoint | Default Model |
| --- | --- | --- | --- |
| `deepseek` | `DEEPSEEK_API_KEY` | `https://api.deepseek.com/v1/chat/completions` | `deepseek-chat` |
| `groq` | `GROQ_API_KEY` | `https://api.groq.com/openai/v1/chat/completions` | `llama-3.3-70b-versatile` |
| `grok` | `GROK_API_KEY` | `https://api.x.ai/v1/chat/completions` | `grok-3-mini` |

### 7.3. Функции

- `callAI(params)` — прямой вызов провайдера
- `callWithFallback(params)` — вызов с автоматическим fallback на secondary

### 7.4. ENV переменные

- `AI_PROVIDER_PRIMARY` — основной провайдер (default: `deepseek`)
- `AI_PROVIDER_SECONDARY` — резервный провайдер (default: `groq`)
- `DEEPSEEK_MODEL` — модель DeepSeek (default: `deepseek-chat`)
- `GROQ_MODEL` — модель Groq (default: `llama-3.3-70b-versatile`)
- `GROK_MODEL` — модель Grok (default: `grok-3-mini`)

## 8. SEO Writer (scripts/ai/seo-writer.js)

### 8.1. Назначение

Высокоуровневый генератор SEO-текста с жёстким ТЗ по качеству.

### 8.2. Функция

`generateSeoText(pageSpec)` — генерирует полный SEO-текст по спецификации страницы.

**Входные данные:**
```javascript
{
  lang: "en" | "es",
  intent: "vin-check" | "vehicle-history" | "accident-check" | "market-value",
  stateName?: string,
  make?: string,
  model?: string,
  year?: number,
  vinExample?: string,
  urlPath?: string
}
```

**Выходные данные:**
```javascript
{
  h1: "...",
  metaDescription: "...",
  mainSummary: "...",
  htmlBody: "<section>...</section>",
  faqItems: [{q: "...", a: "..."}, ...],
  wordCountEstimate: 850,
  provider: "deepseek",
  model: "deepseek-chat"
}
```

### 8.3. Требования к качеству

**EN:**
- 600–1200 слов
- Industrial tone, short sentences
- H1, H2/H3, таблица (5–8 строк), FAQ (2–4), trust block, CTA block

**ES:**
- 650–1300 palabras
- US Hispanic auto-lexicon
- Та же структура, адаптированная для испанского рынка

### 8.4. Тестирование

```bash
npm run seo:ai-dry-run
```

Или напрямую:
```bash
node scripts/ai/seo-writer.js --lang=en --intent=vin-check --state=California --make=Toyota --model=Camry --year=2018
```

## 9. История изменений

- **2025-11-27:** Установлен AI Engine 11/10 (Groq + Gemini fallback)
- **2025-11-27:** Gemini заменен на DeepSeek
- **2025-11-27:** DeepSeek Integration протестирована и работает
- **2025-11-27:** Создан унифицированный AI Client (DeepSeek + Groq/Grok)
- **2025-11-27:** Создан SEO Writer с жёстким ТЗ
- **2025-11-27:** Добавлен npm скрипт `seo:ai-dry-run`
- **2025-11-27:** Документация обновлена

