# 🤖 AI ЛОГИКА ОПРЕДЕЛЕНИЯ ОБЪЕМОВ БИЛДА

## 📋 ЦЕЛЬ

AI Seed Expansion Engine определяет **оптимальный объем предстоящего билда** на основе анализа эффективности, ограничений и пробелов в покрытии.

---

## 🧠 ФАКТОРЫ АНАЛИЗА

### 1. Анализ предыдущих билдов
**Источники данных:**
- `data/seo/build-history.jsonl` - история билдов
- Метрики качества страниц
- Конверсии и трафик (если доступно)
- Эффективность разных объемов

**Что анализируется:**
- Какие объемы билдов дали лучшие результаты
- Соотношение объем/качество
- Оптимальные объемы для разных этапов
- Тренды эффективности

### 2. Анализ ограничений ресурсов
**Ограничения:**
- Groq лимиты: 150-200 страниц/день (TPD лимит)
- DeepSeek: неограниченно
- Кеш: сколько страниц можно взять из кеша
- Время билда: максимальное время на Vercel

**Расчет:**
- Доступные ресурсы Groq на сегодня
- Доступные ресурсы DeepSeek
- Размер кеша и процент попаданий

### 3. Анализ пробелов в покрытии
**Что анализируется:**
- Отсутствующие бренды/модели/годы
- Непокрытые штаты
- Пустые комбинации brand × model × year
- Пробелы в intent покрытии

**Расчет:**
- Сколько страниц нужно для заполнения пробелов
- Приоритеты заполнения (по потенциальному трафику)

### 4. Анализ эффективности этапов
**Что анализируется:**
- На каком этапе (количество страниц) эффективность максимальна
- Когда начинается снижение качества
- Оптимальные объемы для разных целей:
  - Максимизация трафика
  - Максимизация конверсий
  - Заполнение пробелов
  - Улучшение качества

---

## 🎯 AI РЕКОМЕНДАЦИИ

### Примеры логики:

**Сценарий 1: Первый билд (0 страниц)**
```json
{
  "recommended_build_volume": 300,
  "reasoning": "Первый билд: оптимальный объем 300 страниц для тестирования системы и заполнения базового покрытия. Использование Groq: 150 страниц (критичные), DeepSeek: 150 страниц (массовые).",
  "build_strategy": {
    "groq_pages": 150,
    "deepseek_pages": 150,
    "cached_pages": 0,
    "priority_order": ["missing_coverage", "high_traffic_potential"]
  }
}
```

**Сценарий 2: Малый объем (50-100 страниц)**
```json
{
  "recommended_build_volume": 200,
  "reasoning": "Текущий объем 50 страниц. Анализ показал, что оптимально увеличить до 200 для лучшего покрытия. Groq лимит позволяет 150 страниц, используем для топ-страниц.",
  "build_strategy": {
    "groq_pages": 150,
    "deepseek_pages": 50,
    "cached_pages": 0,
    "priority_order": ["quality_boost", "missing_coverage"]
  }
}
```

**Сценарий 3: Средний объем (500-1000 страниц)**
```json
{
  "recommended_build_volume": 800,
  "reasoning": "Текущий объем 500 страниц. Анализ эффективности показал, что объем 800 страниц оптимален для текущего этапа. Groq: 150 (топ-страницы), DeepSeek: 650 (массовые), кеш: 50%.",
  "build_strategy": {
    "groq_pages": 150,
    "deepseek_pages": 650,
    "cached_pages": 400,
    "priority_order": ["traffic_maximization", "conversion_optimization"]
  }
}
```

**Сценарий 4: Большой объем (5000+ страниц)**
```json
{
  "recommended_build_volume": 10000,
  "reasoning": "Текущий объем 5000 страниц. Анализ показал, что для масштабирования оптимален объем 10000. Groq: 150 (критичные), DeepSeek: 9850 (массовые), кеш: 70%.",
  "build_strategy": {
    "groq_pages": 150,
    "deepseek_pages": 9850,
    "cached_pages": 7000,
    "priority_order": ["scale_up", "coverage_completion"]
  }
}
```

---

## 🔧 РЕАЛИЗАЦИЯ

### Метод `calculateOptimalVolume()`

```javascript
calculateOptimalVolume({ analysis, aiAnalysis, buildHistory, resourceLimits }) {
  // 1. Базовый расчет на основе пробелов
  const gapsVolume = this.calculateGapsVolume(analysis.gaps);
  
  // 2. Анализ эффективности предыдущих объемов
  const optimalVolumeFromHistory = this.findOptimalVolumeFromHistory(buildHistory);
  
  // 3. Учет ограничений ресурсов
  const maxVolumeFromResources = this.calculateMaxVolumeFromResources(resourceLimits);
  
  // 4. AI рекомендация на основе всех факторов
  const aiRecommendedVolume = aiAnalysis.recommendedVolume;
  
  // 5. Выбор оптимального объема
  const recommendedVolume = Math.min(
    gapsVolume,
    optimalVolumeFromHistory,
    maxVolumeFromResources,
    aiRecommendedVolume
  );
  
  // 6. Fallback: если данных нет, используем консервативный объем
  if (!recommendedVolume || recommendedVolume < 100) {
    return 300; // Консервативный объем для первого билда
  }
  
  return recommendedVolume;
}
```

### Метод `determineBuildStrategy()`

```javascript
determineBuildStrategy(recommendedVolume, resourceLimits) {
  const strategy = {
    groq_pages: 0,
    deepseek_pages: 0,
    cached_pages: 0,
    priority_order: []
  };
  
  // 1. Определяем, сколько можно через Groq (лимит 150-200/день)
  const groqAvailable = resourceLimits.groqDailyLimit - resourceLimits.groqUsedToday;
  strategy.groq_pages = Math.min(150, groqAvailable, Math.floor(recommendedVolume * 0.2));
  
  // 2. Остальное через DeepSeek
  strategy.deepseek_pages = recommendedVolume - strategy.groq_pages;
  
  // 3. Учитываем кеш (если есть)
  const cacheHitRate = this.calculateCacheHitRate();
  strategy.cached_pages = Math.floor(strategy.deepseek_pages * cacheHitRate);
  strategy.deepseek_pages -= strategy.cached_pages;
  
  // 4. Определяем приоритеты
  if (analysis.gaps.missingCoverage > 0.5) {
    strategy.priority_order.push('missing_coverage');
  }
  if (buildHistory.avgQuality < 0.75) {
    strategy.priority_order.push('quality_boost');
  }
  if (buildHistory.avgTraffic > 100) {
    strategy.priority_order.push('traffic_maximization');
  }
  
  return strategy;
}
```

---

## 📊 ИНТЕГРАЦИЯ В PIPELINE

```javascript
// В seo-master-build.js, этап seed-expansion
pipeline.registerStage('seed-expansion', async (ctx) => {
  const seedExpansionEngine = new SeedExpansionEngine(config);
  const result = await seedExpansionEngine.expandSeedsBeforeBuild();
  
  ctx.seedExpansionResult = result;
  
  // Обновляем config с AI рекомендацией
  if (result.recommended_build_volume) {
    config.targetPagesPerBuild = result.recommended_build_volume;
    log('SEED-EXPANSION', `AI recommended build volume: ${result.recommended_build_volume}`);
    log('SEED-EXPANSION', `Reasoning: ${result.reasoning}`);
    log('SEED-EXPANSION', `Strategy: Groq=${result.build_strategy.groq_pages}, DeepSeek=${result.build_strategy.deepseek_pages}, Cached=${result.build_strategy.cached_pages}`);
  }
  
  // Обновляем urlFactory
  if (result.expanded_seed_list) {
    urlFactory.updateSeeds(result.expanded_seed_list);
  }
});
```

---

## ✅ КРИТЕРИИ УСПЕХА

1. ✅ AI определяет объем на основе анализа эффективности
2. ✅ Учитываются ограничения ресурсов (Groq лимиты)
3. ✅ Учитываются пробелы в покрытии
4. ✅ Рекомендация обоснована reasoning
5. ✅ Стратегия распределения (Groq vs DeepSeek vs кеш)
6. ✅ Fallback на консервативный объем, если данных нет

---

## 🎯 РЕЗУЛЬТАТ

AI автоматически определяет оптимальный объем билда для максимальной эффективности на каждом этапе развития системы, учитывая все факторы и ограничения.


