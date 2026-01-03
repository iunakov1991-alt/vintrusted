# 📚 REFERENCE ARTICLES — TRAINING CORPUS

**Цель:** Эталонные статьи для обучения AI генерации контента разного качества и вариативности.

---

## 📁 СТРУКТУРА ФАЙЛОВ

### ✅ Эталонные статьи (высокое качество)

1. **`high-volume-california-vin.json`** — VЧ статья
   - Запрос: "VIN Check California"
   - 2000-2600 слов
   - 12-14 блоков
   - DMV-grade, legal, antifraud

2. **`mid-volume-toyota-camry.json`** — СЧ статья
   - Запрос: "2015 Toyota Camry VIN decoder"
   - 1200-1700 слов
   - 6-8 блоков
   - Vehicle-specific depth

3. **`low-volume-odometer-verification.json`** — НЧ статья
   - Запрос: "How to verify odometer from smog check logs"
   - 800-1100 слов
   - 4-6 блоков
   - Instructive, technical

### ⚠️ Примеры плохого качества

4. **`bad-examples.json`** — Плохие и средние примеры
   - Bad sample: шаблонный, низкое качество
   - Mid sample: среднее качество, недостаточно глубины
   - Уроки: что избегать, что требуется

### 🎨 Система вариативности

5. **`variability-system.json`** — Эталон вариативности
   - 6 вариантов layout (A-F)
   - Правила вариации блоков
   - Анти-шаблонные правила

---

## 🎯 КАК ИСПОЛЬЗОВАТЬ

### Для обучения AI:

1. **Загрузить эталонные статьи** в knowledge base
2. **Показать плохие примеры** как что НЕ делать
3. **Применить систему вариативности** для генерации уникальных статей

### Интеграция в код:

```javascript
// В ai-training-pipeline.js
async loadReferenceArticles() {
  const highVolume = require('./reference-articles/high-volume-california-vin.json');
  const midVolume = require('./reference-articles/mid-volume-toyota-camry.json');
  const lowVolume = require('./reference-articles/low-volume-odometer-verification.json');
  const badExamples = require('./reference-articles/bad-examples.json');
  const variability = require('./reference-articles/variability-system.json');
  
  // Добавить в knowledge base
  this.appendKnowledge({
    phase: 'reference-articles',
    type: 'quality-examples',
    highVolume,
    midVolume,
    lowVolume,
    badExamples,
    variability
  });
}
```

---

## 📊 КРИТЕРИИ КАЧЕСТВА

### Высокое качество (VЧ):
- ✅ 2000-2600 слов
- ✅ 12-14 блоков
- ✅ Expert-grade explanations
- ✅ State-specific insights
- ✅ Fraud pattern analysis
- ✅ High E-E-A-T score

### Среднее качество (СЧ):
- ✅ 1200-1700 слов
- ✅ 6-8 блоков
- ✅ Vehicle-specific depth
- ✅ Engineering clarity

### Низкое качество (НЧ):
- ✅ 800-1100 слов
- ✅ 4-6 блоков
- ✅ Instructive, technical
- ✅ Focused depth

---

## 🚫 ЧТО ИЗБЕГАТЬ

См. `bad-examples.json` для полного списка анти-паттернов.

---

**Дата создания:** 2025-12-03  
**Версия:** 1.0  
**Статус:** ✅ Готово к использованию



















