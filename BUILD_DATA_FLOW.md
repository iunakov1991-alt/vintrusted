# 🔄 ЦЕПОЧКА ПЕРЕДАЧИ ДАННЫХ В ГЕНЕРАЦИИ SEO СТРАНИЦ

## 📊 ОБЩАЯ СХЕМА

```
┌─────────────────────────────────────────────────────────────────┐
│                    SEOMasterPipeline                            │
│              (ctx - общий контекст для всех этапов)             │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  ctx = {                              │
        │    config,                            │
        │    pages: [],                         │
        │    urlPlan: [],                       │
        │    acceptedPages: [],                 │
        │    clusters: [],                      │
        │    metrics: {},                        │
        │    ...                                 │
        │  }                                     │
        └───────────────────────────────────────┘
                            │
                            ▼
    ┌───────────────────────────────────────────────────────────┐
    │              ПОСЛЕДОВАТЕЛЬНЫЕ ЭТАПЫ (STAGES)               │
    └───────────────────────────────────────────────────────────┘
```

---

## 🔗 ДЕТАЛЬНАЯ ЦЕПОЧКА ПЕРЕДАЧИ

### **ЭТАП 0: Pre-Build Check**
```javascript
ctx = {
  diagnosis: {...},      // ← ДОБАВЛЯЕТСЯ
  prevention: {...}      // ← ДОБАВЛЯЕТСЯ
}
```

### **ЭТАП 0.3: Seed Expansion**
```javascript
ctx = {
  ...ctx,
  seedExpansionResult: {...}  // ← ДОБАВЛЯЕТСЯ
}
// + обновляет urlFactory.updateSeeds()
// + обновляет config.targetPagesPerBuild
```

### **ЭТАП 0.5: AI Decision**
```javascript
ctx = {
  ...ctx,
  aiDecision: {...},         // ← ДОБАВЛЯЕТСЯ
  originalTarget: 10000      // ← ДОБАВЛЯЕТСЯ
}
// + обновляет config.targetPagesPerBuild
```

### **ЭТАП 1: URL Planning**
```javascript
ctx = {
  ...ctx,
  urlPlan: [                // ← ДОБАВЛЯЕТСЯ (массив объектов URL)
    {
      url: "/vin/.../.../",
      vin: "...",
      stateSlug: "...",
      make: "...",
      year: ...,
      intent: "...",
      lang: "...",
      clusterId: "...",
      priority: ...
    },
    ...
  ],
  pages: []                  // ← ИНИЦИАЛИЗИРУЕТСЯ
}
```

### **ЭТАП 2: Content Generation**
```javascript
// ВХОД: ctx.urlPlan (массив URL объектов)
// ПРОЦЕСС: для каждого item из urlPlan:
//   1. generatePageContent(item) → page объект
//   2. page добавляется в массив pages

ctx = {
  ...ctx,
  pages: [                   // ← ЗАПОЛНЯЕТСЯ (массив page объектов)
    {
      ...item,                // все поля из urlPlan
      title: "...",          // ← ДОБАВЛЯЕТСЯ
      description: "...",     // ← ДОБАВЛЯЕТСЯ
      h1: "...",             // ← ДОБАВЛЯЕТСЯ
      intro: "...",          // ← ДОБАВЛЯЕТСЯ
      baseline: {...},       // ← ДОБАВЛЯЕТСЯ
      aiText: "...",         // ← ДОБАВЛЯЕТСЯ (или пусто)
      layout: {...},         // ← ДОБАВЛЯЕТСЯ
      blocks: [...],         // ← ДОБАВЛЯЕТСЯ
      h1Variants: [...]      // ← ДОБАВЛЯЕТСЯ (если включено)
    },
    ...
  ]
}
```

### **ЭТАП 2.5: Keyword Intelligence**
```javascript
// ВХОД: ctx.pages
// ПРОЦЕСС: для каждой page:
//   1. keywordExtractor.extractFromPage(page) → {keywords, phrases}
//   2. keywordAligner.alignWithPage(page, extracted)
//   3. smartEmbedder.embedInPage(aligned, extracted)
//   4. keywordClustering.clusterKeywords(keywords)
//   5. longtailExpansion.generateLongtailVariants(page)

ctx = {
  ...ctx,
  pages: [                   // ← ОБНОВЛЯЕТСЯ
    {
      ...page,
      keywords: {             // ← ДОБАВЛЯЕТСЯ
        keywords: [...],
        phrases: [...]
      },
      keywordClusters: [...], // ← ДОБАВЛЯЕТСЯ
      longtailKeywords: [...] // ← ДОБАВЛЯЕТСЯ
    },
    ...
  ]
}
```

### **ЭТАП 2.6: Auto-Optimization**
```javascript
// ВХОД: ctx.pages
// ПРОЦЕСС: для каждой page:
//   autoOptimizer.optimizePage(page, keywords)

ctx = {
  ...ctx,
  pages: [                   // ← ОБНОВЛЯЕТСЯ (оптимизированные страницы)
    {
      ...page,
      // оптимизированные поля
    },
    ...
  ]
}
```

### **ЭТАП 2.7: i18n Localization**
```javascript
// ВХОД: ctx.pages
// ПРОЦЕСС: для каждой page:
//   1. i18nEngine.localizePage(page)
//   2. multilangSEO.optimize(localized)

ctx = {
  ...ctx,
  pages: [                   // ← ОБНОВЛЯЕТСЯ (локализованные страницы)
    {
      ...page,
      // локализованные поля
    },
    ...
  ]
}
```

### **ЭТАП 2.8: Synonym Enrichment**
```javascript
// ВХОД: ctx.pages
// ПРОЦЕСС: для каждой page:
//   synonymEngine.applySynonymsToPage(page)

ctx = {
  ...ctx,
  pages: [                   // ← ОБНОВЛЯЕТСЯ (с синонимами)
    {
      ...page,
      // обогащенные синонимами поля
    },
    ...
  ]
}
```

### **ЭТАП 3: HTML Rendering**
```javascript
// ВХОД: ctx.pages
// ПРОЦЕСС: для каждой page:
//   1. templateEngine.renderPage(page, page.layout) → HTML
//   2. searchIntent.classifyAndOptimize(page)
//   3. autoFAQ.generate(page)
//   4. contentDepth.optimize(page)
//   5. voiceSearch.optimize(page)
//   6. serpFeatures.optimizePage(page)
//   7. enhancedStructuredData.optimizePage(page)
//   8. visualOptimizer.optimizePage(page)
//   9. coreWebVitals.optimize(page)
//   10. localSEO.optimize(page)

ctx = {
  ...ctx,
  pages: [                   // ← ОБНОВЛЯЕТСЯ (с HTML)
    {
      ...page,
      html: "<!doctype html>...",  // ← ДОБАВЛЯЕТСЯ
      // оптимизированные поля
    },
    ...
  ]
}
```

### **ЭТАП 4: Uniqueness Validation**
```javascript
// ВХОД: ctx.pages
// ПРОЦЕСС: для каждой page:
//   uniquenessEngine.validateUniqueness(page) → uniqueness объект
//   фильтрация: только уникальные страницы

ctx = {
  ...ctx,
  pages: [                   // ← ФИЛЬТРУЕТСЯ (только уникальные)
    {
      ...page,
      uniqueness: {          // ← ДОБАВЛЯЕТСЯ
        isUnique: true,
        score: ...
      }
    },
    ...
  ]
}
```

### **ЭТАП 5: Quality Scoring**
```javascript
// ВХОД: ctx.pages
// ПРОЦЕСС:
//   qualityEngine.scorePages(ctx.pages) → {scored, accepted, avgQuality}

ctx = {
  ...ctx,
  pages: [...],              // ← ОБНОВЛЯЕТСЯ (с qualityScore)
  acceptedPages: [...],      // ← ДОБАВЛЯЕТСЯ (только принятые)
  avgQuality: 0.85           // ← ДОБАВЛЯЕТСЯ
}
// + predictiveIndexing.prioritizePages(scored)
// + trafficPrediction.prioritizePages(scored)
// + contentAnalytics.analyze(page)
```

### **ЭТАП 6: Clustering**
```javascript
// ВХОД: ctx.acceptedPages
// ПРОЦЕСС: для каждой page:
//   clusterEngine.registerPage(page)
//   clusterEngine.updateClusterMetrics(page.clusterId, {...})

ctx = {
  ...ctx,
  clusters: [...]            // ← ДОБАВЛЯЕТСЯ
}
```

### **ЭТАП 6.5: Internal Links**
```javascript
// ВХОД: ctx.acceptedPages, ctx.clusters
// ПРОЦЕСС:
//   1. internalLinksEngine.attachInternalLinks(acceptedPages, clusterEngine)
//   2. internalLinkOptimizer.calculatePageRank(acceptedPages)
//   3. internalLinkOptimizer.optimizeLinks(page, acceptedPages)
//   4. smartCanonical.processBatch(acceptedPages)
//   5. templateEngine.renderPage(page, layoutWithLinks) → обновленный HTML

ctx = {
  ...ctx,
  acceptedPages: [           // ← ОБНОВЛЯЕТСЯ (с internalLinks и обновленным HTML)
    {
      ...page,
      internalLinks: [...],  // ← ДОБАВЛЯЕТСЯ
      html: "<!doctype html>...",  // ← ОБНОВЛЯЕТСЯ (с internalLinks блоком)
      canonicalUrl: "..."     // ← ДОБАВЛЯЕТСЯ
    },
    ...
  ]
}
```

### **ЭТАП 7: Static Publishing**
```javascript
// ВХОД: ctx.acceptedPages
// ПРОЦЕСС: для каждой page:
//   1. templateEngine.renderPage(page, layout) → HTML (если еще нет)
//   2. contentFreshness.registerPage(page) (10% страниц)
//   3. staticArch.writeStaticFile(page, page.html) → запись на диск
//   4. incrementalBuild.updateChecksum(page) (10% страниц)
// + валидация HTML, accessibility, critical CSS (выборочно)

ctx = {
  ...ctx,
  htmlValidation: {...},     // ← ДОБАВЛЯЕТСЯ
  accessibilityCheck: {...}  // ← ДОБАВЛЯЕТСЯ
}
```

### **ЭТАП 7.5: Crawl Budget**
```javascript
// ВХОД: ctx.acceptedPages
// ПРОЦЕСС:
//   crawlBudgetEngine.generateCrawlStrategy(pages) → strategy

ctx = {
  ...ctx,
  crawlStrategy: {...}       // ← ДОБАВЛЯЕТСЯ
}
```

### **ЭТАП 8: Sitemap Generation**
```javascript
// ВХОД: ctx.acceptedPages
// ПРОЦЕСС:
//   1. sitemapPrioritizer.prioritize(acceptedPages) (если включено)
//   2. sitemapEngine.writeSitemaps(pagesForSitemap, config) → файлы sitemap.xml

// НЕ ИЗМЕНЯЕТ ctx, только пишет файлы
```

### **ЭТАП 8.5: GSC Enrichment**
```javascript
// ВХОД: ctx.acceptedPages
// ПРОЦЕСС:
//   gscIntegration.enrichPagesWithGSCData(pages) → обогащенные страницы

ctx = {
  ...ctx,
  acceptedPages: [           // ← ОБНОВЛЯЕТСЯ (с GSC данными)
    {
      ...page,
      gscData: {             // ← ДОБАВЛЯЕТСЯ
        impressions: ...,
        clicks: ...,
        ctr: ...,
        position: ...
      }
    },
    ...
  ]
}
```

### **ЭТАП 8.6: External Metrics Enrichment**
```javascript
// ВХОД: ctx.acceptedPages
// ПРОЦЕСС:
//   externalMetrics.enrichPagesWithMetrics(pages) → обогащенные страницы

ctx = {
  ...ctx,
  acceptedPages: [           // ← ОБНОВЛЯЕТСЯ (с внешними метриками)
    {
      ...page,
      bounceRate: ...,       // ← ДОБАВЛЯЕТСЯ
      timeOnPage: ...        // ← ДОБАВЛЯЕТСЯ
    },
    ...
  ]
}
```

### **ЭТАП 8.7: Conversion Enrichment**
```javascript
// ВХОД: ctx.acceptedPages
// ПРОЦЕСС:
//   conversionTracker.enrichPagesWithConversions(pages) → обогащенные страницы

ctx = {
  ...ctx,
  acceptedPages: [           // ← ОБНОВЛЯЕТСЯ (с конверсиями)
    {
      ...page,
      conversions: {          // ← ДОБАВЛЯЕТСЯ
        count: ...,
        rate: ...,
        revenue: ...
      }
    },
    ...
  ]
}
```

### **ЭТАП 9: LTR Update**
```javascript
// ВХОД: ctx.acceptedPages
// ПРОЦЕСС:
//   1. weightEngine.updateWeights(acceptedPages) → weights
//   2. configManager.saveRLState(newRlState) → сохранение в файл

// НЕ ИЗМЕНЯЕТ ctx, только обновляет RL state в файле
```

---

## 📋 КЛЮЧЕВЫЕ ОБЪЕКТЫ В ЦЕПОЧКЕ

### **1. URL Plan Item (этап 1)**
```javascript
{
  url: "/vin/1HGCM82633A004352/california/",
  vin: "1HGCM82633A004352",
  stateSlug: "california",
  stateCode: "CA",
  make: "honda",
  year: 2020,
  intent: "vin_check",
  lang: "en",
  clusterId: "vin_california_honda_vin_check",
  priority: 1.5,
  template: "vin-report"
}
```

### **2. Page Object (этап 2+)**
```javascript
{
  // Все поля из URL Plan Item
  ...item,
  
  // Контент
  title: "VIN Check for 2020 HONDA in California – Full Report",
  description: "Instant VIN check for 2020 HONDA in California...",
  h1: "VIN report for 2020 HONDA in California",
  intro: "This page explains how to read a VIN report...",
  baseline: {
    vehicleInfo: {...},
    stateRules: {...},
    ...
  },
  aiText: "...",  // или пусто для 70% страниц
  
  // Layout
  layout: {
    id: "layout-1",
    blocks: ["header", "intro", "aiAnalysis", "baseline", "cta"]
  },
  blocks: [...],
  
  // SEO
  keywords: {
    keywords: [...],
    phrases: [...]
  },
  keywordClusters: [...],
  longtailKeywords: [...],
  
  // HTML
  html: "<!doctype html>...",
  
  // Качество
  qualityScore: 0.85,
  uniqueness: {
    isUnique: true,
    score: 0.92
  },
  
  // Ссылки
  internalLinks: [...],
  canonicalUrl: "...",
  
  // Метрики (после обогащения)
  gscData: {...},
  bounceRate: 0.45,
  conversions: {...}
}
```

---

## 🔄 ПЕРЕДАЧА ДАННЫХ МЕЖДУ ЭТАПАМИ

### **Правило 1: ctx передается по ссылке**
- Все этапы получают один и тот же объект `ctx`
- Изменения в одном этапе видны в следующем

### **Правило 2: Основные массивы**
- `ctx.urlPlan` → `ctx.pages` → `ctx.acceptedPages`
- `ctx.pages` используется для промежуточной обработки
- `ctx.acceptedPages` - финальный результат после quality scoring

### **Правило 3: Обогащение данных**
- Каждый этап добавляет/обновляет поля в объектах страниц
- Данные накапливаются: `page` объект растет через этапы

### **Правило 4: Фильтрация**
- `uniqueness-validation`: фильтрует `ctx.pages` (оставляет только уникальные)
- `quality-scoring`: создает `ctx.acceptedPages` (только принятые)

---

## 🎯 КРИТИЧЕСКИЕ ТОЧКИ ПЕРЕДАЧИ

### **1. urlPlan → pages (этап 2)**
```javascript
// urlPlan: массив простых URL объектов
// pages: массив обогащенных page объектов с контентом
```

### **2. pages → acceptedPages (этап 5)**
```javascript
// pages: все сгенерированные страницы
// acceptedPages: только страницы с qualityScore >= minQualityScore
```

### **3. acceptedPages → HTML файлы (этап 7)**
```javascript
// acceptedPages: объекты в памяти
// HTML файлы: запись на диск через staticArch.writeStaticFile()
```

---

## 📊 СТРУКТУРА ctx В КОНЦЕ ПАЙПЛАЙНА

```javascript
ctx = {
  // Конфигурация
  config: {...},
  
  // URL план
  urlPlan: [...],              // исходный план
  
  // Сгенерированные страницы
  pages: [...],                // все страницы (после uniqueness)
  acceptedPages: [...],        // только принятые (после quality)
  
  // Кластеры
  clusters: [...],             // все кластеры
  
  // Метрики
  avgQuality: 0.85,
  htmlValidation: {...},
  accessibilityCheck: {...},
  crawlStrategy: {...},
  
  // AI решения
  aiDecision: {...},
  seedExpansionResult: {...},
  
  // Диагностика
  diagnosis: {...},
  prevention: {...}
}
```






