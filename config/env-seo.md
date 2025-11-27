# SEO ENV VARIABLES

## Volume / generation

- `SEO_TARGET_PAGES` — целевое количество страниц для генерации (default: 500000)
- `SEO_MAX_PAGES_PER_BUILD` — жёсткий лимит на билд (default: 500000)
- `SEO_MAX_CLUSTER_INDEX` — максимальный индекс кластера (default: 50)
- `SEO_WRITE_BATCH_SIZE` — размер батча для записи файлов (default: 400)
- `SEO_WRITE_CONCURRENCY` — максимальное количество параллельных операций записи (default: 8)

## Sitemap

- `SEO_BASE_URL` — базовый URL сайта (default: https://vintrusted.com)
- `SEO_LAUNCH_DATE` — дата запуска проекта для расчёта прогресса (default: 2025-12-10)
- `SEO_URLS_PER_SITEMAP` — количество URL в одной sitemap части (default: 30000)
- `SEO_TARGET_FULL_EXPOSURE_DAYS` — цель: за сколько дней раскрыть все sitemap (default: 90)
- `SEO_MIN_SITEMAPS_PER_DAY` — минимальное количество sitemap в день (default: 1)
- `SEO_MAX_SITEMAPS_PER_DAY` — максимальное количество sitemap в день (default: 40)

(Часть значений может быть переопределена RL-политикой в `data/rl/sitemap-policy.json`.)

## Analytics / GA4 / GSC

- `GA4_MEASUREMENT_ID` — Measurement ID для Google Analytics 4
- `GA4_API_SECRET` — API Secret для GA4
- (см. `config/analytics.example.json`)

## Notes

- EN/ES доля управляется `lang-policy.json` (генерируется RL-циклом).
- massive generator читает эти политики автоматически.
- Кэш хранится в `data/cache/seo-cache.json` и может быть очищен вручную.

