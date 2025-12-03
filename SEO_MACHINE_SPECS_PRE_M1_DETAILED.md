# 📋 РАЗВЕРНУТЫЕ СПЕЦИФИКАЦИИ SEO МАШИНЫ 6.0 (ДО M1)

**Версия:** 6.0 (Pre-M1)  
**Дата:** До перехода на MacBook M1  
**Статус:** Production Ready (Vercel-оптимизированная версия)  
**Платформа:** Vercel только  
**AI:** Только API провайдеры (Groq/DeepSeek/OpenAI)

---

## 📊 СОДЕРЖАНИЕ

1. [Архитектура Pipeline](#архитектура-pipeline)
2. [AI Система](#ai-система)
3. [Модули и Фичи](#модули-и-фичи)
4. [TRIZ Модули](#triz-модули)
5. [Конфигурация](#конфигурация)
6. [Метрики и Качество](#метрики-и-качество)
7. [Производительность](#производительность)
8. [Технические Детали](#технические-детали)
9. [Безопасность и Надежность](#безопасность-и-надежность)
10. [Масштабируемость](#масштабируемость)

---

## 🏗️ АРХИТЕКТУРА PIPELINE

### Общая Структура

Pipeline состоит из **21 этапа**, выполняемых последовательно. Каждый этап обрабатывает контекст (`ctx`) и передает результат следующему этапу.

### Детальное Описание Этапов

#### 0. Pre-Build-Check
**Назначение:** Проверка системы перед началом билда

**Модули:**
- `PreValidation` - Критические проверки
- `AutoRepair` - Автоматическое исправление
- `SelfDiagnosis` - Самодиагностика
- `ProactivePrevention` - Проактивная профилактика
- `BuildHistory` - История билдов
- `StaticArchitecture` - Подсчет существующих страниц

**Проверки:**
- Наличие конфигурации
- Доступность API ключей
- Состояние файловой системы
- История предыдущих билдов
- Критические ошибки

**Выходные данные:**
- `ctx.diagnosis` - Результат диагностики
- `ctx.prevention` - Предотвращенные проблемы
- `ctx.metrics` - Метрики системы

---

#### 0.3. Seed Expansion
**Назначение:** AI-расширение seed-list перед планированием URL

**Модули:**
- `SeedExpansionEngine` - AI анализ и расширение seeds

**Процесс:**
1. Анализ существующих страниц
2. Выявление пробелов (brands, models, years, states)
3. Анализ GSC данных (если доступны)
4. Генерация нового seed-list
5. Рекомендация объема билда

**Выходные данные:**
- `ctx.seedExpansionResult` - Результат расширения
  - `expanded_seed_list` - Новый список seeds
  - `recommended_build_volume` - Рекомендуемый объем
  - `reasoning` - Обоснование
  - `diff` - Разница с предыдущим списком

**Feature Flag:** `config.features.seedExpansion`

---

#### 0.5. AI Decision
**Назначение:** AI-решение о количестве страниц для генерации

**Модули:**
- `SEODecisionEngine` - AI анализ и принятие решения

**Анализ:**
- Текущее количество страниц
- Метрики качества
- GSC данные (если доступны)
- История билдов
- Тренды

**Выходные данные:**
- `ctx.aiDecision` - Решение AI
  - `targetPages` - Целевое количество страниц
  - `strategy` - Стратегия генерации
  - `confidence` - Уверенность (0-1)
  - `reasoning` - Обоснование

**Hard Limit:** 20,000 страниц максимум

---

#### 1. URL Planning
**Назначение:** Планирование URL на основе seeds и приоритетов

**Модули:**
- `URLFactory` - Генерация плана URL

**Процесс:**
1. Загрузка seeds (с учетом расширения от Seed Expansion)
2. Генерация комбинаций:
   - States × Makes × Years × Intents × Languages
3. Динамическая генерация VIN на основе комбинации
4. Применение весов Learning-to-Rank
5. Фильтрация для инкрементальных билдов

**Выходные данные:**
- `ctx.urlPlan` - План URL (массив объектов)
  - `vin` - VIN номер
  - `stateSlug` - Slug штата
  - `make` - Марка
  - `year` - Год
  - `intent` - Интент
  - `lang` - Язык
  - `url` - Полный URL
  - `clusterId` - ID кластера

**Особенности:**
- Дедупликация по `vin|stateSlug|intent|lang`
- Поддержка параллельных билдов (фильтрация по штатам)
- Инкрементальные билды (только измененные страницы)

---

#### 2. Content Generation
**Назначение:** Генерация контента для каждой страницы

**Модули:**
- `BaselineBlocks` - Базовый контент
- `AIAugmentation` - AI обогащение
- `H1VariantsEngine` - Вариативные H1
- `ErrorIsolation` - Изоляция ошибок
- `ComputationCache` - Кэш вычислений
- `AdaptiveComplexityManager` - Адаптивная сложность

**Процесс:**
1. Генерация baseline контента (без AI)
2. AI обогащение (если не skip):
   - Промпт с Tier 1 семантическими требованиями
   - Обогащение обученной стратегией AI
   - Вызов API (Groq → DeepSeek → OpenAI)
3. Применение H1 вариантов
4. Формирование структуры страницы

**Параметры:**
- `concurrency`: 10-25 потоков (адаптивная)
- `aiSkip`: 70% страниц без AI (baseline only)
- `aiMaxTokens`: 400
- `timeout`: 15s (Groq), 25s (DeepSeek)

**Выходные данные:**
- `ctx.pages` - Массив страниц с контентом
  - `html` - HTML контент
  - `h1` - H1 заголовок
  - `h1Variants` - Варианты H1 (3-5 шт)
  - `baselineBlocks` - Базовые блоки
  - `aiText` - AI-сгенерированный текст
  - `layout` - Выбранный layout

**Особенности:**
- Кэширование AI запросов (90% hit rate)
- Изоляция ошибок (fallback на baseline)
- Адаптивная сложность (уменьшение токенов при нагрузке)

---

#### 3. Keyword Intelligence
**Назначение:** Анализ и кластеризация ключевых слов

**Модули:**
- `KeywordExtractor` - Извлечение ключевых слов
- `KeywordClusteringEngine` - Кластеризация

**Процесс:**
1. Извлечение ключевых слов из контента
2. Кластеризация по темам
3. Обогащение страниц кластерами

**Выходные данные:**
- `ctx.pages` - Обогащенные ключевыми словами
  - `keywords` - Массив ключевых слов
  - `keywordClusters` - Кластеры ключевых слов

---

#### 4. Auto-Optimization
**Назначение:** Автоматическая оптимизация контента

**Модули:**
- `AutoOptimizer` - Автооптимизация

**Оптимизации:**
- Плотность ключевых слов
- Структура заголовков
- Внутренние ссылки
- Мета-теги

**Выходные данные:**
- `ctx.pages` - Оптимизированные страницы

---

#### 5. i18n-Localization
**Назначение:** Интернационализация контента

**Модули:**
- `I18nEngine` - Интернационализация

**Поддерживаемые языки:**
- EN (English) - по умолчанию
- ES (Español)

**Процесс:**
1. Перевод мета-тегов
2. Перевод CTA
3. Локализация дат и чисел
4. Адаптация контента под язык

**Выходные данные:**
- `ctx.pages` - Локализованные страницы

---

#### 6. Synonym Enrichment
**Назначение:** Обогащение синонимами и альтернативными путями

**Модули:**
- `SynonymEngine` - Синонимы

**Процесс:**
1. Генерация синонимов для ключевых терминов
2. Создание альтернативных путей (минимум 4)
3. Встраивание в контент

**Выходные данные:**
- `ctx.pages` - Обогащенные синонимами

**Feature Flag:** `config.features.synonyms`

---

#### 7. HTML Rendering
**Назначение:** Рендеринг финального HTML

**Модули:**
- `TemplateEngineAbsolute` - Шаблонизатор
- `LayoutEngineAbsolute` - Выбор layout

**Layouts (9 вариантов):**
1. **DMV** - Классический DMV-стиль
2. **APPLE** - Чистый, минималистичный
3. **LEGAL** - Детальный, структурированный
4. **HYBRID** - Сбалансированный
5. **ANALYTIC** - Фокус на аналитике
6. **CONVERSION** - Оптимизирован для конверсий
7. **EXPERT** - Экспертный стиль
8. **MINIMAL** - Минималистичный
9. **COMPREHENSIVE** - Всеобъемлющий

**Процесс:**
1. Выбор layout (weighted на основе метрик)
2. Рендеринг блоков в правильном порядке
3. Встраивание AI контента
4. Генерация мета-тегов
5. Добавление Schema.org разметки

**Выходные данные:**
- `ctx.pages` - Страницы с финальным HTML
  - `html` - Полный HTML
  - `layout` - Использованный layout
  - `schema` - Schema.org разметка

**Особенности:**
- Минимум 6 различных layouts на билд
- Weighted распределение на основе метрик
- Адаптивный выбор layout

---

#### 8. Uniqueness Validation
**Назначение:** Проверка уникальности контента и структуры

**Модули:**
- `UniquenessEngine` - Проверка уникальности

**Проверки:**
- Уникальность контента (hash)
- Уникальность структуры (fingerprint)
- Порог уникальности: 0.85

**Выходные данные:**
- `ctx.pages` - Страницы с метриками уникальности
  - `contentHash` - Hash контента
  - `structureFingerprint` - Fingerprint структуры
  - `uniquenessScore` - Оценка уникальности

---

#### 9. Quality Scoring
**Назначение:** Оценка качества страниц

**Модули:**
- `QualityEngine` - Оценка качества
- `ConversionPredictor` - Предсказание конверсий (опционально)

**Факторы качества (85% веса - SEO):**
1. **Length (20%)** - Длина контента (цель: 4000+ символов)
2. **Structure (25%)** - Структура (H2, H3, FAQ, CTA, таблицы)
3. **Keywords (20%)** - Плотность ключевых слов
4. **Diversity (15%)** - Разнообразие контента (200+ уникальных слов)
5. **Semantic (20%)** - Покрытие Tier 1 семантических тем

**Вторичные факторы (5% веса - Conversion):**
- **Traffic Conversion Potential** - Потенциал конверсии трафика

**Минимальный score:** 0.70

**Выходные данные:**
- `ctx.pages` - Страницы с оценками качества
  - `qualityScore` - Итоговый score (0-1)
  - `qualityBreakdown` - Разбивка по факторам
  - `isAccepted` - Прошла ли проверку

**Формула:**
```
score = (
  0.20 * lenScore +           // SEO: длина
  0.25 * structureScore +     // SEO: структура
  0.20 * keywordScore +       // SEO: ключевые слова
  0.15 * diversityScore +     // SEO: разнообразие
  0.20 * semanticScore +       // SEO: semantic
  0.05 * trafficConversionScore // ВТОРИЧНО: conversion
)
```

---

#### 10. Clustering
**Назначение:** Кластеризация страниц по темам

**Модули:**
- `ClusterEngine` - Кластеризация

**Процесс:**
1. Группировка по кластерам (state × make × intent)
2. Вычисление метрик кластера
3. Обновление весов кластеров

**Выходные данные:**
- `ctx.pages` - Страницы с clusterId
- `ctx.clusters` - Массив кластеров с метриками

---

#### 11. Internal Links
**Назначение:** Генерация внутренних ссылок

**Модули:**
- `InternalLinksEngine` - Внутренние ссылки
- `InternalLinkOptimizer` - Оптимизация ссылок
- `AuthorityGraphEngine` - Граф авторитетности
- `LandingHubsEngine` - Hub страницы

**Процесс:**
1. Построение графа авторитетности
2. Генерация ссылок (1-3 на страницу)
3. Оптимизация на основе PageRank
4. Создание Hub страниц (brand → model → year)

**Выходные данные:**
- `ctx.pages` - Страницы с внутренними ссылками
  - `internalLinks` - Массив ссылок
  - `authorityScore` - Оценка авторитетности

**Особенности:**
- Иерархическая структура: cluster → make → model → year → VIN
- Breadcrumbs (JSON-LD)
- Canonical URLs (умная логика)

---

#### 12. Static Publishing
**Назначение:** Публикация статических HTML файлов

**Модули:**
- `StaticArchitecture` - Статическая архитектура
- `HTMLValidator` - Валидация HTML
- `AccessibilityChecker` - Проверка доступности
- `CriticalCSSOptimizer` - Оптимизация CSS

**Процесс:**
1. Валидация HTML (jsdom или regex fallback)
2. Проверка доступности (ARIA, контраст, alt)
3. Оптимизация критического CSS
4. Запись файлов: `/public/vin/:vin/:state/index.html`

**Выходные данные:**
- Статические HTML файлы на диске
- `ctx.pages` - Страницы с путями к файлам

**Особенности:**
- Параллельная запись (batch processing)
- Защита от race conditions (try-catch на mkdirSync)
- Fallback механизмы для валидации

---

#### 13. Crawl Budget
**Назначение:** Управление crawl budget

**Модули:**
- `CrawlBudgetEngine` - Управление crawl budget

**Приоритеты:**
- High Priority: 40%
- Medium Priority: 40%
- Low Priority: 20%

**Процесс:**
1. Определение приоритета страницы
2. Обновление robots.txt (если нужно)
3. Установка мета-тегов noindex для low priority

**Выходные данные:**
- `ctx.pages` - Страницы с приоритетами crawl

---

#### 14. Sitemap Generation
**Назначение:** Генерация sitemap.xml

**Модули:**
- `SitemapGenerator` - Генерация sitemap
- `SitemapPrioritizer` - Приоритизация

**Процесс:**
1. Сбор всех URL
2. Приоритизация на основе метрик
3. Генерация sitemap.xml
4. Запись в `/public/sitemap.xml`

**Выходные данные:**
- `sitemap.xml` файл

---

#### 15. GSC Enrichment
**Назначение:** Обогащение данными Google Search Console

**Модули:**
- `GSCIntegration` - Интеграция с GSC

**Данные:**
- Clicks
- Impressions
- CTR
- Position
- Indexing status

**Выходные данные:**
- `ctx.pages` - Страницы с GSC метриками
  - `gscMetrics` - Объект с метриками

**Особенности:**
- Опционально (если API ключ доступен)
- Кэширование данных

---

#### 16. External Metrics Enrichment
**Назначение:** Обогащение внешними метриками

**Модули:**
- `ExternalMetrics` - Внешние метрики

**Данные:**
- Bounce rate
- Time on page
- Page views
- User behavior

**Выходные данные:**
- `ctx.pages` - Страницы с внешними метриками
  - `externalMetrics` - Объект с метриками

---

#### 17. Conversion Enrichment
**Назначение:** Обогащение данными конверсий

**Модули:**
- `ConversionTracker` - Отслеживание конверсий

**Данные:**
- Conversion rate
- Conversion count
- Revenue
- Conversion funnel

**Выходные данные:**
- `ctx.pages` - Страницы с данными конверсий
  - `conversionData` - Объект с данными конверсий

---

#### 18. LTR Update
**Назначение:** Обновление Learning-to-Rank весов

**Модули:**
- `WeightEngine` - Вычисление весов

**Процесс:**
1. Анализ метрик страниц
2. Вычисление весов для:
   - Intents
   - Languages
   - Layouts
   - Clusters
3. Нормализация весов
4. Сохранение в RL State

**Выходные данные:**
- Обновленный `rlState` с новыми весами

**Особенности:**
- Использует GSC метрики если доступны
- Fallback на quality score
- Адаптивное обновление

---

## 🤖 AI СИСТЕМА

### Провайдеры (в порядке приоритета)

#### 1. Groq (Primary)
- **Модель:** Llama 3.1 8B
- **Скорость:** ~1,500 страниц/минуту
- **Стоимость:** Бесплатно (free plan)
- **Timeout:** 15 секунд
- **Rate Limit:** Автоматическое отключение при 429
- **Fallback:** DeepSeek при ошибках

#### 2. DeepSeek (Fallback)
- **Модель:** DeepSeek Chat
- **Скорость:** ~800 страниц/минуту
- **Стоимость:** Платно (но дешевле OpenAI)
- **Timeout:** 25 секунд
- **Надежность:** Высокая

#### 3. OpenAI (Last Resort)
- **Модель:** GPT (опционально)
- **Скорость:** ~600 страниц/минуту
- **Стоимость:** Дорого
- **Timeout:** 30 секунд
- **Использование:** Только в критических случаях

### Параметры AI

```javascript
{
  maxTokens: 400,           // Оптимизировано для скорости
  timeout: {
    groq: 15,               // секунд
    deepseek: 25,           // секунд
    openai: 30             // секунд
  },
  retry: 2,                 // попытки
  cache: {
    enabled: true,
    hitRate: ~90%,          // процент попаданий в кэш
    entries: 9,185+         // записей в кэше
  },
  rateLimitProtection: true // Автоматическое отключение Groq при 429
}
```

### AI Training

#### Источники обучения:
1. **Google Documentation** - Официальная документация Google
2. **Schema.org** - Структурированные данные
3. **Industry Sources** - Индустриальные источники
4. **VIN Reports** - Реальные VIN отчеты
5. **VIN Collection** - Собранные VIN данные

#### Обученная стратегия:
- Хранится в `data/seo/ai-training/learned-strategy.json`
- Включает:
  - `core_principles` - Основные принципы SEO
  - `content_strategy` - Стратегия контента
  - `unique_approaches` - Уникальные подходы

#### Обогащение промпта:
- AI использует обученную стратегию для обогащения промптов
- Интеграция знаний из официальной документации Google
- Адаптация под контекст страницы

### Особенности AI

#### Tier 1 Семантические требования:
1. **Vehicle Identity Core** - Структура VIN, модель, год, отзывы
2. **Accident & Damage Intelligence** - Типы аварий, повреждения, salvage
3. **Ownership Logic** - История владения, паттерны, риски
4. **State-Specific Rules** - Законы штата, процедуры, требования
5. **Fraud Prevention** - Обнаружение мошенничества, предупреждения

#### Стиль контента:
- Official document style (DMV × LegalTech × Expert Analyst)
- Professional, authoritative, analytical
- Не просто информация — анализ, предупреждения, выводы
- Каждый VIN — это история, профиль риска, контекст штата

---

## 📦 МОДУЛИ И ФИЧИ

### Включенные фичи (37)

#### Core Features:
1. ✅ **seedExpansion** - AI расширение seed-list
2. ✅ **h1Variants** - Вариативные H1 заголовки (3-5 вариантов)
3. ✅ **synonyms** - Синонимы и альтернативные пути (минимум 4)
4. ✅ **breadcrumbs** - Хлебные крошки (JSON-LD)
5. ✅ **canonicalLogic** - Умная канонизация
6. ✅ **authorityGraph** - Граф авторитетности
7. ✅ **landingHubs** - Hub страницы (brand → model → year)

#### Build Features:
8. ✅ **incrementalBuild** - Инкрементальные билды
9. ✅ **realtimeDashboard** - Дашборд в реальном времени

#### Advanced Features:
10. ✅ **smartCanonical** - Умная канонизация
11. ✅ **predictiveIndexing** - Предсказание индексации
12. ✅ **contentFreshness** - Отслеживание свежести контента
13. ✅ **adaptiveLayout** - Адаптивный выбор layout
14. ✅ **mobileValidation** - Валидация мобильной версии
15. ✅ **internalLinkOptimization** - Оптимизация внутренних ссылок
16. ✅ **conversionFunnel** - Отслеживание воронки конверсий
17. ✅ **keywordClustering** - Кластеризация ключевых слов
18. ✅ **autoRegeneration** - Автоматическая регенерация
19. ✅ **trafficPrediction** - Предсказание трафика
20. ✅ **visualOptimization** - Оптимизация визуального контента
21. ✅ **searchIntent** - Классификация поискового интента
22. ✅ **competitiveAnalysis** - Анализ конкурентов
23. ✅ **serpFeatures** - Оптимизация SERP features
24. ✅ **contentVersioning** - Версионирование контента
25. ✅ **longtailExpansion** - Расширение long-tail запросов
26. ✅ **enhancedStructuredData** - Расширенные структурированные данные
27. ✅ **coreWebVitals** - Оптимизация Core Web Vitals
28. ✅ **multilangSEO** - Мультиязычный SEO
29. ✅ **voiceSearch** - Оптимизация для голосового поиска
30. ✅ **backlinkOpportunities** - Обнаружение возможностей для бэклинков
31. ✅ **contentGap** - Анализ пробелов в контенте
32. ✅ **userBehavior** - Отслеживание поведения пользователей
33. ✅ **autoFAQ** - Автогенерация FAQ
34. ✅ **contentDepth** - Оптимизация глубины контента
35. ✅ **localSEO** - Локальный SEO
36. ✅ **sitemapPrioritization** - Приоритизация sitemap
37. ✅ **contentAnalytics** - Аналитика контента

### Отключенные фичи:
- ❌ **dynamicMeta** - Динамические meta теги (опционально)
- ❌ **localAI** - Локальный AI (не поддерживается в Pre-M1)
- ❌ **m1Optimization** - M1 оптимизация (не поддерживается в Pre-M1)

---

## 🛡️ TRIZ МОДУЛИ (15 модулей)

### Защита и Мониторинг:

#### 1. Error Isolation
**Назначение:** Изоляция ошибок на уровне модулей

**Функции:**
- Отслеживание ошибок по модулям
- Автоматическая изоляция при превышении порога (15 ошибок за 5 минут)
- Fallback механизмы
- Автоматическое восстановление при улучшении

**Параметры:**
- `threshold`: 15 ошибок
- `window`: 5 минут
- `decayRate`: 0.1 (снижение счетчика при успешных операциях)

#### 2. Memory Monitor
**Назначение:** Мониторинг использования памяти

**Функции:**
- Отслеживание использования памяти
- Автоматическая очистка при превышении порога (85%)
- Периодическая очистка (отключена на Vercel)
- Логирование использования памяти

**Параметры:**
- `threshold`: 85%
- `periodicCleanup`: Отключено на Vercel

#### 3. Performance Profiler
**Назначение:** Профилирование производительности

**Функции:**
- Измерение времени выполнения этапов
- Выявление узких мест
- Рекомендации по оптимизации

#### 4. Error Intelligence
**Назначение:** Анализ ошибок и предложение решений

**Функции:**
- Классификация ошибок
- Анализ паттернов
- Предложение решений

#### 5. Proactive Prevention
**Назначение:** Проактивная профилактика проблем

**Функции:**
- Анализ трендов
- Предсказание проблем
- Профилактические меры

### Оптимизация:

#### 6. Smart Cache Invalidation
**Назначение:** Умная инвалидация кэша

**Функции:**
- Отслеживание изменений
- Селективная инвалидация
- Оптимизация производительности

#### 7. Computation Cache
**Назначение:** Кэширование результатов вычислений

**Функции:**
- Кэширование AI запросов
- Кэширование вычислений
- Оптимизация повторных операций

#### 8. Batch Processor
**Назначение:** Групповая обработка операций

**Функции:**
- Батч обработка файлов
- Оптимизация I/O
- Параллельная обработка

#### 9. Adaptive Complexity Manager
**Назначение:** Адаптивное управление сложностью

**Функции:**
- Адаптация concurrency
- Адаптация токенов AI
- Адаптация batch size

**Параметры:**
- `low`: concurrency × 0.5, tokens × 0.7
- `high`: concurrency × 1.5, tokens × 1.2

### Качество и Эволюция:

#### 10. Continuous Quality Assurance
**Назначение:** Непрерывное обеспечение качества

**Функции:**
- Регистрация проверок качества
- Отслеживание трендов
- Автоматические предупреждения

#### 11. Self-Evolution Engine
**Назначение:** Движок самоэволюции

**Функции:**
- Анализ эффективности
- Автоматические улучшения
- Адаптация стратегии

#### 12. Contradiction Resolver
**Назначение:** Разрешение противоречий

**Функции:**
- Выявление противоречий
- Применение TRIZ принципов
- Разрешение конфликтов

#### 13. Pattern-Based Prediction
**Назначение:** Предсказание на основе паттернов

**Функции:**
- Анализ паттернов
- Предсказание успеха
- Оптимизация стратегии

#### 14. Self-Cleanup Engine
**Назначение:** Автоочистка системы

**Функции:**
- Очистка старых файлов
- Очистка кэша
- Очистка логов

#### 15. Seeded Randomness Manager
**Назначение:** Управление случайностью

**Функции:**
- Управление случайностью для воспроизводимости
- Seeded random для экспериментов

---

## ⚙️ КОНФИГУРАЦИЯ

### Основная конфигурация (`data/seo/config.json`)

```json
{
  "version": "6.0",
  "targetPagesPerBuild": 10000,
  "maxPagesPerCluster": 500,
  "minQualityScore": 0.70,
  "enableAI": true,
  "aiMaxTokens": 400,
  "aiProviders": ["groq", "deepseek", "openai"],
  "languages": ["en", "es"],
  "defaultLanguage": "en",
  "intents": [
    "vin_check",
    "accident_check",
    "ownership_history",
    "market_value",
    "dmv_records",
    "title_brand",
    "odometer_rollback",
    "theft_records"
  ],
  "layoutCount": 9,
  "minLayoutVariety": 6,
  "uniquenessThreshold": 0.85,
  "internalLinksPerPage": {
    "min": 1,
    "max": 3
  },
  "crawlBudget": {
    "highPriority": 0.4,
    "mediumPriority": 0.4,
    "lowPriority": 0.2
  },
  "autoRepair": {
    "enabled": true,
    "minQualityForRepair": 0.6,
    "regenerationThreshold": 0.5
  },
  "googleAnalyticsId": "G-CX3CT2K2FC",
  "semanticRequirements": {
    "tier1Required": true,
    "tier1Themes": [
      "vehicle-identity-core",
      "accident-damage-intelligence",
      "ownership-logic",
      "state-specific-rules",
      "fraud-prevention"
    ],
    "minTier1Coverage": 0.8,
    "semanticWeightInQuality": 0.20
  }
}
```

### Feature Flags

Все 37 фичи управляются через `config.features` объект.

### Переменные окружения

```bash
# AI Providers
GROQ_API_KEY=...
DEEPSEEK_API_KEY=...
OPENAI_API_KEY=...  # Опционально

# Build Settings
SEO_BUILD_CONCURRENCY=10-25  # Адаптивная
SEO_ENABLE_AI=1
SEO_BUILD_STATES=...  # Для параллельных билдов

# Vercel
VERCEL=1
VERCEL_DEPLOY_HOOK=...
GITHUB_TOKEN=...
GITHUB_REPO=...
```

---

## 📈 МЕТРИКИ И КАЧЕСТВО

### Quality Scoring Factors

#### SEO Факторы (85% веса):

1. **Length (20%)**
   - Цель: 4000+ символов текста
   - Формула: `min(1, textLength / 4000)`

2. **Structure (25%)**
   - Проверки:
     - H2 заголовки: +0.12
     - H3 заголовки: +0.08
     - FAQ блок: +0.12
     - CTA блок: +0.12
     - Key Facts: +0.12
     - State Insights: +0.12
     - Таблицы: +0.12
     - Hero блок: +0.20 (бонус)

3. **Keywords (20%)**
   - Проверка наличия: VIN, stateSlug, make, intent
   - Формула: `hits / totalKeywords`

4. **Diversity (15%)**
   - Уникальные слова: 200+
   - Формула: `min(1, uniqueWords / 200)`

5. **Semantic (20%)**
   - Tier 1 темы: 5 обязательных
   - Формула: `hits / totalTier1Keywords`

#### Conversion Факторы (5% веса):

6. **Traffic Conversion Potential (5%)**
   - Предсказание на основе:
     - Traffic potential
     - Conversion rate
     - User behavior

### Минимальные требования:
- **Quality Score:** 0.70
- **Uniqueness:** 0.85
- **Layout Variety:** 6 из 9 layouts
- **Semantic Coverage:** 80% Tier 1 themes

---

## 🚀 ПРОИЗВОДИТЕЛЬНОСТЬ

### Скорость генерации

#### Без AI (70% страниц):
- **Скорость:** ~4,600 страниц/минуту
- **Время для 10,000 страниц:** ~2.2 минуты

#### С AI (30% страниц):
- **Groq:** ~1,500 страниц/минуту
- **DeepSeek:** ~800 страниц/минуту
- **Время для 3,000 страниц:** 
  - Groq: ~2 минуты
  - DeepSeek: ~3.75 минуты

#### Общее время билда (10,000 страниц):
- **Без AI:** ~2.2 минуты
- **С Groq (30%):** ~4.2 минуты
- **С DeepSeek (30%):** ~5.95 минуты

### Оптимизации

#### AI Skip:
- **70% страниц** без AI (baseline only)
- Экономия времени и API вызовов

#### Кэширование:
- **Hit Rate:** ~90%
- **Записей в кэше:** 9,185+
- Экономия API вызовов

#### Batch Processing:
- Групповая обработка файлов
- Оптимизация I/O операций

#### Incremental Builds:
- Только измененные страницы
- Экономия времени на повторных билдах

#### Rate Limit Protection:
- Автоматическое переключение провайдеров
- Защита от 429 ошибок

### Ограничения

#### Memory:
- **Threshold:** 85%
- **Protection:** Автоматическая очистка

#### Timeout:
- **Groq:** 15 секунд
- **DeepSeek:** 25 секунд
- **OpenAI:** 30 секунд

#### Concurrency:
- **Default:** 10-25 потоков (адаптивная)
- **Max:** 30 потоков

#### Rate Limits:
- **Groq:** Автоматический fallback при 429
- **DeepSeek:** Более надежный, но медленнее

---

## 🔧 ТЕХНИЧЕСКИЕ ДЕТАЛИ

### Платформа

#### Статическая архитектура:
- **Путь:** `/public/vin/:vin/:state/index.html`
- **Роутинг:** Vercel rewrites → `api/seo-vin-page.js`
- **Fallback:** Динамическая генерация при отсутствии файла

#### Vercel Configuration:
```json
{
  "rewrites": [
    {
      "source": "/vin/:vin/:state",
      "destination": "/api/seo-vin-page.js?vin=:vin&state=:state"
    }
  ]
}
```

### Зависимости

```json
{
  "dependencies": {
    "openai": "^4.104.0",
    "jsdom": "^24.0.0",
    "pdf-parse": "^1.1.1"
  }
}
```

### Структура файлов

```
scripts/seo/
├── ai/                    # AI модули
├── analytics/             # Аналитика
├── build/                 # Build модули
├── cache/                 # Кэширование
├── circuit-breaker/       # Circuit breaker
├── cleanup/               # Очистка
├── clusters/             # Кластеризация
├── complexity/            # Адаптивная сложность
├── config/                # Конфигурация
├── contradictions/        # Разрешение противоречий
├── content/               # Генерация контента
├── crawl/                 # Crawl budget
├── dom/                   # DOM и шаблоны
├── evolution/             # Самоэволюция
├── health/                # Здоровье системы
├── i18n/                  # Интернационализация
├── images/                # Генерация изображений
├── intelligence/          # Интеллектуальные модули
├── intent/                # Поисковый интент
├── keywords/              # Ключевые слова
├── layout/                # Layout выбор
├── learning/              # Обучение
├── links/                 # Внутренние ссылки
├── local/                 # Локальный SEO
├── ltr/                   # Learning-to-Rank
├── maintenance/           # Обслуживание
├── monitoring/            # Мониторинг
├── optimization/          # Оптимизация
├── orchestration/         # Оркестрация
├── patterns/              # Паттерны
├── performance/           # Производительность
├── phases/                # Фазы развития
├── platform/              # Платформа
├── prediction/            # Предсказания
├── prevention/            # Профилактика
├── profiling/             # Профилирование
├── protection/            # Защита
├── quality/               # Качество
├── randomness/            # Случайность
├── regeneration/          # Регенерация
├── seeds/                 # Seeds
├── serp/                  # SERP features
├── sitemap/               # Sitemap
├── structured-data/       # Структурированные данные
├── testing/               # Тестирование
├── transparency/          # Прозрачность
├── utils/                 # Утилиты
├── validation/           # Валидация
└── voice/                 # Голосовой поиск
```

**Всего директорий модулей:** 52

---

## 🔐 БЕЗОПАСНОСТЬ И НАДЕЖНОСТЬ

### Защита от ошибок

#### Error Isolation:
- Изоляция модулей при ошибках
- Fallback механизмы
- Автоматическое восстановление

#### Circuit Breaker:
- Защита от каскадных сбоев
- Автоматическое отключение проблемных модулей

#### Fallback Mechanisms:
- Groq → DeepSeek → OpenAI
- Baseline контент при ошибках AI
- Regex fallback для валидации HTML

#### Auto Repair:
- Автоматическое исправление ошибок
- Регенерация проблемных страниц

### Мониторинг

#### Memory Monitor:
- Отслеживание использования памяти
- Автоматическая очистка (отключена на Vercel)

#### Performance Profiler:
- Профилирование этапов
- Выявление узких мест

#### Error Intelligence:
- Анализ ошибок
- Предложение решений

#### Predictive Maintenance:
- Предсказание проблем
- Профилактические меры

---

## 📈 МАСШТАБИРУЕМОСТЬ

### Текущие возможности

#### Максимум страниц:
- **За билд:** 20,000 (hard limit)
- **В кластере:** 500 (maxPagesPerCluster)

#### Параллельные билды:
- Поддержка через `BuildCoordinator`
- Разделение по штатам
- Агрегация результатов

#### Инкрементальные билды:
- Только измененные страницы
- Checksum проверка
- Экономия времени

### Планы развития

#### Фазы A-E:
- Адаптивные улучшения в зависимости от объема
- Автоматическая активация фаз

#### AI Seed Expansion:
- Автоматическое расширение seed-list
- Анализ пробелов
- Рекомендации объема

#### Multi-threading:
- Оптимизация для параллельной обработки
- Адаптивная конкуренция

---

## 💰 СТОИМОСТЬ И ЛИМИТЫ

### API Провайдеры

#### Groq:
- **План:** Бесплатный
- **Лимиты:** Rate limit (автоматический fallback)
- **Использование:** Primary

#### DeepSeek:
- **План:** Платный
- **Стоимость:** Дешевле OpenAI
- **Использование:** Fallback

#### OpenAI:
- **План:** Платный
- **Стоимость:** Дорого
- **Использование:** Last resort

### Оптимизация затрат

#### Groq Priority:
- Используется первым (бесплатно)
- Автоматический fallback при ошибках

#### DeepSeek Fallback:
- Только при ошибках Groq
- Более надежный, но платный

#### OpenAI Last Resort:
- Только в критических случаях
- Самый дорогой вариант

#### Кэширование:
- **90% запросов** из кэша
- Экономия API вызовов
- **9,185+ записей** в кэше

---

## 🔄 ОТЛИЧИЯ ОТ M1 ВЕРСИИ

### Что НЕ включено в Pre-M1 версии:

#### ❌ Local AI Provider
- Нет поддержки Ollama
- Нет локального AI
- Только API провайдеры

#### ❌ M1 Optimizer
- Нет оптимизации для MacBook M1
- Нет специальных настроек потоков
- Нет M1-specific конфигурации

#### ❌ M1-specific concurrency
- Нет специальных настроек для M1
- Стандартная конкуренция (10-25 потоков)

#### ❌ Local AI timeout
- Нет 60-секундных таймаутов для локального AI
- Только API таймауты (15s/25s/30s)

### Что работает одинаково:

#### ✅ Все 21 этап pipeline
- Полная функциональность
- Все модули работают

#### ✅ Все 37 фичи
- Все фичи включены
- Полная функциональность

#### ✅ Все 15 TRIZ модулей
- Все модули работают
- Полная защита и оптимизация

#### ✅ AI Training Pipeline
- Обучение на документации
- Обучение на VIN отчетах
- Обучение на собранных данных

#### ✅ VIN Report Training
- Парсинг PDF
- Извлечение структуры
- Обучение AI

#### ✅ VIN Collection Training
- Сбор VIN данных
- Анализ конверсий
- Обучение AI

---

## 📝 ИЗВЕСТНЫЕ ПРОБЛЕМЫ (Pre-M1)

### Критические

#### ⚠️ Groq Rate Limits
- **Проблема:** Периодические 429 ошибки
- **Решение:** Автоматический fallback на DeepSeek
- **Статус:** Решено (не критично)

#### ⚠️ DeepSeek Timeout
- **Проблема:** Иногда таймауты на длинных промптах
- **Решение:** Увеличен timeout до 25 секунд
- **Статус:** Улучшено

### Некритические

#### Seed Analyzer
- **Проблема:** Иногда ошибка `combinations.has is not a function`
- **Решение:** Исправлено (конвертация Set ↔ Array)
- **Статус:** Решено

#### Memory Monitor
- **Проблема:** Периодические логи критической памяти
- **Решение:** Отключено на Vercel
- **Статус:** Решено

---

## 🔄 ВЕРСИОНИРОВАНИЕ

### Текущая версия: 6.0 (Pre-M1)

#### Основные изменения:
- 30+ новых модулей
- TRIZ оптимизация
- AI Training Pipeline
- VIN Report Training
- VIN Collection Training
- 37 фичи включено
- 15 TRIZ модулей

#### Совместимость:
- Vercel-оптимизированная версия
- Только API провайдеры (Groq/DeepSeek/OpenAI)
- Нет локального AI

---

## 📚 ДОКУМЕНТАЦИЯ

### Основные документы:
- `SEO_MONSTER_6.0_SUMMARY.md` - Обзор системы
- `FULL_SYSTEM_CONTROL_CHECK.md` - Контрольная проверка
- `TRIZ_ARCHITECTURE_ANALYSIS.md` - TRIZ анализ
- `SEO_MACHINE_SPECS_PRE_M1.md` - Спецификации (краткие)
- `SEO_MACHINE_SPECS_PRE_M1_DETAILED.md` - Спецификации (развернутые)

### Техническая документация:
- `scripts/seo/README.md` - Архитектура модулей
- `docs/seo-machine/` - Детальная документация
- `INTEGRATION_GUIDE.md` - Руководство по интеграции

---

## 🎯 КЛЮЧЕВЫЕ ОТЛИЧИЯ

### AI Провайдеры (Pre-M1)
```
1. Groq (primary) - быстрый, бесплатный
2. DeepSeek (fallback) - надежный
3. OpenAI (last resort) - дорогой
```

### Конфигурация (Pre-M1)
```json
{
  "aiProviders": ["groq", "deepseek", "openai"],
  "aiMaxTokens": 400,
  "targetPagesPerBuild": 10000
}
```

### Окружение (Pre-M1)
- **Платформа:** Vercel только
- **AI:** Только API (нет локального)
- **Оптимизация:** Vercel-специфичная

---

## 🚀 ПЛАНЫ НА СЛЕДУЮЩУЮ ВЕРСИЮ (6.1+)

### Новые задачи для интеграции

#### 1. GEO (Generative Engine Optimization / AI-Snippets)

**Назначение:** Оптимизация контента для AI-сниппетов в генеративных поисковых системах (Google SGE, Bing Chat, Perplexity и др.)

**Проблема:**
- 46% поисковых запросов теперь обрабатываются генеративными AI-системами
- Традиционный SEO не оптимизирован для AI-ответов
- Нужна специальная оптимизация для попадания в AI-сниппеты

**Задачи для интеграции:**

##### 1.1. AI-Snippet Content Optimization
- **Модуль:** `scripts/seo/geo/ai-snippet-optimizer.js`
- **Функции:**
  - Генерация контента в формате Q&A (вопрос-ответ)
  - Структурирование данных для AI-парсинга
  - Оптимизация под формат AI-ответов (краткие, точные, фактологические)
  - Добавление контекстных метаданных для AI-понимания

##### 1.2. Structured Data для AI
- **Модуль:** `scripts/seo/geo/ai-structured-data.js`
- **Функции:**
  - Расширенные Schema.org разметки (FAQPage, QAPage, HowTo, Article)
  - Специальные мета-теги для AI-понимания
  - JSON-LD разметка для фактологических данных
  - Семантические аннотации для AI-парсеров

##### 1.3. AI-Snippet Testing & Validation
- **Модуль:** `scripts/seo/geo/ai-snippet-validator.js`
- **Функции:**
  - Тестирование контента на попадание в AI-сниппеты
  - Валидация структуры для AI-понимания
  - Симуляция AI-парсинга контента
  - Метрики попадания в AI-ответы

##### 1.4. Multi-Engine Optimization
- **Модуль:** `scripts/seo/geo/multi-engine-optimizer.js`
- **Функции:**
  - Оптимизация для Google SGE (Search Generative Experience)
  - Оптимизация для Bing Chat
  - Оптимизация для Perplexity
  - Оптимизация для других генеративных поисковых систем

**Интеграция в Pipeline:**
- **Новый этап:** `ai-snippet-optimization` (после `content-generation`, перед `html-rendering`)
- **Обогащение:** AI-сниппеты добавляются в HTML как отдельные блоки
- **Метрики:** Отслеживание попадания в AI-ответы через GSC и API

**Ожидаемый результат:**
- Увеличение видимости в генеративных поисковых системах
- Попадание в AI-сниппеты для 30-40% страниц
- Увеличение органического трафика на 20-30%

---

#### 2. AEO (Answer Engine Optimization)

**Назначение:** Оптимизация для 46% генеративных поисковых запросов, где пользователи получают прямые ответы от AI

**Проблема:**
- 46% поисковых запросов обрабатываются AI-системами напрямую
- Пользователи получают ответы без перехода на сайт
- Нужна стратегия для попадания в AI-ответы и сохранения трафика

**Задачи для интеграции:**

##### 2.1. Answer-First Content Strategy
- **Модуль:** `scripts/seo/aeo/answer-first-strategy.js`
- **Функции:**
  - Генерация контента в формате "ответ на вопрос"
  - Приоритизация фактологического контента
  - Структурирование данных для прямых ответов
  - Оптимизация под voice search и conversational queries

##### 2.2. Conversational Query Optimization
- **Модуль:** `scripts/seo/aeo/conversational-optimizer.js`
- **Функции:**
  - Оптимизация под естественные языковые запросы
  - Генерация контента для conversational AI
  - Поддержка многошаговых диалогов
  - Контекстная оптимизация для follow-up вопросов

##### 2.3. Factual Data Extraction & Structuring
- **Модуль:** `scripts/seo/aeo/factual-data-extractor.js`
- **Функции:**
  - Извлечение фактологических данных из VIN отчетов
  - Структурирование данных в формате для AI
  - Создание knowledge graph для фактов
  - Валидация точности фактов

##### 2.4. AI Answer Tracking & Analytics
- **Модуль:** `scripts/seo/aeo/ai-answer-tracker.js`
- **Функции:**
  - Отслеживание попадания в AI-ответы
  - Анализ типов запросов, которые попадают в AI
  - Метрики видимости в генеративных системах
  - A/B тестирование стратегий AEO

##### 2.5. Attribution & Branding в AI-ответах
- **Модуль:** `scripts/seo/aeo/ai-attribution-optimizer.js`
- **Функции:**
  - Оптимизация для упоминания бренда в AI-ответах
  - Структурирование данных для правильной атрибуции
  - Создание контекста для ссылок на источник
  - Оптимизация для сохранения трафика даже при прямых ответах

**Интеграция в Pipeline:**
- **Новый этап:** `answer-engine-optimization` (после `ai-snippet-optimization`, перед `html-rendering`)
- **Обогащение:** AEO-оптимизированный контент интегрируется в HTML
- **Метрики:** Отслеживание через специальные API и аналитику

**Ожидаемый результат:**
- Попадание в AI-ответы для 40-50% релевантных запросов
- Сохранение трафика через правильную атрибуцию
- Увеличение brand awareness через упоминания в AI-ответах
- Адаптация к будущему поиска (AI-first)

---

### Технические требования для интеграции

#### Новые модули:
```
scripts/seo/
├── geo/                          # GEO модули
│   ├── ai-snippet-optimizer.js
│   ├── ai-structured-data.js
│   ├── ai-snippet-validator.js
│   └── multi-engine-optimizer.js
└── aeo/                          # AEO модули
    ├── answer-first-strategy.js
    ├── conversational-optimizer.js
    ├── factual-data-extractor.js
    ├── ai-answer-tracker.js
    └── ai-attribution-optimizer.js
```

#### Новые этапы Pipeline:
1. **ai-snippet-optimization** (после `content-generation`)
2. **answer-engine-optimization** (после `ai-snippet-optimization`)

#### Новые метрики:
- AI snippet visibility rate
- AI answer inclusion rate
- Conversational query coverage
- Factual data accuracy score
- Brand attribution rate in AI answers

#### Новые конфигурации:
```json
{
  "features": {
    "geoOptimization": true,
    "aeoOptimization": true
  },
  "geo": {
    "enabled": true,
    "targetEngines": ["google-sge", "bing-chat", "perplexity"],
    "snippetFormat": "qa",
    "factualDataWeight": 0.8
  },
  "aeo": {
    "enabled": true,
    "conversationalOptimization": true,
    "attributionOptimization": true,
    "answerFirstStrategy": true
  }
}
```

#### Зависимости:
- Расширенные Schema.org разметки
- API для отслеживания AI-ответов (если доступны)
- Интеграция с GSC для AI-метрик

---

### Приоритет интеграции

**Высокий приоритет:**
- GEO (AI-Snippets) - критично для будущего поиска
- AEO (Answer Engine Optimization) - адаптация к 46% генеративных запросов

**Сроки:**
- Версия 6.1: Базовая интеграция GEO и AEO
- Версия 6.2: Расширенные метрики и оптимизация
- Версия 6.3: Multi-engine поддержка и advanced features

**Ожидаемый impact:**
- Увеличение видимости в генеративных поисковых системах на 30-40%
- Попадание в AI-ответы для 40-50% релевантных запросов
- Адаптация к будущему поиска (AI-first подход)
- Сохранение и рост органического трафика

---

**Последнее обновление:** 2025-12-01  
**Версия спецификаций:** 2.1 (Развернутые, Pre-M1 + Планы на 6.1+)

