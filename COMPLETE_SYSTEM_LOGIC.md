# 🔄 ПОЛНАЯ ЛОГИКА РАБОТЫ СИСТЕМЫ MONSTER 7.0
## От нуля до полного выполнения функции генерации статьи

---

## 📋 ОГЛАВЛЕНИЕ

1. [Инициализация системы](#1-инициализация-системы)
2. [Загрузка конфигураций и данных](#2-загрузка-конфигураций-и-данных)
3. [Создание контекста статьи](#3-создание-контекста-статьи)
4. [Генерация блоков статьи](#4-генерация-блоков-статьи)
5. [Обогащение промптов](#5-обогащение-промптов)
6. [Выбор AI провайдера](#6-выбор-ai-провайдера)
7. [Генерация текста через AI](#7-генерация-текста-через-ai)
8. [Валидация статьи](#8-валидация-статьи)
9. [Post-processing](#9-post-processing)
10. [Сборка финальной статьи](#10-сборка-финальной-статьи)
11. [Сохранение результата](#11-сохранение-результата)

---

## 1. ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ

### 1.1 Запуск скрипта
```javascript
// scripts/generate-test-article.js
node scripts/generate-test-article.js
```

**Что происходит:**
- Загружается конфигурация из `data/seo/config.json`
- Импортируются модули: `AIAugmentation`, `ArticleGeneratorV6`
- Вызывается функция `generateTestArticle()`

### 1.2 Создание AIAugmentation
```javascript
const aiAugmentation = new AIAugmentation(config);
```

**Внутренние процессы:**

1. **Загрузка кеша AI ответов**
   - Путь: `data/seo/ai-cache.jsonl`
   - Формат: JSONL (одна строка = один JSON объект)
   - Структура: `{ key: "hash", text: "cached response" }`
   - Загружается в память как `Map<string, string>`

2. **Загрузка обученной стратегии AI**
   - Путь: `data/seo/ai-training/learned-strategy.json`
   - Содержит: `core_principles`, `lastUpdated`, `version`
   - Используется для обогащения промптов

3. **Инициализация Local AI (Ollama)**
   - Проверка: `process.env.USE_LOCAL_AI === '1'`
   - Проверка: `config.features?.localAI !== false`
   - Если доступен: создается `LocalAIProvider`
   - Если недоступен: используется только DeepSeek API

4. **Инициализация провайдеров**
   - По умолчанию: `['deepseek']`
   - DeepSeek API ключ: `process.env.DEEPSEEK_API_KEY`

### 1.3 Создание ArticleGeneratorV6
```javascript
const articleGenerator = new ArticleGeneratorV6(aiAugmentation, config);
```

**Внутренние процессы:**

1. **Загрузка Reference Articles**
   - Модуль: `ReferenceArticlesLoader` (singleton)
   - Файлы:
     - `data/seo/ai-training/reference-articles/high-volume-california-vin.json`
     - `data/seo/ai-training/reference-articles/variability-system.json`
   - Кешируется в памяти на 5 минут
   - Используется как эталон для генерации

2. **Загрузка VIN Canon Template**
   - Путь: `data/seo/ai-training/vin-decoder-canon.json`
   - Содержит: каноническую структуру VIN позиций 1-17
   - Используется для единообразия всех статей

3. **Инициализация валидатора**
   - Модуль: `ArticleValidator`
   - Проверки: 19 различных проверок качества

4. **Инициализация post-processor**
   - Модуль: `ArticlePostProcessor`
   - Функции: завершение обрывов, нормализация структуры

---

## 2. ЗАГРУЗКА КОНФИГУРАЦИЙ И ДАННЫХ

### 2.1 Конфигурация системы
```json
// data/seo/config.json
{
  "enableAI": true,
  "aiProviders": ["deepseek"],
  "features": {
    "localAI": true
  }
}
```

### 2.2 Переменные окружения
```bash
SEO_ENABLE_AI=1              # Включить AI генерацию
DEEPSEEK_API_KEY=xxx         # API ключ DeepSeek
USE_LOCAL_AI=1               # Включить Ollama
LOCAL_AI_MODEL=phi3          # Модель Ollama
LOCAL_AI_TIMEOUT=90000       # Таймаут Ollama (90 сек)
```

### 2.3 Обученная стратегия AI
```json
// data/seo/ai-training/learned-strategy.json
{
  "core_principles": [
    "Use technical, DMV-grade language",
    "Include specific data sources (NMVTIS, BAR, DMV)",
    "Emphasize fraud detection",
    "Provide actionable checklists"
  ],
  "lastUpdated": "2025-12-03T22:30:20.942Z",
  "version": "1.0"
}
```

---

## 3. СОЗДАНИЕ КОНТЕКСТА СТАТЬИ

```javascript
const context = {
  make: 'Toyota',
  model: 'Camry',
  year: '2018',
  stateSlug: 'california',
  stateLabel: 'California',
  intent: 'vin_check',
  lang: 'en',
  vin: '4T1B11HK3JU123456'  // Правильный VIN: позиция 10 = J для 2018
};
```

**Критичные параметры:**
- `vin`: Должен соответствовать году (позиция 10 = J для 2018)
- `year`: Используется для проверки VIN decoder
- `stateSlug`: Используется для state-specific контента

---

## 4. ГЕНЕРАЦИЯ БЛОКОВ СТАТЬИ

### 4.1 Последовательность блоков (15 блоков)

```javascript
// 1. Hero (Ollama) - 75 слов
blocks.push(await this.generateBlock('hero', context, {
  provider: 'ollama',
  wordCount: 75,
  reference: referenceArticles.highVolume?.hero
}));

// 2. Key Facts (Ollama) - 125 слов
blocks.push(await this.generateBlock('key_facts', context, {
  provider: 'ollama',
  wordCount: 125,
  reference: referenceArticles.highVolume?.key_facts
}));

// 3. VIN Decoder (Ollama) - 350 слов
blocks.push(await this.generateBlock('vin_decoder', context, {
  provider: 'ollama',
  wordCount: 350,
  reference: null
}));

// 4. NMVTIS (Ollama) - 250 слов
blocks.push(await this.generateBlock('nmvtis', context, {
  provider: 'ollama',
  wordCount: 250,
  reference: null
}));

// 5. Deep Explanation (DeepSeek) - 450 слов
blocks.push(await this.generateBlock('deep_explanation', context, {
  provider: 'deepseek',
  wordCount: 450,
  reference: referenceArticles.highVolume?.structure?.deep_explanation
}));

// 6. State-Specific (DeepSeek) - 350 слов
blocks.push(await this.generateBlock('state_specific', context, {
  provider: 'deepseek',
  wordCount: 350,
  reference: referenceArticles.highVolume?.structure?.state_specific_insights
}));

// 7. Accident Intelligence (DeepSeek) - 350 слов
blocks.push(await this.generateBlock('accident_intelligence', context, {
  provider: 'deepseek',
  wordCount: 350,
  reference: referenceArticles.highVolume?.structure?.accident_intelligence
}));

// 8. Fraud Patterns (DeepSeek) - 350 слов
blocks.push(await this.generateBlock('fraud_patterns', context, {
  provider: 'deepseek',
  wordCount: 350,
  reference: referenceArticles.highVolume?.structure?.fraud_patterns
}));

// 9. Market Value (DeepSeek) - 250 слов
blocks.push(await this.generateBlock('market_value', context, {
  provider: 'deepseek',
  wordCount: 250,
  reference: referenceArticles.highVolume?.structure?.market_value
}));

// 10. Insurance Risk (DeepSeek) - 250 слов
blocks.push(await this.generateBlock('insurance_risk', context, {
  provider: 'deepseek',
  wordCount: 250,
  reference: referenceArticles.highVolume?.structure?.insurance_risk
}));

// 11. Buyer Guide (Ollama) - 250 слов
blocks.push(await this.generateBlock('buyer_guide', context, {
  provider: 'ollama',
  wordCount: 250,
  reference: referenceArticles.highVolume?.structure?.buyer_guide
}));

// 12. Recalls & TSBs (DeepSeek) - 300 слов
blocks.push(await this.generateBlock('recalls_tsbs', context, {
  provider: 'deepseek',
  wordCount: 300,
  reference: null
}));

// 13. FAQ (Ollama) - 500 слов
blocks.push(await this.generateBlock('faq', context, {
  provider: 'ollama',
  wordCount: 500,
  reference: referenceArticles.highVolume?.structure?.faq
}));

// 14. Internal Links (Ollama) - 75 слов
blocks.push(await this.generateBlock('internal_links', context, {
  provider: 'ollama',
  wordCount: 75,
  reference: referenceArticles.highVolume?.internal_links
}));

// 15. CTA (Ollama) - 75 слов
blocks.push(await this.generateBlock('cta', context, {
  provider: 'ollama',
  wordCount: 75,
  reference: null
}));
```

### 4.2 Логика выбора провайдера

**Ollama блоки (быстрые, простые):**
- `hero`, `key_facts`, `vin_decoder`, `nmvtis`
- `buyer_guide`, `faq`, `internal_links`, `cta`

**DeepSeek блоки (сложные, требуют качества):**
- `deep_explanation`, `state_specific`, `accident_intelligence`
- `fraud_patterns`, `market_value`, `insurance_risk`

---

## 5. ОБОГАЩЕНИЕ ПРОМПТОВ

### 5.1 Процесс обогащения

```javascript
// В AIAugmentation.enrichPromptWithStrategy()
```

**Шаг 1: Проверка наличия стратегии**
```javascript
if (!this.aiStrategy || !this.aiStrategy.core_principles) {
  return originalPrompt; // Возвращаем оригинальный промпт
}
```

**Шаг 2: Создание обогащенного промпта**
```javascript
const enrichedPrompt = `
${originalPrompt}

AI Training Strategy (learned from successful articles):
${this.aiStrategy.core_principles.join('\n')}

Follow these principles to create high-quality content.
`;
```

**Шаг 3: Проверка длины промпта**
```javascript
if (enrichedPrompt.length > 4000) {
  // Создаем компактную версию стратегии
  const compactStrategy = this.createCompactStrategy();
  enrichedPrompt = `${originalPrompt}\n\nStrategy: ${compactStrategy}`;
}
```

### 5.2 Создание промпта для блока

```javascript
// В ArticleGeneratorV6.buildBlockPrompt()
```

**Шаг 1: Базовый промпт**
```javascript
const basePrompt = `Write a ${blockType} block for a VIN check guide for ${year} ${make} ${model} in ${stateLabel}.

Style: DMV-grade, legal, antifraud, engineering-level explanation.
Word count: ${wordCount} words.
Use FACTUAL, TECHNICAL style (no literary flourishes).

CRITICAL REQUIREMENTS - NO EXCEPTIONS:
- Complete ALL sentences fully - NO truncated text
- Finish ALL bullet points completely
- Complete ALL tables with ALL rows
- Ensure ALL sections have proper conclusions
- NO text breaks before headings (##)
- NO incomplete thoughts or cut-off phrases
`;
```

**Шаг 2: Добавление специфичных требований**
```javascript
// Для каждого типа блока - свои требования
const blockSpecificPrompt = this.getBlockSpecificPrompt(blockType, context);
```

**Пример для VIN Decoder:**
```javascript
vin_decoder: `${basePrompt}
CANONICAL VIN STRUCTURE (MUST FOLLOW EXACTLY):
Positions 1-3 (WMI): Country, Manufacturer, Vehicle Type
  - Position 1: Region/Country (4 = United States)
  - Position 2: Manufacturer (T = Toyota)
  - Position 3: Vehicle Type (1 = Passenger Car)
...
REQUIRED FORMAT:
1. Complete Markdown table showing ALL 17 positions
2. Use the EXACT VIN from context: ${vin}
3. Break down the example VIN position by position (all 17 positions)
...
`;
```

**Шаг 3: Добавление reference статьи (если есть)**
```javascript
if (reference) {
  const referenceText = `\n\nReference example (high-quality article):\n${reference}`;
  prompt += referenceText;
}
```

---

## 6. ВЫБОР AI ПРОВАЙДЕРА

### 6.1 Логика выбора

```javascript
// В AIAugmentation.generateText()
```

**Шаг 1: Проверка кеша**
```javascript
const cacheKey = hashKey([lang, intent, make, year, stateSlug, enrichedPrompt].join('|'));

if (this.cache.has(cacheKey)) {
  const cached = this.cache.get(cacheKey);
  if (!cached.includes('fallback text')) {
    return cached; // Возвращаем из кеша
  }
}
```

**Шаг 2: Определение типа блока**
```javascript
const blockType = options.blockType || 'general';
const forceProvider = options.provider; // Явно указанный провайдер

const ollamaBlocks = ['hero', 'key_facts', 'vin_decoder', ...];
const deepseekBlocks = ['deep_explanation', 'state_specific', ...];

const useOllama = forceProvider === 'ollama' || 
                 (!forceProvider && ollamaBlocks.includes(blockType));
const useDeepSeek = forceProvider === 'deepseek' || 
                   (!forceProvider && deepseekBlocks.includes(blockType));
```

**Шаг 3: Попытка Ollama (если нужно)**
```javascript
if (useOllama && this.useLocalAI && this.localAI) {
  const isAvailable = await this.localAI.isAvailable();
  if (isAvailable) {
    const localText = await this.localAI.generateText(prompt, {
      maxTokens: maxTokens || 800
    });
    
    // Валидация качества через Ollama
    const validation = await this.validateWithOllama(localText, blockType);
    
    if (validation.score >= 0.8) {
      this.appendCache(cacheKey, localText);
      return localText; // Используем Ollama
    } else {
      // Fallback на DeepSeek если качество низкое
    }
  }
}
```

**Шаг 4: Fallback на DeepSeek**
```javascript
if (useDeepSeek || !useOllama || !this.useLocalAI) {
  const deepseekText = await this.callDeepSeekAPI(enrichedPrompt, {
    maxTokens: maxTokens,
    timeout: calculateTimeout(enrichedPrompt.length)
  });
  
  if (deepseekText) {
    this.appendCache(cacheKey, deepseekText);
    return deepseekText;
  }
}
```

**Шаг 5: Fallback на generic текст**
```javascript
const fallback = this.getFallbackText(intent, lang);
this.appendCache(cacheKey, fallback);
return fallback;
```

---

## 7. ГЕНЕРАЦИЯ ТЕКСТА ЧЕРЕЗ AI

### 7.1 DeepSeek API вызов

```javascript
// В AIAugmentation.callDeepSeekAPI()
```

**Шаг 1: Подготовка запроса**
```javascript
const apiKey = process.env.DEEPSEEK_API_KEY;
const url = 'https://api.deepseek.com/v1/chat/completions';

const requestBody = {
  model: 'deepseek-chat',
  messages: [
    {
      role: 'system',
      content: 'You are an expert SEO content writer. Write clear, factual, technical content.'
    },
    {
      role: 'user',
      content: enrichedPrompt
    }
  ],
  max_tokens: maxTokens,
  temperature: 0.7
};
```

**Шаг 2: Адаптивный таймаут**
```javascript
const baseTimeout = 45000; // 45 секунд
const maxTimeout = 180000;  // 180 секунд
const timeout = Math.min(
  baseTimeout + (prompt.length / 10),
  maxTimeout
);
```

**Шаг 3: Retry логика**
```javascript
const maxRetries = 2;
let lastError = null;

for (let attempt = 1; attempt <= maxRetries; attempt++) {
  try {
    const response = await Promise.race([
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), timeout)
      )
    ]);
    
    if (response.ok) {
      const data = await response.json();
      return data.choices[0].message.content;
    }
  } catch (e) {
    lastError = e;
    if (attempt < maxRetries) {
      await sleep(Math.pow(2, attempt) * 1000); // Exponential backoff
    }
  }
}
```

### 7.2 Ollama вызов

```javascript
// В LocalAIProvider.generateText()
```

**Шаг 1: Проверка доступности**
```javascript
const isAvailable = await this.isAvailable();
// Проверяет: ollama list или API endpoint
```

**Шаг 2: Вызов API или CLI**
```javascript
// Пробуем API сначала
try {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      model: this.model,
      prompt: prompt,
      stream: false
    })
  });
  
  const data = await response.json();
  return data.response;
} catch (e) {
  // Fallback на CLI
  const { exec } = require('child_process');
  const result = await execPromise(`ollama run ${this.model} "${prompt}"`);
  return result;
}
```

---

## 8. ВАЛИДАЦИЯ СТАТЬИ

### 8.1 Процесс валидации

```javascript
// После генерации всех блоков
const validation = this.validator.validate(article);
```

**Проверки (19 проверок):**

1. **Обрывы текста**
   - `/\band\s+##/g` - обрыв после "and"
   - `/\bor\s+##/g` - обрыв после "or"
   - `/\(\s*##/g` - обрыв после "("
   - `/\[\s*##/g` - обрыв после "["
   - `/,\s*##/g` - обрыв после ","
   - `/\|\s*##/g` - обрыв после "|"

2. **Структура H2/H3**
   - Каждый H2 должен иметь минимум 2 абзаца
   - H2 не должен начинаться сразу после другого H2
   - SEO-формулировки (год, марка, модель в заголовках)

3. **Валидность таблиц**
   - Одинаковое количество колонок во всех строках
   - Завершенные строки (нет пустых ячеек в заголовке)
   - Минимум 2 строки в таблице

4. **Обязательные блоки**
   - Executive Summary, Key Facts, VIN Decoder, NMVTIS
   - Data Layers, State-Specific, Accident Intelligence
   - Fraud Patterns, Market Value, Insurance Risk
   - Buyer Guide, Recalls & TSB, FAQ, Related Links, CTA

5. **VIN Decoder**
   - Наличие таблицы позиций
   - Покрытие всех 17 позиций
   - Правильный WMI (4T1 для Toyota USA)
   - Позиция 10 = J для 2018 года

6. **CTA**
   - Наличие канонического формата
   - "Check this {YEAR} {MAKE} {MODEL} VIN now"

7. **FAQ**
   - Минимум 5 вопросов (рекомендуется 12-15)

8. **Минимумы**
   - Минимум 3000 слов
   - Минимум 12 блоков
   - Минимум 3 таблицы

### 8.2 Автофикс

```javascript
if (!validation.valid) {
  article.content = this.validator.autoFix(article.content);
}
```

**Что исправляет автофикс:**
- Обрывы перед заголовками: `and ##` → `. ##`
- Незавершенные слова: `Sequential` → `Sequential Production Number`
- Незавершенные таблицы: добавляет недостающие строки
- Незавершенные списки: завершает bullet points
- Незавершенные абзацы: добавляет завершения

---

## 9. POST-PROCESSING

### 9.1 Процесс post-processing

```javascript
article = this.postProcessor.process(article);
```

**Шаг 1: Завершение незавершенных слов**
```javascript
const wordCompletions = {
  'Sequential': 'Sequential Production Number',
  'Information': 'Information Type',
  'fraudulent': 'fraudulent practice where...',
  ...
};

Object.entries(wordCompletions).forEach(([incomplete, completion]) => {
  content = content.replace(
    new RegExp(`\\b${incomplete}\\s*$`, 'gm'),
    completion
  );
});
```

**Шаг 2: Завершение незавершенных таблиц**
```javascript
// Фикс: таблица с "Information" без завершения
content = content.replace(
  /\|\s*Information\s*\n\s*##/g,
  '| Information Type | Source | Details |\n| --- | --- | --- |\n| Title History | NMVTIS | Complete title chain |\n...\n\n##'
);
```

**Шаг 3: Завершение незавершенных списков**
```javascript
// Фикс: bullet points без завершения
content = content.replace(
  /\*\s+\*\*([^*]+)\*\*\s*$/gm,
  (match, text) => {
    if (text.length < 50 && !text.endsWith('.')) {
      return `*   **${text}** - Complete explanation.`;
    }
    return match;
  }
);
```

**Шаг 4: Завершение незавершенных абзацев**
```javascript
const incompleteEndings = [
  /If you see a gap of 6\+ months in the vehicle's history with no recorded location or mileage$/m,
  /Prolonged operation in coastal regions can accelerate corrosion...$/m,
  ...
];

const completions = [
  ', this requires investigation into potential storage...',
  ' reports, but can be detected through visual inspection...',
  ...
];

incompleteEndings.forEach((pattern, index) => {
  content = content.replace(pattern, (match) => match + completions[index]);
});
```

**Шаг 5: Нормализация структуры**
```javascript
// Убрать двойные заголовки подряд
content = content.replace(/##\s+.+\n+\n+##\s+/g, ...);

// Нормализовать пробелы между секциями
content = content.replace(/\n{4,}/g, '\n\n');
```

---

## 10. СБОРКА ФИНАЛЬНОЙ СТАТЬИ

### 10.1 Объединение блоков

```javascript
// В ArticleGeneratorV6.assembleArticle()
```

**Шаг 1: Объединение контента**
```javascript
let content = '';
let wordCount = 0;
const blocksDetail = {};

blocks.forEach(block => {
  const blockContent = typeof block === 'string' ? block : block.content || '';
  const blockWords = this.countWords(blockContent);
  
  content += blockContent + '\n\n';
  wordCount += blockWords;
  
  blocksDetail[block.type] = {
    provider: block.provider,
    wordCount: blockWords
  };
});
```

**Шаг 2: Создание заголовков**
```javascript
const title = `VIN Check Guide for ${year} ${make} ${model} in ${stateLabel}`;
const h1 = `Complete VIN Check Guide: ${year} ${make} ${model} in ${stateLabel}`;
```

**Шаг 3: Формирование объекта статьи**
```javascript
return {
  title: title,
  h1: h1,
  content: content,
  wordCount: wordCount,
  blocks: blocks.length,
  blocksDetail: blocksDetail,
  timestamp: new Date().toISOString()
};
```

---

## 11. СОХРАНЕНИЕ РЕЗУЛЬТАТА

### 11.1 Создание HTML

```javascript
// В generate-test-article.js
```

**Шаг 1: Генерация HTML структуры**
```javascript
const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${article.title}</title>
    <style>
        /* CSS стили */
    </style>
</head>
<body>
    <div class="article">
        <h1>${article.h1}</h1>
        <div class="meta">
            <strong>Vehicle:</strong> ${context.year} ${context.make} ${context.model}<br>
            <strong>Word Count:</strong> ${article.wordCount}<br>
            <strong>Blocks:</strong> ${article.blocks}<br>
        </div>
        <div class="content">
            ${article.content}
        </div>
    </div>
</body>
</html>`;
```

**Шаг 2: Сохранение HTML**
```javascript
const outputDir = path.join(process.cwd(), 'public', 'test-article');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'index.html');
fs.writeFileSync(outputPath, html, 'utf8');
```

### 11.2 Сохранение JSON данных

```javascript
const dataPath = path.join(outputDir, 'article-data.json');
fs.writeFileSync(dataPath, JSON.stringify({
  ...article,
  context,
  strategyUsed: !!aiAugmentation.aiStrategy,
  strategyLastUpdated: aiAugmentation.aiStrategy?.lastUpdated || null,
  generatedAt: new Date().toISOString()
}, null, 2), 'utf8');
```

---

## 📊 ВРЕМЕННЫЕ ХАРАКТЕРИСТИКИ

### Полный цикл генерации статьи (15 блоков):

| Этап | Время | Описание |
|------|-------|----------|
| **Инициализация** | 0.5-1 сек | Загрузка модулей, конфигов, кеша |
| **Генерация блоков** | 180-240 сек | 15 блоков × 12-16 сек каждый |
| **Валидация** | 0.1-0.2 сек | 19 проверок качества |
| **Post-processing** | 0.1-0.2 сек | Завершение обрывов |
| **Сборка и сохранение** | 0.1-0.2 сек | HTML + JSON |
| **ИТОГО** | **180-240 сек** | **3-4 минуты** |

### Детализация по блокам:

| Блок | Провайдер | Слов | Время |
|------|-----------|------|-------|
| Hero | Ollama/DeepSeek | 75 | 5-8 сек |
| Key Facts | Ollama/DeepSeek | 125 | 8-12 сек |
| VIN Decoder | Ollama/DeepSeek | 350 | 12-18 сек |
| NMVTIS | Ollama/DeepSeek | 250 | 10-15 сек |
| Deep Explanation | DeepSeek | 450 | 18-24 сек |
| State-Specific | DeepSeek | 350 | 15-20 сек |
| Accident Intelligence | DeepSeek | 350 | 15-20 сек |
| Fraud Patterns | DeepSeek | 350 | 15-20 сек |
| Market Value | DeepSeek | 250 | 12-18 сек |
| Insurance Risk | DeepSeek | 250 | 12-18 сек |
| Buyer Guide | Ollama/DeepSeek | 250 | 12-18 сек |
| Recalls & TSBs | DeepSeek | 300 | 15-20 сек |
| FAQ | Ollama/DeepSeek | 500 | 20-30 сек |
| Internal Links | Ollama/DeepSeek | 75 | 5-8 сек |
| CTA | Ollama/DeepSeek | 75 | 5-8 сек |

---

## 🔄 ПОЛНЫЙ FLOW ДИАГРАММА

```
START
  │
  ├─> Загрузка конфигурации (config.json)
  │
  ├─> Создание AIAugmentation
  │   ├─> Загрузка кеша (ai-cache.jsonl)
  │   ├─> Загрузка стратегии (learned-strategy.json)
  │   └─> Инициализация Local AI (Ollama)
  │
  ├─> Создание ArticleGeneratorV6
  │   ├─> Загрузка Reference Articles
  │   ├─> Загрузка VIN Canon Template
  │   ├─> Инициализация валидатора
  │   └─> Инициализация post-processor
  │
  ├─> Создание контекста статьи
  │
  ├─> Генерация 15 блоков (последовательно)
  │   │
  │   ├─> Для каждого блока:
  │   │   ├─> Построение промпта
  │   │   │   ├─> Базовый промпт
  │   │   │   ├─> Специфичные требования
  │   │   │   ├─> Reference статья (если есть)
  │   │   │   └─> Обогащение стратегией
  │   │   │
  │   │   ├─> Проверка кеша
  │   │   │   └─> Если есть → возврат из кеша
  │   │   │
  │   │   ├─> Выбор провайдера
  │   │   │   ├─> Ollama (для простых блоков)
  │   │   │   └─> DeepSeek (для сложных блоков)
  │   │   │
  │   │   ├─> Генерация текста
  │   │   │   ├─> Ollama: API или CLI
  │   │   │   └─> DeepSeek: API с retry
  │   │   │
  │   │   └─> Сохранение в кеш
  │   │
  │   └─> Сборка массива блоков
  │
  ├─> Объединение блоков в статью
  │
  ├─> Валидация статьи
  │   ├─> 19 проверок качества
  │   └─> Автофикс общих проблем
  │
  ├─> Post-processing
  │   ├─> Завершение незавершенных слов
  │   ├─> Завершение незавершенных таблиц
  │   ├─> Завершение незавершенных списков
  │   ├─> Завершение незавершенных абзацев
  │   └─> Нормализация структуры
  │
  ├─> Повторная валидация
  │
  ├─> Создание HTML
  │
  ├─> Сохранение файлов
  │   ├─> HTML (public/test-article/index.html)
  │   └─> JSON (public/test-article/article-data.json)
  │
  └─> END
```

---

## 🎯 КЛЮЧЕВЫЕ МОМЕНТЫ

1. **Кеширование**: Все AI ответы кешируются для ускорения повторных генераций
2. **Гибридная система**: Ollama для простых блоков, DeepSeek для сложных
3. **Валидация**: 19 проверок качества на каждом этапе
4. **Автофикс**: Автоматическое исправление общих проблем
5. **Post-processing**: Финальная обработка для завершения обрывов
6. **Каноническая структура**: VIN decoder и CTA всегда в едином формате
7. **Reference статьи**: Используются как эталон для генерации
8. **Обученная стратегия**: Обогащает промпты знаниями о качественном контенте

---

*Документ создан: 2025-12-03*  
*Версия системы: MONSTER 7.0*
















