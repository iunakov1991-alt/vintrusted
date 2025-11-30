# VINTRUSTED SEO ENGINE — ARCHITECTURE (EN + ES)

## Overview

- Static SEO grid for VIN / DMV / fraud / auctions.
- Two language branches: EN and ES (US Hispanic).
- RL-driven sitemap and language mix.
- Massive generator with batching and caching.
- Quality dashboard and test suite.

## Key modules

- `scripts/seo-content-engine.js` — контентное ядро (states/makes/years, pageData).
- `generate-massive-seo-articles.js` — массовый генератор страниц EN+ES.
- `scripts/seo-sitemap-batcher.js` — двуязычные sitemap-индексы (EN/ES + master).
- `scripts/rl/*` — RL-движок (rewards, policies).
- `scripts/seo-lang-policy.js` — выбор языка по lang-policy.json.
- `scripts/seo-cache.js` — кэш тяжёлых вычислений.
- `scripts/seo-metrics.js` — сбор метрик качества.
- `public/seo-dashboard.html` — дашборд качества.

## RL loop

1. Собираются behavior-логи (`data/behavior-logs/behavior.log`).
2. Экспорт GSC → `data/gsc/gsc-latest.csv`.
3. `node scripts/rl/rl-train-and-apply.js`
   - Обновляет:
     - `data/rl/url-rewards.json`
     - `data/a-b-tests/policy.json`
     - `data/rl/sitemap-policy.json`
     - `data/rl/lang-policy.json`
4. Следующий билд:
   - sitemap-batcher читает sitemap-policy.
   - massive generator читает lang-policy.
   - a/b engine читает a-b policy.

## Quality monitoring

- После генерации:
  - `npm run metrics:seo`
- Смотрим:
  - `data/metrics/quality-dashboard.json`
  - `public/seo-dashboard.html`

## Performance optimizations

- **Кэширование:** тяжёлые вычисления (market data, stats) кэшируются в `data/cache/seo-cache.json`.
- **Батчинг I/O:** запись файлов батчами по `SEO_WRITE_BATCH_SIZE` (default: 400).
- **Параллелизм:** ограниченный параллелизм через `SEO_WRITE_CONCURRENCY` (default: 8).

## Testing

```bash
npm run test:seo
```

Тесты для критичных модулей:
- `tests/rl-lang-policy.test.mjs` — проверка lang-policy
- `tests/seo-cache.test.mjs` — проверка кэширования


