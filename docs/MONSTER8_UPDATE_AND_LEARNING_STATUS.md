# 🔄 СТАТУС ОБНОВЛЕНИЙ И САМООБУЧЕНИЯ — MONSTER 8.0

**Дата:** 2025-12-06  
**Вопрос:** Применяются ли обновления для новых статей? Используется ли история ошибок в самообучении?

---

## ✅ 1. ОБНОВЛЕНИЯ ПРИМЕНЯЮТСЯ АВТОМАТИЧЕСКИ

### **Как это работает:**

`build_article_spec.js` загружает конфигурации **напрямую из файлов** при каждом запуске:

```javascript
const articleTypes = loadJson("config/article_types.json", {});
const blockProfiles = loadJson("config/block_profiles.json", {});
const audienceSegments = loadJson("config/audience_segments.json", {});
```

**Это значит:**
- ✅ **Все обновления применяются автоматически** к новым статьям
- ✅ Изменения в `config/article_types.json` → сразу используются
- ✅ Изменения в `config/block_profiles.json` → сразу используются
- ✅ Изменения в `prompts/core_prompt_blocks.txt` → сразу используются
- ✅ Изменения в `scripts/render_article_from_blocks.js` → сразу используются

**Пример:**
1. Вы обновили `config/article_types.json` (добавили `comparison_table`)
2. Запускаете `build_topic_page.sh` для новой статьи
3. `build_article_spec.js` загружает **актуальную** версию конфига
4. Новая статья получает все новые блоки автоматически ✅

---

## ❌ 2. САМООБУЧЕНИЕ СЕЙЧАС НЕ РАБОТАЕТ (STUBS)

### **Текущее состояние:**

#### `scripts/rl_ingest_metrics.js` — STUB
```javascript
// Просто создаёт пустой файл
const aggregate = {
  updated_at: new Date().toISOString(),
  records: [],
  aggregates: { zones: {}, article_types: {}, audience_segments: {} }
};
fs.writeFileSync(outPath, JSON.stringify(aggregate, null, 2));
```

#### `scripts/rl_update_strategy.js` — STUB
```javascript
// Просто создаёт базовую стратегию
const strategy = {
  version: "1.0",
  updated_at: new Date().toISOString(),
  article_type_weights: {},
  audience_weights: {},
  language_weights: {},
  notes: "RL stub — provide data/metrics to activate learning"
};
```

#### `config/learned_strategy.json` — НЕ ИСПОЛЬЗУЕТСЯ
- ❌ `build_article_spec.js` **НЕ загружает** `learned_strategy.json`
- ❌ `gen_article_blocks.js` **НЕ использует** стратегию
- ❌ Нет интеграции с системой обучения

### **Что это значит:**
- ❌ История ошибок качества **НЕ используется** в самообучении
- ❌ RL система **НЕ работает** (stubs)
- ❌ `learned_strategy.json` **НЕ влияет** на генерацию

---

## 🔍 3. СУЩЕСТВУЮЩИЕ СИСТЕМЫ ОБУЧЕНИЯ (MONSTER 7.x)

### **Есть системы, но они для MONSTER 7.x:**

1. **`scripts/seo/learning/self-learning-loop.js`**
   - Работает для MONSTER 7.x
   - Анализирует качество статей
   - Обновляет стратегию через LLM
   - **НЕ интегрирован с MONSTER 8.0**

2. **`scripts/seo/ai/ai-training-pipeline.js`**
   - Обучается на результатах
   - Обновляет `data/seo/ai-training/learned-strategy.json`
   - **НЕ используется в MONSTER 8.0**

3. **`rules/error_patterns.json`**
   - Содержит паттерны ошибок
   - Используется в MONSTER 7.x
   - **НЕ используется в MONSTER 8.0**

---

## 🎯 4. ЧТО НУЖНО ДЛЯ САМООБУЧЕНИЯ В MONSTER 8.0

### **Текущая архитектура:**

```
build_article_spec.js
  ↓ (загружает конфиги напрямую)
  ↓
gen_article_blocks.js
  ↓ (генерирует контент)
  ↓
validate_blocks.js
  ↓ (проверяет качество)
  ↓
qa_llm_blocks.js
  ↓ (LLM-QA анализ)
  ↓
render_article_from_blocks.js
  ↓ (рендерит HTML)
```

### **Что отсутствует:**

```
❌ Нет логирования ошибок качества
❌ Нет анализа паттернов ошибок
❌ Нет обновления learned_strategy.json на основе ошибок
❌ Нет применения learned_strategy в build_article_spec.js
```

---

## 🔧 5. КАК ИНТЕГРИРОВАТЬ САМООБУЧЕНИЕ

### **Вариант 1: Простая интеграция (рекомендуется)**

#### Шаг 1: Логирование ошибок качества

```javascript
// В validate_blocks.js добавить:
function logQualityError(blockId, error, topic) {
  const logPath = path.join(__dirname, "..", "data", "quality_errors.jsonl");
  const entry = {
    timestamp: new Date().toISOString(),
    topic_id: topic.topic_id,
    block_id: blockId,
    error: error.reason,
    severity: error.severity,
    wordcount: wordCount(blocks[blockId])
  };
  fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
}
```

#### Шаг 2: Использование learned_strategy в build_article_spec.js

```javascript
// Добавить в build_article_spec.js:
const learnedStrategy = loadJson("config/learned_strategy.json", {});

function applyStrategyToBlocks(topic, blocks) {
  const typeWeight = learnedStrategy.article_type_weights?.[topic.type] || 1.0;
  const langWeight = learnedStrategy.language_weights?.[topic.language] || 1.0;
  
  // Увеличиваем длину блоков если стратегия показывает успех
  return blocks.map(block => {
    if (typeWeight > 1.0) {
      const factor = (typeWeight + langWeight) / 2;
      const span = block.length.max - block.length.min;
      const grow = Math.round(span * (factor - 1) * 0.3);
      return {
        ...block,
        length: {
          min: Math.max(block.length.min, block.length.min + grow),
          max: block.length.max + grow
        }
      };
    }
    return block;
  });
}
```

#### Шаг 3: Обновление стратегии на основе ошибок

```javascript
// В rl_update_strategy.js:
function updateStrategyFromErrors() {
  const errors = loadQualityErrors(); // Читаем quality_errors.jsonl
  const strategy = loadJson("config/learned_strategy.json", {});
  
  // Анализируем паттерны
  const patterns = analyzeErrorPatterns(errors);
  
  // Обновляем веса
  patterns.forEach(pattern => {
    if (pattern.type === "article_type") {
      strategy.article_type_weights[pattern.id] = 
        (strategy.article_type_weights[pattern.id] || 1.0) * 0.95; // Уменьшаем вес при ошибках
    }
  });
  
  fs.writeFileSync("config/learned_strategy.json", JSON.stringify(strategy, null, 2));
}
```

---

## 📊 ТЕКУЩИЙ СТАТУС

### ✅ **Что работает:**
1. ✅ Обновления конфигов применяются автоматически
2. ✅ Новые блоки работают для всех новых статей
3. ✅ Валидация проверяет качество
4. ✅ LLM-QA анализирует контент

### ❌ **Что НЕ работает:**
1. ❌ Самообучение на основе ошибок качества
2. ❌ Использование `learned_strategy.json` в генерации
3. ❌ Автоматическое улучшение на основе истории
4. ❌ RL система (stubs)

---

## 🎯 РЕКОМЕНДАЦИИ

### **Для немедленного использования:**
- ✅ **Обновления применяются автоматически** — просто обновляйте конфиги
- ✅ Все новые статьи будут использовать актуальные настройки

### **Для самообучения (нужно реализовать):**
1. Добавить логирование ошибок качества
2. Интегрировать `learned_strategy.json` в `build_article_spec.js`
3. Реализовать `rl_update_strategy.js` для анализа ошибок
4. Добавить применение стратегии к длинам блоков

**Хотите, чтобы я реализовал интеграцию самообучения?**

