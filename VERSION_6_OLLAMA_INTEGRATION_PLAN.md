# 🚀 План интеграции: Версия 6 качество + Ollama вместо Grok

**Дата:** 2025-12-03  
**Статус:** План реализации

---

## 🎯 ЦЕЛЬ

Применить качество статей версии 6 к текущей сборке с заменой Grok на Ollama.

---

## 📊 АРХИТЕКТУРА ВЕРСИИ 6

### AI Провайдеры (версия 6):
```
1. Groq (primary) - быстрый, бесплатный, ~1,500 страниц/мин
2. DeepSeek (fallback) - надежный, качественный, ~800 страниц/мин
3. OpenAI (last resort) - дорогой
```

### Структура статей (версия 6):
- **12-14 блоков** (вместо 3 частей)
- **2000-2600 слов** (вместо 1400)
- **DMV-grade, legal, antifraud** стиль
- **6 layout вариантов**

---

## 🏗️ НОВАЯ АРХИТЕКТУРА

### AI Провайдеры (новая версия):
```
1. Ollama (primary) - быстрый, локальный, бесплатный
   - Для: Hero, Key Facts, простые секции, валидация
   - Модель: phi3 или llama3.1:8b
   - Скорость: ~2-5 сек на блок (локально)

2. DeepSeek (fallback/quality) - надежный, качественный
   - Для: Deep Explanation, Accident Intelligence, Fraud Patterns
   - Модель: deepseek-chat
   - Скорость: ~20-30 сек на блок
```

### Распределение задач:

**Ollama (быстрые блоки):**
- Hero (введение)
- Key Facts (список фактов)
- Простые секции (VIN Decoder, Technical Specs)
- Валидация качества
- Улучшение промптов

**DeepSeek (сложные блоки):**
- Deep Explanation (engineering-grade)
- Accident Intelligence (анализ паттернов)
- Fraud Patterns (антифрод экспертиза)
- Insurance Risk (анализ рисков)
- Market Value (финансовый анализ)

---

## 📋 СТРУКТУРА СТАТЬИ (12-14 БЛОКОВ)

### Порядок генерации:

1. **Hero** (Ollama) - 2-3 предложения, экспертность
2. **Key Facts** (Ollama) - 6-8 фактов, быстрое сканирование
3. **VIN Decoder** (Ollama) - структура VIN, технические детали
4. **NMVTIS** (Ollama) - объяснение системы данных
5. **Deep Explanation** (DeepSeek) - engineering-grade детали
6. **State-Specific Insights** (DeepSeek) - специфика штата
7. **Accident Intelligence** (DeepSeek) - анализ паттернов аварий
8. **Fraud Patterns** (DeepSeek) - антифрод экспертиза
9. **Market Value** (DeepSeek) - финансовая информация
10. **Insurance Risk** (DeepSeek) - анализ страховых рисков
11. **Buyer Guide** (Ollama) - actionable checklist
12. **FAQ** (Ollama) - 6-12 вопросов
13. **Internal Links** (Ollama) - внутренние ссылки
14. **CTA** (Ollama) - призыв к действию

---

## 🔧 РЕАЛИЗАЦИЯ

### Шаг 1: Активация Ollama

**Файл:** `scripts/seo/ai/local-ai-provider.js`

```javascript
class LocalAIProvider {
  async isAvailable() {
    // Проверка доступности Ollama
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      await execAsync('ollama --version', { timeout: 5000 });
      return true;
    } catch (e) {
      return false;
    }
  }

  async generateText(prompt, options = {}) {
    // Вызов Ollama через API или CLI
    const model = this.model || 'phi3';
    // Реализация через ollama API или CLI
  }
}
```

### Шаг 2: Гибридная система в AIAugmentation

**Файл:** `scripts/seo/content/ai-augmentation.js`

```javascript
async generateText(prompt, options = {}) {
  const blockType = options.blockType || 'general';
  
  // Определяем провайдера по типу блока
  const useOllama = [
    'hero', 'key_facts', 'vin_decoder', 'nmvtis', 
    'buyer_guide', 'faq', 'internal_links', 'cta'
  ].includes(blockType);
  
  if (useOllama && this.localAI && await this.localAI.isAvailable()) {
    // Генерируем через Ollama
    const content = await this.localAI.generateText(prompt, options);
    
    // Валидируем качество через Ollama
    const validation = await this.validateWithOllama(content, blockType);
    
    if (validation.score >= 0.8) {
      return content;
    } else {
      // Fallback на DeepSeek если качество низкое
      return await this.callDeepSeekAPI(prompt, options);
    }
  } else {
    // Используем DeepSeek для сложных блоков
    return await this.callDeepSeekAPI(prompt, options);
  }
}
```

### Шаг 3: Переработка промптов для 12-14 блоков

**Файл:** `scripts/seo/learning/self-learning-loop.js`

```javascript
async generateArticleWithTraining(iteration) {
  // Загружаем reference articles для структуры версии 6
  const referenceArticles = this.loadReferenceArticles();
  const highVolumeStructure = referenceArticles.highVolume;
  
  // Генерируем 12-14 блоков
  const blocks = [];
  
  // 1. Hero (Ollama)
  blocks.push(await this.generateBlock('hero', { provider: 'ollama' }));
  
  // 2. Key Facts (Ollama)
  blocks.push(await this.generateBlock('key_facts', { provider: 'ollama' }));
  
  // 3. VIN Decoder (Ollama)
  blocks.push(await this.generateBlock('vin_decoder', { provider: 'ollama' }));
  
  // 4. NMVTIS (Ollama)
  blocks.push(await this.generateBlock('nmvtis', { provider: 'ollama' }));
  
  // 5. Deep Explanation (DeepSeek)
  blocks.push(await this.generateBlock('deep_explanation', { provider: 'deepseek' }));
  
  // 6. State-Specific Insights (DeepSeek)
  blocks.push(await this.generateBlock('state_specific', { provider: 'deepseek' }));
  
  // 7. Accident Intelligence (DeepSeek)
  blocks.push(await this.generateBlock('accident_intelligence', { provider: 'deepseek' }));
  
  // 8. Fraud Patterns (DeepSeek)
  blocks.push(await this.generateBlock('fraud_patterns', { provider: 'deepseek' }));
  
  // 9. Market Value (DeepSeek)
  blocks.push(await this.generateBlock('market_value', { provider: 'deepseek' }));
  
  // 10. Insurance Risk (DeepSeek)
  blocks.push(await this.generateBlock('insurance_risk', { provider: 'deepseek' }));
  
  // 11. Buyer Guide (Ollama)
  blocks.push(await this.generateBlock('buyer_guide', { provider: 'ollama' }));
  
  // 12. FAQ (Ollama)
  blocks.push(await this.generateBlock('faq', { provider: 'ollama' }));
  
  // 13. Internal Links (Ollama)
  blocks.push(await this.generateBlock('internal_links', { provider: 'ollama' }));
  
  // 14. CTA (Ollama)
  blocks.push(await this.generateBlock('cta', { provider: 'ollama' }));
  
  // Объединяем блоки
  const article = this.assembleArticle(blocks);
  
  return article;
}
```

### Шаг 4: Промпты для каждого блока

**Структура промптов на основе reference articles:**

```javascript
const blockPrompts = {
  hero: {
    provider: 'ollama',
    prompt: `Write a hero section (2-3 sentences) for a VIN check guide for ${year} ${make} ${model} in ${state}.
    
Style: DMV-grade, expert authority, state-specific context.
Reference: ${referenceArticles.highVolume.hero}`
  },
  
  deep_explanation: {
    provider: 'deepseek',
    prompt: `Write a deep explanation section (400-500 words) for a VIN check guide.
    
Style: Engineering-grade, layered data streams, risk pattern evaluation.
Reference: ${referenceArticles.highVolume.structure.deep_explanation}`
  },
  
  accident_intelligence: {
    provider: 'deepseek',
    prompt: `Write an accident intelligence section (300-400 words) analyzing collision patterns.
    
Style: Data-driven, pattern recognition, expert analysis.
Reference: ${referenceArticles.highVolume.structure.accident_intelligence}`
  },
  
  // ... остальные блоки
};
```

---

## 📊 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ

### Качество:
- **Текущее:** 1400 слов, 3 части, Quality 1.00
- **С версией 6:** 2000-2600 слов, 12-14 блоков, Quality 1.00+
- **Улучшение:** +40-85% контента, больше глубины

### Скорость:
- **Ollama блоки:** 2-5 сек на блок (локально)
- **DeepSeek блоки:** 20-30 сек на блок
- **Общее время:** ~3-5 минут на статью (вместо 1.5-2 минут)
- **НО:** Качество значительно выше

### Стоимость:
- **Ollama:** $0 (локально)
- **DeepSeek:** Только для 6-7 сложных блоков (вместо всех 3 частей)
- **Экономия:** -50-60% стоимости DeepSeek

---

## ✅ ПРЕИМУЩЕСТВА

1. **Качество версии 6** - 12-14 блоков, 2000-2600 слов
2. **Скорость Ollama** - быстрые блоки локально
3. **Качество DeepSeek** - сложные блоки через API
4. **Экономия** - меньше вызовов DeepSeek
5. **Надежность** - локальная генерация не зависит от API

---

## 🚀 ПЛАН ВНЕДРЕНИЯ

### Фаза 1: Активация Ollama (1 час)
- [ ] Включить Ollama в local-ai-provider.js
- [ ] Добавить проверку доступности
- [ ] Реализовать generateText через Ollama API

### Фаза 2: Гибридная система (2 часа)
- [ ] Добавить выбор провайдера по типу блока
- [ ] Реализовать валидацию через Ollama
- [ ] Добавить fallback на DeepSeek

### Фаза 3: Структура версии 6 (3 часа)
- [ ] Переработать промпты для 12-14 блоков
- [ ] Интегрировать reference articles
- [ ] Добавить все блоки версии 6

### Фаза 4: Тестирование (1 час)
- [ ] Протестировать генерацию всех блоков
- [ ] Проверить качество и скорость
- [ ] Оптимизировать промпты

**Общее время:** ~7 часов

---

*Создано: 2025-12-03*  
*Версия: 1.0*











