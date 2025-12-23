# Build & Run Pipeline

## 1. Команды сборки

| Команда | Что делает | Где используется |
| --- | --- | --- |
| `npm run build` / `npm run build:seo` | `node scripts/build-seo-full-5.js`. Полный Build 5.0: генерация страниц (legacy + massive + KG), quality layer, sitemap inspector, опциональный RL training. | Локально, GitHub Actions, Vercel Build Command. |
| `npm run vercel-build` | Тоже `build-seo-full-5.js`. | Значение `Build Command` в Vercel. |
| `npm run build:seo:rl` | Алиас на `build-seo-full-5.js`. Можно вызывать при включённом `SEO_ENABLE_RL=true`, тогда оркестратор гарантированно зацепит RL-цикл. | Ручной запуск с принудительным RL. |
| `npm run build:seo:no-rl` | `node scripts/build-seo-full-3.js` (упрощённый пайплайн без RL/quality). | Экстренный билд, если RL или KG мешают. |
| `npm run build:seo:legacy` | `node scripts/build-seo-pages.js`. Только генерация HTML + sitemap, без остальных стадий. | Отладка генераторов. |
| `npm run dashboard:build` | `node scripts/dashboard/build-dashboard-data.js`. Собирает JSON для внутреннего дашборда. | После билдов / в автопилоте. |
| `npm run metrics:seo` | `node scripts/seo-metrics.js`. Пересчитывает качество контента. | Контроль качества массивной генерации. |
| `npm run rl:train` | `node scripts/rl/rl-train-and-apply.js`. Reward → policy. | Ручной запуск RL после загрузки GSC/behavior. |
| `npm run rl:auto` | `node scripts/rl/auto-gsc-train.js`. Ищет ZIP/API → извлекает → гоняет `rl:train` → обновляет `config/lang-policy.json` и `config/cluster-policy.json`. | Автопилот, ручной запуск. |
| `npm run rl:policy` | `node scripts/rl/policy-engine.js`. Читает `data/gsc/processed/aggregated-metrics.json` и корректирует политики. | После ручной подготовки метрик. |
| `npm run autonomy:daily` | `node scripts/autonomy/run-daily-cycle.js`. Решает, запускать ли билд, гоняет sitemap-only, RL, пересборку дашборда. | GitHub Actions (`.github/workflows/autonomy-daily.yml`). |

Критичные ENV (из кода):

- `SEO_TARGET_PAGES`, `SEO_MAX_PAGES_PER_BUILD`, `SEO_WRITE_BATCH_SIZE`, `SEO_WRITE_CONCURRENCY` — контролируют объём/скорость генерации (используются в `generate-massive-seo-articles.js` и `generate-knowledge-graph-pages.js`).
- `SEO_BASE_URL`, `SEO_URLS_PER_SITEMAP`, `SEO_TARGET_FULL_EXPOSURE_DAYS`, `SEO_MIN_SITEMAPS_PER_DAY`, `SEO_MAX_SITEMAPS_PER_DAY`, `SEO_LAUNCH_DATE` — влияют на `scripts/seo-sitemap-batcher.js`.
- `SEO_ENABLE_RL` — переключатель внутри `scripts/build-seo-full-5.js`.
- `SEO_GLOBAL_MAX_NEW_PAGES_PER_BUILD`, `SEO_GLOBAL_MAX_EXPOSE_PER_DAY`, `SEO_PENALTY_MODE` — ограничения из `scripts/seo-config.js`.
- `SEO_EN_* / SEO_ES_*` аналитические идентификаторы (`scripts/seo-analytics.js`), `SEO_QUALITY_LOG*` (`scripts/seo-text-quality.js`).

## 2. Ступени пайплайна

1. **`npm run build:seo` → `scripts/build-seo-full-5.js`**  
   - Логирует запуск и по очереди выполняет:
     1. `node scripts/build-seo-pages.js`
     2. `node scripts/seo-quality-engine.js`
     3. `node scripts/seo-graph-engine.js`
     4. `node scripts/seo-sitemap-inspector.js`
     5. (если `SEO_ENABLE_RL=true` или есть данные) `node scripts/rl/rl-train-and-apply.js`
2. **`scripts/build-seo-pages.js`**  
   - Удаляет `public/static-pages`, создаёт директорию.  
   - Последовательно запускает legacy-генераторы (`generate-10000`, `generate-7000`, `generate-5000`, `generate-pagination`).  
   - Вызывает `generate-massive-seo-articles.js` (батчи VIN/intent страниц с кэшем и lang-policy).  
   - Гоняет `scripts/generate-knowledge-graph-pages.js` (guides/fraud/DMV).  
   - (Если существует) `sync-articles-to-static-pages.js` — сейчас файла нет, поэтому шаг пропускается.  
   - Собирает список всех HTML в `public/static-pages` и передаёт его в `scripts/seo-sitemap-batcher.js`.
3. **`scripts/seo-sitemap-batcher.js`**  
   - Делит URL на EN/ES списки, режет по `SEO_URLS_PER_SITEMAP`.  
   - Учитывает `data/rl/sitemap-policy.json` (target days, min/max sitemap per day).  
   - Формирует `sitemap-en-*.xml`, `sitemap-es-*.xml`, `sitemap-en-index.xml`, `sitemap-es-index.xml`, `sitemap-seo.xml`.  
   - Записывает метрики в `public/seo-stats.json` (используется dashboard и cursor tasks).
4. **Vercel deploy**  
   - Build command = `npm run vercel-build` → тот же пайплайн.  
   - Output: `public/static-pages/**/index.html` + sitemap файлы.  
   - Vercel сервирует как статический сайт; sitemap файлы доступны по `https://<domain>/sitemap-*.xml`.
5. **Post-build utilities**  
   - `npm run metrics:seo` — пересчёт среднего word count/FAQ.  
   - `npm run dashboard:build` — собирает `public/internal/dashboard-data.json` и инлайнит его в `public/internal/seo-autonomy-9d3f7c.html`.

## 3. One-button Run

- **UI элемент**: на секретном dashboard `/internal/seo-autonomy-9d3f7c.html` добавляется кнопка-заглушка “Run SEO Machine”.  
- **Что должна делать**: отправлять управляющий запрос (в перспективе — POST на internal endpoint) или запускать shell-задачу `npm run build:seo`. Пока кнопка лишь показывает уведомление, но документация фиксирует, что единственная «официальная» команда = `npm run build:seo`.  
- **Под капотом** (когда будет привязка к автопилоту):
  1. Проверяет политику (`config/autonomy-config.json`) и состояние (`data/autonomy-state.json`) — можно ли запускать билд.  
  2. Гоняет `npm run build:seo`.  
  3. Дополнительно запускает `npm run dashboard:build` для обновления метрик.  
  4. (Опционально) `npm run rl:auto` → обновление политик после получения свежего GSC.  
- **Fallback**: если кнопка недоступна, те же действия выполняет `npm run autonomy:daily` (через GitHub Actions).


















