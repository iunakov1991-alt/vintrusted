# 🎯 ПЛАН ИНТЕГРАЦИИ ФАЗОВЫХ УЛУЧШЕНИЙ + AI SEED EXPANSION

## 📋 КРИТЕРИИ ПЛАНИРОВАНИЯ

- ✅ Не ломать текущую систему
- ✅ Учитывать ограничения (Groq: 150-200 страниц/день)
- ✅ Только эффективные решения
- ✅ Поэтапная интеграция с тестированием
- ✅ Изоляция модулей
- ✅ Fallback механизмы

---

## 🚀 ЭТАП 1: AI SEED EXPANSION (ПРИОРИТЕТ #1)

### Цель
Автоматическое расширение seed-листа перед каждым билдом для оптимального покрытия.

### Модули

#### 1.1 Seed Analyzer (`scripts/seo/seeds/seed-analyzer.js`)
**Функционал:**
- Анализ текущего seed-list из `data/seo/url-seeds.json`
- Анализ созданных страниц из `public/vin/`
- Анализ GSC данных (если доступно)
- Выявление пробелов в покрытии

**Особенности:**
- Работает без GSC (только внутренняя структура)
- Изолированный модуль
- Без side-effects

#### 1.2 Seed Generator (`scripts/seo/seeds/seed-generator.js`)
**Функционал:**
- Определение отсутствующих брендов/моделей/лет
- Выявление непокрытых штатов
- Генерация error-VIN вариаций
- Формирование расширенного seed-list

**Особенности:**
- Детерминированная логика
- Конфигурируемые параметры
- Без AI (чистая логика)

#### 1.3 Seed Expansion Engine (`scripts/seo/seeds/seed-expansion-engine.js`)
**Функционал:**
- Координация Analyzer + Generator
- AI-анализ пробелов (DeepSeek, не Groq!)
- **AI-определение оптимального объема билда** на основе:
  - Анализа предыдущих билдов (эффективность, качество, метрики)
  - Ограничений ресурсов (Groq лимиты, API квоты)
  - Пробелов в покрытии (сколько нужно для заполнения)
  - Стратегии распределения (Groq vs DeepSeek vs кеш)
- Расчет recommended_build_volume с обоснованием
- Возврат JSON с расширенным seed-list и стратегией билда

**AI Использование:**
- Только DeepSeek (экономия Groq)
- 1 запрос на билд для анализа и рекомендаций
- Кеширование результатов анализа

**Интеграция:**
```javascript
// Этап 0.3: Seed Expansion (перед ai-decision)
pipeline.registerStage('seed-expansion', async (ctx) => {
  const seedExpansionEngine = new SeedExpansionEngine(config);
  const result = await seedExpansionEngine.expandSeedsBeforeBuild();
  ctx.seedExpansionResult = result;
  // Обновляем urlFactory с новым seed-list
  urlFactory.updateSeeds(result.expanded_seed_list);
});
```

**Безопасность:**
- Fallback: если AI недоступен, используем текущий seed-list
- Валидация: проверка формата расширенного seed-list
- Логирование: все действия логируются

---

## 🚀 ЭТАП 2: PHASE A - ПРИОРИТЕТ 1 (SEO ФУНДАМЕНТ)

### 2.1 Breadcrumbs (Приоритет 1.3)
**Почему первым:**
- Простая интеграция
- Нет зависимости от других модулей
- Немедленный SEO эффект

**Реализация:**
- Уже есть в `template-engine-absolute.js` (откачено)
- Нужно вернуть метод `renderBreadcrumbs()`
- Добавить в `renderPage()` после header

**Безопасность:**
- Опциональный блок (если нет данных - не рендерится)
- Не влияет на существующие страницы

### 2.2 Tier-based Canonical Logic (Приоритет 1.4)
**Почему вторым:**
- Критично для SEO
- Предотвращает дублирование
- Изолированный модуль

**Реализация:**
- Создать `scripts/seo/links/canonical-engine.js`
- Интеграция в pipeline после `quality-scoring`
- Обновить `template-engine-absolute.js` для использования `page.canonicalUrl`

**Безопасность:**
- Каждая страница получает canonical (даже если сама себе)
- Fallback: если нет canonical - используется `page.url`
- Не ломает существующие страницы

### 2.3 Internal Authority Graph (Приоритет 1.1)
**Почему третьим:**
- Улучшает внутреннюю перелинковку
- Зависит от существующих страниц
- Интегрируется с `internal-links-engine`

**Реализация:**
- Создать `scripts/seo/links/authority-graph-engine.js`
- Интеграция в `internal-links-engine.js`
- Опциональный (через `config.useAuthorityGraph`)

**Безопасность:**
- Опциональный через config
- Fallback: если отключен - используется текущая логика
- Не влияет на существующие ссылки

### 2.4 Landing Hubs (Приоритет 1.2)
**Почему четвертым:**
- Требует генерации новых страниц
- Зависит от Authority Graph
- Более сложная интеграция

**Реализация:**
- Создать `scripts/seo/hubs/landing-hubs-engine.js`
- Интеграция в pipeline после `clustering`
- Генерация hub страниц в `public/make/`, `public/make/{make}/year/`
- Обновление `vercel.json` для hub routes

**Безопасность:**
- Отдельные файлы (не перезаписывают VIN страницы)
- Опциональный через config
- Fallback: если отключен - пропускается

---

## 🚀 ЭТАП 3: PHASE A - ПРИОРИТЕТ 2 (КОНТЕНТ ОПТИМИЗАЦИЯ)

### 3.1 Adaptive H1 Switching (Приоритет 2.1)
**Почему первым:**
- Простая реализация
- Нет внешних зависимостей
- Немедленный эффект

**Реализация:**
- Создать `scripts/seo/content/h1-variants-engine.js`
- Интеграция в `content-generation` stage
- 3-5 вариантов H1 на страницу
- Детерминированный выбор по URL hash

**Безопасность:**
- Fallback: если нет вариантов - используется текущий H1
- Не ломает существующие страницы

### 3.2 Synonym-ecosystem (Приоритет 2.3)
**Почему вторым:**
- Улучшает разнообразие контента
- Интегрируется после локализации
- Изолированный модуль

**Реализация:**
- Создать `scripts/seo/content/synonym-engine.js`
- Интеграция в pipeline после `i18n-localization`
- Минимум 4 синонимичных пути
- Детерминированная замена

**Безопасность:**
- Опциональный через config
- Fallback: если отключен - контент без изменений
- Не влияет на качество

### 3.3 Dynamic Meta Descriptions (Приоритет 2.2)
**Почему третьим:**
- Требует AI (DeepSeek)
- Может увеличить нагрузку
- Опциональный

**Реализация:**
- Расширить `ai-augmentation.js` для meta descriptions
- Интеграция в `content-generation` stage
- Кеширование результатов
- Использовать только DeepSeek (экономия Groq)

**Безопасность:**
- Опциональный через config
- Fallback: если AI недоступен - используется текущий description
- Не влияет на существующие страницы

---

## 📊 ПОРЯДОК ИНТЕГРАЦИИ

### Фаза 1: Подготовка (1-2 дня)
1. ✅ Создать структуру директорий для новых модулей
2. ✅ Настроить тестовое окружение
3. ✅ Создать backup текущей системы

### Фаза 2: AI Seed Expansion (2-3 дня)
1. ✅ Реализовать Seed Analyzer
2. ✅ Реализовать Seed Generator
3. ✅ Реализовать Seed Expansion Engine
4. ✅ Интегрировать в pipeline
5. ✅ Тестирование на малом объеме (10-20 страниц)

### Фаза 3: Phase A Priority 1 (3-4 дня)
1. ✅ Breadcrumbs (1 день)
2. ✅ Canonical Logic (1 день)
3. ✅ Authority Graph (1 день)
4. ✅ Landing Hubs (1 день)
5. ✅ Тестирование каждого модуля отдельно

### Фаза 4: Phase A Priority 2 (2-3 дня)
1. ✅ Adaptive H1 Switching (1 день)
2. ✅ Synonym-ecosystem (1 день)
3. ✅ Dynamic Meta Descriptions (опционально, 1 день)
4. ✅ Тестирование

### Фаза 5: Интеграционное тестирование (1-2 дня)
1. ✅ Полный билд с всеми модулями
2. ✅ Проверка отображения страниц
3. ✅ Проверка SEO метрик
4. ✅ Проверка производительности

---

## 🔒 МЕХАНИЗМЫ БЕЗОПАСНОСТИ

### 1. Feature Flags
Все новые модули через config:
```json
{
  "features": {
    "seedExpansion": true,
    "breadcrumbs": true,
    "canonicalLogic": true,
    "authorityGraph": true,
    "landingHubs": true,
    "h1Variants": true,
    "synonyms": true,
    "dynamicMeta": false
  }
}
```

### 2. Fallback Механизмы
- Каждый модуль имеет fallback
- При ошибке - используется старая логика
- Логирование всех ошибок

### 3. Изоляция
- Новые модули не изменяют существующие
- Отдельные файлы для новых функций
- Минимальные изменения в существующем коде

### 4. Тестирование
- Тест каждого модуля отдельно
- Тест интеграции
- Тест на малом объеме перед полным билдом

---

## 📈 УЧЕТ ОГРАНИЧЕНИЙ GROQ

### Стратегия использования AI:
1. **Seed Expansion**: Только DeepSeek (1 запрос на билд)
2. **Content Generation**: DeepSeek первый, Groq fallback
3. **Dynamic Meta**: Только DeepSeek (опционально)
4. **AI Decision Engine**: Уже использует DeepSeek

### Расчет нагрузки:
- Seed Expansion: 1 запрос DeepSeek
- Content: 80-90% DeepSeek, 10-20% Groq
- Groq лимит: 150-200 страниц/день
- DeepSeek: неограниченно

---

## ✅ КРИТЕРИИ УСПЕХА

1. ✅ Все существующие страницы работают
2. ✅ Новые модули не ломают текущую функциональность
3. ✅ SEO метрики улучшаются
4. ✅ Производительность не ухудшается
5. ✅ Groq лимиты не превышаются
6. ✅ Все модули имеют fallback

---

## 🎯 ПРИОРИТИЗАЦИЯ ПО ЭФФЕКТИВНОСТИ

### Высокий приоритет (немедленный эффект):
1. AI Seed Expansion
2. Breadcrumbs
3. Canonical Logic
4. Adaptive H1 Switching

### Средний приоритет (важно, но можно отложить):
5. Authority Graph
6. Landing Hubs
7. Synonym-ecosystem

### Низкий приоритет (опционально):
8. Dynamic Meta Descriptions

---

## 📝 ДЕТАЛЬНЫЙ ТЕХНИЧЕСКИЙ ПЛАН

### ШАГ 1: Структура директорий
```bash
scripts/seo/
├── seeds/
│   ├── seed-analyzer.js      # Анализ пробелов
│   ├── seed-generator.js     # Генерация новых seeds
│   └── seed-expansion-engine.js  # Главный модуль
├── links/
│   ├── authority-graph-engine.js  # Иерархия ссылок
│   └── canonical-engine.js        # Canonical логика
├── hubs/
│   └── landing-hubs-engine.js    # Hub страницы
└── content/
    ├── h1-variants-engine.js      # H1 варианты
    └── synonym-engine.js          # Синонимы
```

### ШАГ 2: AI Seed Expansion - Детальная реализация

#### 2.1 Seed Analyzer
**Файл:** `scripts/seo/seeds/seed-analyzer.js`
**Зависимости:** Нет (чистая логика)
**Входные данные:**
- `data/seo/url-seeds.json` (текущий seed-list)
- `public/vin/` (существующие страницы)
- `data/seo/gsc-cache.json` (опционально, GSC данные)

**Выходные данные:**
```javascript
{
  existingCoverage: {
    states: ['california', 'texas', ...],
    makes: ['toyota', 'honda', ...],
    years: [2010, 2011, ...],
    vins: ['1HGCM82633A004352', ...]
  },
  gaps: {
    missingStates: ['alaska', 'hawaii', ...],
    missingMakes: ['tesla', 'rivian', ...],
    missingYears: [2005, 2006, ...],
    missingCombinations: [...]
  }
}
```

#### 2.2 Seed Generator
**Файл:** `scripts/seo/seeds/seed-generator.js`
**Зависимости:** Seed Analyzer
**Функционал:**
- Генерация новых states/makes/years на основе gaps
- Генерация error-VIN вариаций (VI, O0, short VIN)
- Генерация long-tail вариаций

**Выходные данные:**
```javascript
{
  expandedSeeds: {
    states: [...],  // Расширенный список
    makes: [...],
    years: [...],
    vinExamples: [...]
  },
  additions: {
    states: [...],  // Что добавлено
    makes: [...],
    years: [...]
  }
}
```

#### 2.3 Seed Expansion Engine
**Файл:** `scripts/seo/seeds/seed-expansion-engine.js`
**Зависимости:** Seed Analyzer, Seed Generator, AIAugmentation
**AI Использование:**
- 1 запрос DeepSeek на билд
- Анализ пробелов и рекомендации
- Кеширование результатов

**Метод:**
```javascript
async expandSeedsBeforeBuild() {
  // 1. Анализ текущего состояния
  const analysis = await seedAnalyzer.analyze();
  
  // 2. Генерация расширенного seed-list
  const expanded = seedGenerator.generate(analysis);
  
  // 3. Анализ предыдущих билдов (эффективность, метрики)
  const buildHistory = await this.analyzeBuildHistory();
  
  // 4. Анализ ограничений ресурсов (Groq лимиты, API квоты)
  const resourceLimits = await this.analyzeResourceLimits();
  
  // 5. AI анализ и определение оптимального объема (DeepSeek, не Groq!)
  const aiAnalysis = await this.analyzeWithAI({
    currentState: analysis,
    expandedSeeds: expanded,
    buildHistory: buildHistory,
    resourceLimits: resourceLimits
  });
  
  // 6. Расчет recommended_build_volume с обоснованием
  const recommendedVolume = this.calculateOptimalVolume({
    analysis,
    aiAnalysis,
    buildHistory,
    resourceLimits
  });
  
  // 7. Определение стратегии распределения (Groq vs DeepSeek vs кеш)
  const buildStrategy = this.determineBuildStrategy(recommendedVolume, resourceLimits);
  
  return {
    recommended_build_volume: recommendedVolume,
    expanded_seed_list: expanded.expandedSeeds,
    reasoning: aiAnalysis.reasoning,
    build_strategy: buildStrategy,
    diff: {
      added: expanded.additions,
      removed: []
    }
  };
}
```

**Интеграция в pipeline:**
```javascript
// В seo-master-build.js, перед ai-decision
pipeline.registerStage('seed-expansion', async (ctx) => {
  log('STAGE', 'Seed Expansion');
  const { SeedExpansionEngine } = require('./seeds/seed-expansion-engine');
  const seedExpansionEngine = new SeedExpansionEngine(config);
  
  try {
    const result = await seedExpansionEngine.expandSeedsBeforeBuild();
    ctx.seedExpansionResult = result;
    
    // Обновляем urlFactory с новым seed-list
    if (result.expanded_seed_list) {
      urlFactory.updateSeeds(result.expanded_seed_list);
    }
    
    log('SEED-EXPANSION', `Recommended build volume: ${result.recommended_build_volume}`);
  } catch (e) {
    log('SEED-EXPANSION', `Error: ${e.message}, using default seeds`);
    // Fallback: используем текущие seeds
  }
});
```

**Безопасность:**
- Try/catch вокруг всего модуля
- Fallback на текущий seed-list при ошибке
- Валидация расширенного seed-list
- Логирование всех действий

### ШАГ 3: Breadcrumbs - Детальная реализация

**Файл:** `scripts/seo/dom/template-engine-absolute.js`
**Изменения:**
- Вернуть метод `renderBreadcrumbs(ctx)` (был откачен)
- Интегрировать в `renderPage()` после header

**Код:**
```javascript
renderBreadcrumbs(ctx) {
  const { make, year, vin, stateSlug } = ctx;
  const makeUpper = (make || '').toUpperCase();
  const stateLabel = (stateSlug || '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  const items = [{ label: 'Home', href: '/' }];
  
  if (make) {
    items.push({ label: makeUpper, href: `/make/${make}/` });
  }
  
  if (make && year) {
    items.push({ label: `${year} ${makeUpper}`, href: `/make/${make}/year/${year}/` });
  }
  
  if (vin) {
    items.push({ label: `VIN ${vin}`, href: null });
  }
  
  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.filter(i => i.href).map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.label,
      item: `https://vintrusted.com${item.href}`
    }))
  };
  
  return `
<nav class="seo-breadcrumbs" aria-label="Breadcrumb">
  <div class="seo-container">
    <ol class="seo-breadcrumbs-list">
      ${items.map((item, idx) => {
        if (item.href) {
          return `<li class="seo-breadcrumbs-item">
            <a href="${item.href}">${this.escapeHtml(item.label)}</a>
          </li>`;
        } else {
          return `<li class="seo-breadcrumbs-item seo-breadcrumbs-current">
            <span>${this.escapeHtml(item.label)}</span>
          </li>`;
        }
      }).join('')}
    </ol>
  </div>
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</nav>`;
}
```

**Интеграция:**
```javascript
renderPage(page, layout) {
  // ...
  const breadcrumbs = this.renderBreadcrumbs(page);
  return `<!doctype html>
<html>
  <body>
    <div class="seo-page">
      ${header}
      ${breadcrumbs}
      ${body}
    </div>
  </body>
</html>`;
}
```

**Безопасность:**
- Если нет make/year - breadcrumbs не рендерятся
- Fallback: пустая строка если нет данных
- Не влияет на существующие страницы

### ШАГ 4: Canonical Logic - Детальная реализация

**Файл:** `scripts/seo/links/canonical-engine.js`
**Функционал:**
- Группировка страниц по VIN+State, Make+Year+State, Make+State
- Выбор canonical на основе quality, intent, language
- VIN страницы всегда canonical на себя

**Методы:**
```javascript
class CanonicalEngine {
  buildCanonicalMap(pages) {
    // Группировка по VIN+State
    const vinStateGroups = new Map();
    // Группировка по Make+Year+State
    const makeYearStateGroups = new Map();
    // Группировка по Make+State
    const makeStateGroups = new Map();
    
    // Обработка групп
    this.processGroup(vinStateGroups, 'vin-state');
    this.processGroup(makeYearStateGroups, 'make-year-state');
    this.processGroup(makeStateGroups, 'make-state');
  }
  
  getCanonicalUrl(url) {
    return this.canonicalMap.get(url) || url;
  }
  
  isCanonical(url) {
    return this.canonicalMap.get(url) === url;
  }
}
```

**Интеграция:**
```javascript
// В pipeline, после quality-scoring
pipeline.registerStage('canonical-logic', async (ctx) => {
  log('STAGE', 'Canonical Logic');
  const { CanonicalEngine } = require('./links/canonical-engine');
  const canonicalEngine = new CanonicalEngine(config);
  
  canonicalEngine.buildCanonicalMap(ctx.acceptedPages);
  
  // Добавляем canonical URL к каждой странице
  ctx.acceptedPages = ctx.acceptedPages.map(page => ({
    ...page,
    canonicalUrl: canonicalEngine.getCanonicalUrl(page.url),
    isCanonical: canonicalEngine.isCanonical(page.url)
  }));
});
```

**Обновление template:**
```javascript
// В template-engine-absolute.js, renderPage()
<link rel="canonical" href="https://vintrusted.com${page.canonicalUrl || page.url}" />
```

**Безопасность:**
- Каждая страница получает canonical (даже если сама себе)
- Fallback: если нет canonical - используется page.url
- Не ломает существующие страницы

### ШАГ 5: Adaptive H1 Switching - Детальная реализация

**Файл:** `scripts/seo/content/h1-variants-engine.js`
**Функционал:**
- Генерация 3-5 вариантов H1
- Детерминированный выбор по URL hash
- Локализация для ES

**Методы:**
```javascript
class H1VariantsEngine {
  generateH1Variants(page) {
    const { year, make, stateLabel, intent, lang } = page;
    const makeUpper = (make || '').toUpperCase();
    const variants = [];
    
    if (intent === 'vin_check') {
      variants.push(
        `VIN Check for ${year} ${makeUpper} in ${stateLabel} – Full Report`,
        `Complete VIN Report: ${year} ${makeUpper} in ${stateLabel}`,
        `${year} ${makeUpper} VIN History Check in ${stateLabel}`,
        `VIN Report for ${year} ${makeUpper} Registered in ${stateLabel}`,
        `Vehicle History Report: ${year} ${makeUpper} in ${stateLabel}`
      );
    }
    // ... другие intents
    
    return variants;
  }
  
  selectH1Variant(page, variants) {
    if (!variants || variants.length === 0) {
      return page.h1 || 'Vehicle Report';
    }
    const urlHash = this.hashString(page.url || '');
    const selectedIndex = urlHash % variants.length;
    return variants[selectedIndex];
  }
  
  enrichPageWithH1Variants(page) {
    const variants = this.generateH1Variants(page);
    const selectedH1 = this.selectH1Variant(page, variants);
    const localizedH1 = this.localizeH1(selectedH1, page.lang);
    return { ...page, h1: localizedH1 };
  }
}
```

**Интеграция:**
```javascript
// В content-generation stage
const h1VariantsEngine = new H1VariantsEngine(config);
const pageWithH1 = h1VariantsEngine.enrichPageWithH1Variants({
  ...item,
  h1: `VIN report for ${item.year} ${makeUpper} in ${stateLabel}`,
  // ...
});
```

**Безопасность:**
- Fallback: если нет вариантов - используется текущий H1
- Не ломает существующие страницы

### ШАГ 6: Synonym-ecosystem - Детальная реализация

**Файл:** `scripts/seo/content/synonym-engine.js`
**Функционал:**
- 8 синонимичных путей (vinCheck, accident, ownership, title, etc.)
- Детерминированная замена на основе URL hash
- Применение к title, description, h1, intro, aiText

**Методы:**
```javascript
class SynonymEngine {
  initializeSynonymPaths() {
    return {
      vinCheck: {
        primary: ['VIN check', 'VIN report', 'VIN history'],
        secondary: ['VIN lookup', 'VIN verification', 'VIN decoder'],
        tertiary: ['vehicle report', 'car history', 'automotive records']
      },
      // ... 7 more paths
    };
  }
  
  applySynonymsToText(text, pathName, level = 'primary') {
    const path = this.synonymPaths[pathName];
    if (!path) return text;
    
    const hash = this.hashString(text);
    const useLevel = hash % 3 === 0 ? 'tertiary' : hash % 2 === 0 ? 'secondary' : 'primary';
    const synonyms = path[useLevel];
    
    let result = text;
    path.primary.forEach((primary, idx) => {
      if (synonyms[idx]) {
        result = result.replace(new RegExp(primary, 'gi'), synonyms[idx]);
      }
    });
    return result;
  }
  
  applySynonymsToPage(page) {
    const newPage = { ...page };
    const hash = this.hashString(page.url || '');
    const pathIndex = hash % Object.keys(this.synonymPaths).length;
    const pathName = Object.keys(this.synonymPaths)[pathIndex];
    
    newPage.title = this.applySynonymsToText(page.title, pathName);
    newPage.description = this.applySynonymsToText(page.description, pathName);
    newPage.h1 = this.applySynonymsToText(page.h1, pathName);
    // ... другие поля
    
    return newPage;
  }
}
```

**Интеграция:**
```javascript
// В pipeline, после i18n-localization
pipeline.registerStage('synonym-enrichment', async (ctx) => {
  log('STAGE', 'Synonym Enrichment');
  const { SynonymEngine } = require('./content/synonym-engine');
  const synonymEngine = new SynonymEngine(config);
  
  ctx.pages = ctx.pages.map(page => 
    synonymEngine.applySynonymsToPage(page)
  );
});
```

**Безопасность:**
- Опциональный через config
- Fallback: если отключен - контент без изменений
- Не влияет на качество

### ШАГ 7: Authority Graph - Детальная реализация

**Файл:** `scripts/seo/links/authority-graph-engine.js`
**Функционал:**
- Построение графа: cluster → make → model → year → VIN
- Генерация "up" и "down" ссылок
- Интеграция с internal-links-engine

**Методы:**
```javascript
class AuthorityGraphEngine {
  buildGraph(pages) {
    // Инициализация графа
    this.graph = {
      clusters: new Map(),
      makes: new Map(),
      models: new Map(),
      years: new Map(),
      vins: new Map()
    };
    
    // Регистрация страниц
    pages.forEach(page => this.registerPage(page));
  }
  
  generateAuthorityLinks(page) {
    const links = [];
    const { make, year, vin, stateSlug, clusterId } = page;
    const model = page.model || make;
    
    // UP: VIN → Year → Model → Make → Cluster
    if (make && year) {
      // Ссылка на Year hub
      links.push({
        href: `/make/${make}/year/${year}/`,
        label: `${year} ${make.toUpperCase()} VIN Reports`,
        type: 'year',
        direction: 'up'
      });
    }
    
    // DOWN: Cluster → Make → Model → Year → VIN
    // ...
    
    return links;
  }
}
```

**Интеграция:**
```javascript
// В internal-links-engine.js
if (this.useAuthorityGraph && this.authorityGraph) {
  this.authorityGraph.buildGraph(pages);
  const authorityLinks = this.authorityGraph.generateAuthorityLinks(page);
  links = [...authorityLinks, ...links];
}
```

**Безопасность:**
- Опциональный через config.useAuthorityGraph
- Fallback: если отключен - используется текущая логика
- Не влияет на существующие ссылки

### ШАГ 8: Landing Hubs - Детальная реализация

**Файл:** `scripts/seo/hubs/landing-hubs-engine.js`
**Функционал:**
- Генерация hub страниц для makes, models, years
- Консолидация ссылок
- Интеграция с template-engine

**Методы:**
```javascript
class LandingHubsEngine {
  generateHubs(pages) {
    // Группировка по make
    const makeGroups = new Map();
    pages.forEach(page => {
      const make = page.make;
      if (!makeGroups.has(make)) {
        makeGroups.set(make, []);
      }
      makeGroups.get(make).push(page);
    });
    
    // Создание hub страниц
    makeGroups.forEach((pages, make) => {
      const hub = this.createMakeHub(make, pages);
      this.hubs.push(hub);
    });
  }
  
  createMakeHub(make, pages) {
    return {
      type: 'make',
      url: `/make/${make}/`,
      title: `${make.toUpperCase()} VIN Check - Vehicle History Reports`,
      description: `Complete VIN history reports for ${make.toUpperCase()} vehicles.`,
      h1: `${make.toUpperCase()} VIN Reports`,
      make,
      pages: pages.slice(0, 50),
      content: this.generateMakeHubContent(make, pages)
    };
  }
}
```

**Интеграция:**
```javascript
// В pipeline, после clustering
pipeline.registerStage('landing-hubs', async (ctx) => {
  log('STAGE', 'Landing Hubs Generation');
  const { LandingHubsEngine } = require('./hubs/landing-hubs-engine');
  const landingHubsEngine = new LandingHubsEngine(config);
  
  landingHubsEngine.generateHubs(ctx.acceptedPages);
  ctx.landingHubs = landingHubsEngine.getAllHubs();
  
  // Генерация HTML для hub страниц
  ctx.landingHubs.forEach(hub => {
    const html = templateEngine.renderHubPage(hub);
    staticArch.writeHubFile(hub.url, html);
  });
});
```

**Безопасность:**
- Отдельные файлы (не перезаписывают VIN страницы)
- Опциональный через config
- Fallback: если отключен - пропускается

---

## 📝 СЛЕДУЮЩИЕ ШАГИ

1. ✅ Создать структуру директорий
2. ✅ Начать с AI Seed Expansion
3. ✅ Постепенно интегрировать Phase A модули
4. ✅ Тестировать на каждом этапе
5. ✅ Мониторить метрики

