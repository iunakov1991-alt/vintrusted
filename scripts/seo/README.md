# SEO MONSTER 6.0 — Абсолютная Печатная Машина для SEO-Трафика

## Архитектура

### Модульная структура

```
scripts/seo/
├── orchestration/          # Главный пайплайн
│   ├── seo-master-pipeline.js
│   └── url-factory.js
├── dom/                    # DOM и layout система
│   ├── layout-engine.js    # 9 layout схем
│   └── template-engine.js  # Рендеринг HTML
├── content/                # Генерация контента
│   ├── baseline-blocks.js  # Базовый контент без AI
│   └── ai-augmentation.js # AI с fallback цепочками
├── clusters/              # Кластеризация
│   └── cluster-engine.js
├── keywords/              # Keyword intelligence
├── ltr/                   # Learning-to-Rank
│   └── weight-engine.js
├── quality/               # Оценка качества
│   └── quality-engine.js
├── links/                 # Внутренние ссылки
│   └── internal-links-engine.js
├── sitemap/               # Sitemap генерация
│   └── sitemap-engine.js
├── platform/              # Статическая архитектура
│   └── static-architecture.js
└── uniqueness-engine.js   # Проверка уникальности
```

## Ключевые особенности

### 1. 9 Layout схем
- A, B, C, D, E, F, G, H, I
- Вариативный порядок блоков
- Weighted distribution на основе метрик

### 2. AI генерация контента
- DeepSeek API (единственный провайдер)
- Кеширование для производительности

### 3. Learning-to-Rank
- Автоматическое обновление весов для intents/languages/clusters
- Перераспределение build budget
- Обучение на каждом цикле

### 4. Uniqueness Engine
- Проверка уникальности структуры DOM
- Проверка уникальности контента
- Защита от дубликатов

### 5. Статическая архитектура
- Все страницы → `public/vin/:vin/:state/index.html`
- Без API endpoints в runtime
- Прямой маппинг URL → static file

## Конфигурация

### data/seo/config.json
```json
{
  "targetPagesPerBuild": 10000,
  "maxPagesPerCluster": 500,
  "minQualityScore": 0.75,
  "enableAI": true,
  "layoutCount": 9,
  "uniquenessThreshold": 0.85
}
```

### Переменные окружения
- `SEO_ENABLE_AI=1` - включить AI
- `DEEPSEEK_API_KEY=...` - ключ DeepSeek (обязательно)
- `SEO_BUILD_CONCURRENCY=8` - конкурентность генерации

## Запуск

```bash
npm run vercel-build
```

Или напрямую:
```bash
node scripts/seo/seo-master-build.js
```

## Пайплайн

1. **URL Planning** - планирование URL с учетом приоритетов
2. **Content Generation** - генерация контента (baseline + AI)
3. **HTML Rendering** - рендеринг HTML с выбранным layout
4. **Uniqueness Validation** - проверка уникальности
5. **Quality Scoring** - оценка качества
6. **Clustering** - кластеризация страниц
7. **Internal Links** - генерация внутренних ссылок
8. **Static Publishing** - публикация статических файлов
9. **Sitemap Generation** - генерация sitemaps
10. **LTR Update** - обновление весов для следующего билда

## Результат

- Статические HTML файлы в `public/vin/:vin/:state/index.html`
- Sitemaps в `public/seo/sitemaps/`
- Обновленный RL state в `data/seo/rl-state.json`
- Полностью автономная система без человеческого вмешательства

