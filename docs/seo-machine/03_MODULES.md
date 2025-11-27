# Module Map

## 1. CORE-модули

| Файл | Тип | Язык | Вход | Выход / роль |
| --- | --- | --- | --- | --- |
| `scripts/build-seo-full-5.js` | orchestrator | BOTH | env, CLI | Последовательно гоняет build→quality→graph→sitemap inspector→(опц.) RL. Используется всеми основными командами (`npm run build*`). |
| `scripts/build-seo-pages.js` | orchestrator/sync | BOTH | — | Очищает `public/static-pages`, запускает legacy генераторы, `generate-massive-seo-articles.js`, `generate-knowledge-graph-pages.js`, собирает список HTML и передаёт в sitemap-batcher. |
| `generate-massive-seo-articles.js` | generator | BOTH | `{state, make, year, lang, intent, clusterIndex}` (+ lang-policy, cache) | Генерирует VIN/intent страницы пачками, использует `withCache`, concurrency, считает метрики качества и пишет `public/static-pages/**/index.html`. |
| `generate-10000-seo-articles.js`, `generate-7000-seo-articles.js`, `generate-5000-new-articles.js`, `generate-pagination.js` | generator (legacy) | EN | заранее подготовленные slug/контент массивы | Дополнительные статические страницы, которые build-сборка по-прежнему синхронизирует в `public/static-pages`. |
| `generate-knowledge-graph-pages.js` | generator | BOTH | seeds из `scripts/seo-kg-engine.js` | Создаёт guides/fraud/DMV страницы с перелинковкой и hreflang. |
| `scripts/seo-content-engine.js` | engine | BOTH | data/states.json, data/makes-models.json | Готовит PageData для VIN/intent страниц (title, мета, таблицы, FAQ, внутренние ссылки). |
| `scripts/seo-kg-engine.js` | engine | BOTH | `scripts/seo-kg-config.js`, `data` | Строит KG seeds, graph, hreflang пары и метаданные для guides/fraud страниц. |
| `scripts/seo-template.js` | renderer | BOTH | PageData | Общий HTML шаблон (JSON-LD, CTA, SEO блоки, structured data). |
| `scripts/seo-lang-policy.js` | util | BOTH | `data/rl/lang-policy.json` | Загружает веса EN/ES, fallback 70/30, предоставляет `chooseLang()` для генераторов. |
| `scripts/seo-cache.js` | util | — | ключ + async fn | Простая файловая LRU (json) для повторно используемых расчётов в генераторах. |
| `scripts/seo-sitemap-batcher.js` | sitemap | — | список HTML путей | Делит на EN/ES, режет по `SEO_URLS_PER_SITEMAP`, учитывает RL-политику скорости, создаёт sitemap файлы и `public/seo-stats.json`. |
| `scripts/build-sitemap-only.js` | sitemap | — | — | Быстрый пересчёт sitemap на уже сгенерированных HTML; используется автопилотом. |
| `scripts/seo-metrics.js` | telemetry | — | `data/metrics/massive-gen-quality.json` | Строит `data/metrics/quality-dashboard.json`, отмечает отклонения (avg words, FAQ, lang share). |
| `scripts/dashboard/build-dashboard-data.js` | telemetry | — | `public/seo-stats.json`, `data/autonomy-state.json`, `config/lang-policy.json`, `config/cluster-policy.json`, `data/gsc/...`, `autonomy-log.jsonl` | Собирает единый `public/internal/dashboard-data.json`, генерирует cursor tasks, встраивает JSON в dashboard HTML. |

## 2. Extensions

### Reinforcement Learning — **Status: PARTIAL**

- `scripts/rl/reward-model.js` — читает `data/behavior-logs/behavior.log` + `data/gsc/gsc-latest.csv`, считает engagement/SEO метрики и записывает `data/rl/url-rewards.json`.
- `scripts/rl/policy-updater.js` — по rewards строит `data/a-b-tests/policy.json`, `data/internal-link-graphs/boosted.json`, `data/rl/sitemap-policy.json`, `data/rl/lang-policy.json`.
- `scripts/rl/rl-train-and-apply.js` — единая команда `npm run rl:train`.
- `scripts/rl/extract-gsc-from-zip.js`, `scripts/rl/prepare-gsc-csv.js` — поиск ZIP (Pages.csv/Страницы.csv), извлечение, нормализация колонок.
- `scripts/rl/fetch-gsc-api.js` — заготовка под GSC API (Service Account).
- `scripts/rl/auto-gsc-train.js` — автоматический сценарий: ZIP/API → `extract` → `rl:train` → обновление `config/lang-policy.json` и `config/cluster-policy.json`.
- `scripts/rl/policy-engine.js` — читает `data/gsc/processed/aggregated-metrics.json`, корректирует lang/cluster политики.

### Knowledge Graph — **Status: IMPLEMENTED**

- `scripts/seo-kg-engine.js`, `scripts/seo-kg-template.js`, `generate-knowledge-graph-pages.js` как описано выше.

### Autonomy — **Status: PARTIAL**

- `scripts/autonomy/run-daily-cycle.js`, `config/autonomy-config.json`, `scripts/utils/autonomy-logger.js`, `data/autonomy-log.jsonl`, `public/internal/seo-autonomy-9d3f7c.html`. Запускаются через `npm run autonomy:daily` / GitHub Actions.

### AI Content — **Status: PLANNED**

- В репозитории нет модулей `scripts/ai/*` или LLM-интеграции. Документация должна ссылаться на будущий модуль (см. `04_AUTONOMY_AND_AI.md` для TODO).

## 3. ENV Matrix (фактически используются)

| ENV | Где используется | Значения / заметки |
| --- | --- | --- |
| `SEO_TARGET_PAGES` | `generate-massive-seo-articles.js`, `generate-knowledge-graph-pages.js` | Целевой объём страниц за прогон (default `500000`). Большие значения увеличивают очередь задач и время билда пропорционально. |
| `SEO_MAX_PAGES_PER_BUILD` | те же | Жёсткий лимит страниц за запуск (default = `SEO_TARGET_PAGES`). Нужен, чтобы не уйти в десятки миллионов за один билд. |
| `SEO_WRITE_BATCH_SIZE` | `generate-massive-seo-articles.js` | Размер батча при создании HTML (default `400`). Слишком большие значения → всплески RAM. |
| `SEO_WRITE_CONCURRENCY` | `generate-massive-seo-articles.js` | Кол-во параллельных file writes (default `8`). Увеличение ускоряет запись, но нагружает диск/CPU. |
| `SEO_BASE_URL` | `scripts/seo-template.js`, `scripts/seo-sitemap-batcher.js`, `scripts/seo-kg-engine.js`, `scripts/seo-kg-template.js`, `scripts/seo-config.js` | Базовый домен, используется для canonical/hreflang/sitemap ссылок. По умолчанию `https://vintrusted.com`. |
| `SEO_URLS_PER_SITEMAP` | `scripts/seo-sitemap-batcher.js` | Сколько URL в одной sitemap части (default `30000`). |
| `SEO_TARGET_FULL_EXPOSURE_DAYS` | `scripts/seo-sitemap-batcher.js` | За сколько дней открыть все sitemap (default `90`). Влияет на расчёт разрешённых частей. |
| `SEO_MIN_SITEMAPS_PER_DAY`, `SEO_MAX_SITEMAPS_PER_DAY` | `scripts/seo-sitemap-batcher.js` | Ограничители скорости выдачи sitemap (default 1/40). |
| `SEO_LAUNCH_DATE` | `scripts/seo-sitemap-batcher.js` | Дата старта для расчёта `daysPassed` (default `2025-12-10`). |
| `SEO_ENABLE_RL` | `scripts/build-seo-full-5.js` | Если `true`, Build 5.0 всегда запускает `rl-train-and-apply`. |
| `SEO_GLOBAL_MAX_NEW_PAGES_PER_BUILD`, `SEO_GLOBAL_MAX_EXPOSE_PER_DAY`, `SEO_PENALTY_MODE` | `scripts/seo-config.js` | Безопасность: ограничение новых страниц и экспонирования; `PENALTY_MODE=on` снижает скорость раскрытия. |
| `SEO_EN_GA_MEASUREMENT_ID`, `SEO_EN_GOOGLE_ADS_ID`, `SEO_EN_FB_PIXEL_ID`, `SEO_ES_GA_MEASUREMENT_ID`, `SEO_ES_GOOGLE_ADS_ID`, `SEO_ES_FB_PIXEL_ID` | `scripts/seo-analytics.js` | Инъекция аналитики в шаблоны (если значения заданы). |
| `SEO_QUALITY_LOG`, `SEO_QUALITY_LOG_PATH` | `scripts/seo-text-quality.js` | Включают логирование страниц, не прошедших quality threshold. |

> Если ENV не встречается в коде (например, `SEO_MAX_CLUSTER_INDEX`), он не включён в таблицу, даже если упомянут в старой документации.


