# 📚 ПАМЯТЬ ОБУЧЕНИЯ — ЧТО ЕСТЬ И КАК ПРИМЕНЯЕТСЯ

**Дата:** 2025-12-06  
**Статус:** ✅ Активная система обучения с применением в генерации

---

## 🎯 ЧТО ЕСТЬ В ПАМЯТИ ОБУЧЕНИЯ

### 1. ✅ **Learned Strategy** (`data/seo/ai-training/learned-strategy.json`)

**Содержимое:**
- `core_principles` — основные принципы SEO (Google docs, E-E-A-T)
- `content_strategy` — стратегия контента (структура, глубина, формат)
- `unique_approaches` — уникальные подходы (152-секционная структура, семантические слои)
- `performance_adaptations` — адаптации на основе результатов
- `lastUpdated` — дата последнего обновления

**Пример:**
```json
{
  "core_principles": [
    "Follow Google official documentation and Search Essentials",
    "Focus on quality content with demonstrated expertise (E-E-A-T)",
    "Build comprehensive entity graph structure"
  ],
  "content_strategy": {
    "target_word_count": "3000-4000 words minimum",
    "section_coverage": "Ensure each educational section maintains substantive depth"
  },
  "unique_approaches": [
    "Real-structure educational adaptation: Use observed 152-section organization",
    "Semantic layering: Cover vehicle history topics at multiple depth levels"
  ]
}
```

---

### 2. ✅ **Knowledge Base** (`data/seo/ai-training/knowledge-base.jsonl`)

**Содержимое:**
- Кэшированные блоки контента (hero, key_facts, vin_decoder, etc.)
- Хеш-ключи для быстрого поиска
- Тексты блоков для переиспользования

**Формат:**
```jsonl
{"key":"64fef909e4473b9ee0a1801e95092da5e5cb5714","text":"California's stringent emissions..."}
{"key":"41c15484aff8d2c938d58c965219b8417d569f69","text":"* **DMV Odometer Fraud-Gap Indexing:**..."}
```

**Размер:** 4557+ записей (по состоянию на 2025-12-06)

---

### 3. ✅ **Canonical Prompts** (`data/seo/ai-training/canonical-prompts/`)

**Файлы:**
- `hero.txt` — промпт для hero-блока
- `key_facts.txt` — промпт для key_facts
- `vin_decoder.txt` — промпт для VIN декодера
- `faq.txt` — промпт для FAQ
- `buyer_guide.txt` — промпт для гайда покупателя
- `accident_intelligence.txt` — промпт для анализа аварий
- `fraud_patterns.txt` — промпт для выявления мошенничества
- `insurance_risk.txt` — промпт для анализа страховки
- `market_value.txt` — промпт для рыночной стоимости
- `state_specific.txt` — промпт для штат-специфичного контента
- `internal_links.txt` — промпт для внутренних ссылок
- `cta.txt` — промпт для CTA
- `deep_explanation.txt` — промпт для глубоких объяснений
- `nmvtis.txt` — промпт для NMVTIS
- `recalls_tsbs.txt` — промпт для отзывов и TSB

**Использование:** Загружаются через `CanonicalPromptsLoader` и применяются в генерации блоков

---

### 4. ✅ **Reference Articles** (`data/seo/ai-training/reference-articles/`)

**Файлы:**
- `high-volume-california-vin.json` — пример высокообъемной статьи
- `mid-volume-toyota-camry.json` — пример среднеобъемной статьи
- `low-volume-odometer-verification.json` — пример низкообъемной статьи
- `bad-examples.json` — примеры плохих статей (что не делать)
- `variability-system.json` — система вариативности

**Использование:** Используются как примеры для обучения AI генерации качественного контента

---

### 5. ✅ **Block Config** (`data/seo/ai-training/block-config.json`)

**Содержимое:**
- Конфигурация блоков (длины, стили, роли)
- Настройки для разных типов блоков

---

### 6. ✅ **TRIZ Principles** (`data/seo/ai-training/triz-principles.json`)

**Содержимое:**
- TRIZ техники для решения противоречий
- Разрешенные противоречия
- Применение в генерации контента

---

### 7. ✅ **Technical Terms Whitelist** (`data/seo/ai-training/technical-terms-whitelist.json`)

**Содержимое:**
- Разрешенные технические термины
- Используется для валидации контента

---

### 8. ✅ **VIN Decoder Canon** (`data/seo/ai-training/vin-decoder-canon.json`)

**Содержимое:**
- Канонические примеры декодирования VIN
- Используется для генерации точных VIN-декодеров

---

### 9. ✅ **GA4/GTM/Search Console Docs** (`data/seo/ai-training/ga4-gtm-search-console-docs.jsonl`)

**Содержимое:**
- Официальная документация Google Analytics 4
- Google Tag Manager документация
- Google Search Console документация

**Использование:** Обучение AI правильному использованию аналитики

---

### 10. ✅ **VIN Report Training Data** (`data/seo/ai-training/vin-report-training-data.jsonl`)

**Содержимое:**
- Примеры реальных VIN-отчетов
- Используется для обучения структуре отчетов

---

## 🔄 КАК ПРИМЕНЯЕТСЯ ОБУЧЕНИЕ

### **1. При генерации блоков (`build_article_spec.js`)**

**Файл:** `scripts/build_article_spec.js`

**Как работает:**
```javascript
// Загружается learned-strategy.json
const learnedStrategy = loadJson("data/seo/ai-training/learned-strategy.json", {});

// Применяется к блокам через applyStrategyToBlocks()
function applyStrategyToBlocks(topic, blocks) {
  // Получаем веса из learned_strategy
  const typeWeight = learnedStrategy.article_type_weights?.[topic.type] || 1.0;
  const langWeight = learnedStrategy.language_weights?.[topic.language || "en"] || 1.0;
  const audWeight = learnedStrategy.audience_weights?.[topic.audience_segment || "us_general"] || 1.0;
  const zoneWeight = learnedStrategy.zone_priority?.[topic.zone] || 1.0;
  
  // Комбинированный фактор
  let factor = (typeWeight * 0.4 + langWeight * 0.3 + audWeight * 0.2 + zoneWeight * 0.1);
  
  // Применяем length_mode (short/long)
  if (lengthMode === "short") {
    factor *= 0.7; // Уменьшаем на 30%
  } else if (lengthMode === "long") {
    factor *= 1.3; // Увеличиваем на 30%
  }
  
  // Корректируем длину блоков на основе фактора
  return blocks.map(block => ({
    ...block,
    length: Math.round(block.length * factor)
  }));
}
```

**Результат:**
- ✅ Успешные типы статей → увеличивается длина блоков
- ✅ Проблемные типы → уменьшается длина блоков
- ✅ Приоритетные зоны → больше внимания

---

### **2. При обогащении промптов (`ai-augmentation.js`)**

**Файл:** `scripts/seo/content/ai-augmentation.js`

**Как работает:**
```javascript
class AIAugmentation {
  constructor(config) {
    // Автоматически загружает learned-strategy.json
    this.loadAITrainingStrategy();
  }
  
  loadAITrainingStrategy() {
    const strategyPath = path.join(process.cwd(), 'data/seo/ai-training/learned-strategy.json');
    if (fs.existsSync(strategyPath)) {
      this.aiStrategy = JSON.parse(fs.readFileSync(strategyPath, 'utf8'));
    }
  }
  
  enrichPromptWithStrategy(originalPrompt, options) {
    if (!this.aiStrategy) return originalPrompt;
    
    let enrichedPrompt = originalPrompt;
    
    // Добавляем core principles
    if (this.aiStrategy.core_principles) {
      enrichedPrompt += `\n\nCORE SEO PRINCIPLES:\n${this.aiStrategy.core_principles.join('\n')}\n`;
    }
    
    // Добавляем content strategy
    if (this.aiStrategy.content_strategy) {
      enrichedPrompt += `\nCONTENT STRATEGY:\n${JSON.stringify(this.aiStrategy.content_strategy, null, 2)}\n`;
    }
    
    // Добавляем unique approaches
    if (this.aiStrategy.unique_approaches) {
      enrichedPrompt += `\nUNIQUE APPROACHES:\n${this.aiStrategy.unique_approaches.join('\n')}\n`;
    }
    
    return enrichedPrompt;
  }
}
```

**Результат:**
- ✅ Промпты обогащаются стратегией перед отправкой в LLM
- ✅ AI генерирует контент с учетом обученных принципов
- ✅ Качество контента улучшается на основе опыта

---

### **3. При кэшировании блоков (`ai-cache.jsonl`)**

**Файл:** `data/seo/ai-cache.jsonl`

**Как работает:**
- Кэшируются успешно сгенерированные блоки
- Хеш-ключи для быстрого поиска
- Переиспользование при похожих запросах

**Пример:**
```jsonl
{"key":"64fef909e4473b9ee0a1801e95092da5e5cb5714","text":"California's stringent emissions..."}
```

**Использование:**
- При генерации похожих блоков → проверяется кэш
- Если найден → используется кэшированный блок
- Если нет → генерируется новый и кэшируется

---

### **4. При загрузке канонических промптов**

**Файл:** `scripts/seo/learning/canonical-prompts-loader.js`

**Как работает:**
```javascript
class CanonicalPromptsLoader {
  constructor() {
    this.promptsDir = path.join(process.cwd(), 'data/seo/ai-training/canonical-prompts');
  }
  
  loadPrompt(blockType) {
    const promptPath = path.join(this.promptsDir, `${blockType}.txt`);
    if (fs.existsSync(promptPath)) {
      return fs.readFileSync(promptPath, 'utf8');
    }
    return null;
  }
}
```

**Результат:**
- ✅ Каждый тип блока использует оптимизированный промпт
- ✅ Промпты основаны на успешных примерах
- ✅ Консистентность качества контента

---

### **5. При валидации контента**

**Файл:** `scripts/seo/learning/article-validator.js`

**Как работает:**
- Использует `technical-terms-whitelist.json` для проверки терминов
- Использует `reference-articles/` для сравнения качества
- Логирует ошибки в `data/quality_logs/quality_errors.jsonl`

**Результат:**
- ✅ Ошибки логируются для последующего обучения
- ✅ Качество контролируется на основе обученных паттернов

---

## 📊 ПРИМЕРЫ ПРИМЕНЕНИЯ

### **Пример 1: Корректировка длины блоков**

**До обучения:**
- `dmv_state_guide` → стандартная длина (300 слов)

**После обучения:**
- `dmv_state_guide` → `article_type_weights.dmv_state_guide = 1.2`
- Длина блоков увеличивается на 20%
- Результат: более глубокий контент для успешных типов

---

### **Пример 2: Обогащение промпта**

**Оригинальный промпт:**
```
Write a VIN check guide for California...
```

**Обогащенный промпт (с обучением):**
```
Write a VIN check guide for California...

CORE SEO PRINCIPLES:
- Follow Google official documentation and Search Essentials
- Focus on quality content with demonstrated expertise (E-E-A-T)
- Build comprehensive entity graph structure

CONTENT STRATEGY:
- Target word count: 3000-4000 words minimum
- Ensure each educational section maintains substantive depth

UNIQUE APPROACHES:
- Use observed 152-section organization from actual VIN reports
- Cover vehicle history topics at multiple educational depth levels
```

**Результат:** AI генерирует более качественный контент с учетом обученных принципов

---

### **Пример 3: Кэширование блоков**

**Первый запрос:**
- Генерируется hero-блок для "California DMV title types"
- Сохраняется в кэш с ключом `64fef909e4473b9ee0a1801e95092da5e5cb5714`

**Второй запрос (похожий):**
- Проверяется кэш → найден
- Используется кэшированный блок (быстрее, дешевле)
- Результат: ускорение генерации на 50-70%

---

## 🔄 ОБНОВЛЕНИЕ ПАМЯТИ ОБУЧЕНИЯ

### **Автоматическое обновление:**

1. **Сбор метрик:**
   - `scripts/rl_ingest_metrics.js` — собирает ошибки из `quality_logs/`
   - Агрегирует по типам статей, языкам, аудиториям

2. **Обновление стратегии:**
   - `scripts/rl_update_strategy.js` — обновляет веса в `learned-strategy.json`
   - Увеличивает веса для успешных типов
   - Уменьшает веса для проблемных типов

3. **Применение:**
   - Новые статьи автоматически используют обновленную стратегию
   - Не нужно перезапускать сервисы

---

## ✅ ИТОГ

**Что есть в памяти:**
- ✅ Learned Strategy (принципы, стратегии, подходы)
- ✅ Knowledge Base (4557+ кэшированных блоков)
- ✅ Canonical Prompts (15+ оптимизированных промптов)
- ✅ Reference Articles (примеры хороших/плохих статей)
- ✅ Block Config (конфигурация блоков)
- ✅ TRIZ Principles (техники решения противоречий)
- ✅ Technical Terms Whitelist (разрешенные термины)
- ✅ VIN Decoder Canon (канонические примеры)
- ✅ GA4/GTM/GSC Docs (официальная документация)
- ✅ VIN Report Training Data (примеры отчетов)

**Как применяется:**
- ✅ Корректировка длины блоков на основе весов
- ✅ Обогащение промптов стратегией
- ✅ Кэширование и переиспользование блоков
- ✅ Использование канонических промптов
- ✅ Валидация на основе обученных паттернов

**Результат:**
- ✅ Качество контента улучшается со временем
- ✅ Скорость генерации увеличивается (кэширование)
- ✅ Консистентность качества (канонические промпты)
- ✅ Автоматическая адаптация (обновление стратегии)

---

## 🚀 ЗАПУСК ОБУЧЕНИЯ

```bash
# Обновить стратегию на основе метрик
node scripts/rl_update_strategy.js

# Запустить полный цикл обучения
node scripts/seo/ai/ai-training-pipeline.js
```

**Все работает автоматически!** 🎯

