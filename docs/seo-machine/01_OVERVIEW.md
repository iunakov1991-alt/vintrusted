# SEO Machine Overview

## 1. Purpose

Эта система — автономная SEO-машина для VIN-сервиса, рассчитанная на масштаб 10–100+ млн статических страниц (SSG), работающих на Vercel. Цель: генерировать и поддерживать огромную EN/ES сетку VIN/DMV/auction страниц, контролировать скорость публикации и иметь возможность подключать RL/AI-расширения, чтобы максимизировать органический трафик при минимальном ручном участии.

## 2. High-level pipeline

1. **Seed generation** (`scripts/seo-content-engine.js`, `data/states.json`, `data/makes-models.json`) — сбор всех комбинаций (штат, марка, модель, год, язык, интент, кластеры) для вин-сущностей и тематических страниц.
2. **PageData engines**  
   - VIN/DMV: `scripts/seo-content-engine.js` готовит структурированные поля (title, h1, summary, таблицы, FAQ, внутренние ссылки).  
   - KG/Guides: `scripts/seo-kg-engine.js` и `generate-knowledge-graph-pages.js` создают кластерные страницы и перелинковку.
3. **HTML rendering** (`scripts/seo-template.js`) — единый шаблон EN/ES с разными layout-вариантами, JSON-LD, CTA и качественными метриками.
4. **Write to /public/static-pages**  
   - Основной генератор: `generate-massive-seo-articles.js` (батчи + concurrency, lang-policy, кэш).  
   - Легаси генераторы: `generate-10000-seo-articles.js`, `generate-7000-seo-articles.js`, `generate-5000-new-articles.js`, `generate-pagination.js`.  
   - KG слой: `generate-knowledge-graph-pages.js`.
5. **Sitemap engine** (`scripts/seo-sitemap-batcher.js`, `scripts/build-sitemap-only.js`) — двуязычные sitemap части + индекс, управление скоростью раскрытия через RL-политику.
6. **Deployment** — Vercel берет `public/static-pages` + sitemap-файлы (команда `npm run vercel-build` = `build-seo-full-5`).
7. **Дополнительные слои**  
   - RL: `scripts/rl/*.js` вычисляют reward по behavior/GSC и обновляют политики языка/ссылок/sitemap.  
   - Autonomy: `scripts/autonomy/run-daily-cycle.js` запускает build→sitemap→RL→dashboard.  
   - Dashboard: `scripts/dashboard/build-dashboard-data.js` + `public/internal/seo-autonomy-9d3f7c.html`.

## 3. Core vs Extensions

| Layer | Содержимое |
| --- | --- |
| **CORE** | build-сборка, генерация сущностей и контента, шаблоны EN/ES, вывод в `public/static-pages`, sitemap-машина, базовые метрики. Без них генерация невозможна. |
| **EXTENSIONS** | Усилители: RL (GSC/behavior), Knowledge Graph, автономия, dashboard, будущее AI-контента. Их можно отключить, ядро продолжит жить. |

## 4. Фактические файлы

### CORE

- `scripts/build-seo-full-5.js` — главный оркестратор Build 5.0: вызывает `build-seo-pages`, quality-engine, graph-engine, sitemap inspector и (опционально) RL-training.
- `scripts/build-seo-pages.js` — очищает `public/static-pages`, гоняет legacy-генераторы, `generate-massive-seo-articles.js`, `generate-knowledge-graph-pages.js`, собирает HTML и передаёт список в sitemap-batcher.
- `generate-massive-seo-articles.js` — основной EN/ES-генератор (батчи, concurrency, lang-policy, caching, quality метрики, запись в `public/static-pages` + `data/metrics/massive-gen-quality.json`).
- `generate-10000-seo-articles.js`, `generate-7000-seo-articles.js`, `generate-5000-new-articles.js`, `generate-pagination.js` — legacy генераторы, которые всё ещё вызываются build-сборкой и синхронизируются в `public/static-pages`.
- `generate-knowledge-graph-pages.js` + `scripts/seo-kg-engine.js` + `scripts/seo-kg-template.js` — Knowledge Graph слой (guides/fraud/DMV кластерные страницы, hreflang, внутренние ссылки).
- `scripts/seo-content-engine.js` — seed + PageData фабрика: 50 штатов, makes/модели, 1990–2025, EN/ES copy, таблицы, FAQ, интенты.
- `scripts/seo-template.js` — общий HTML renderer (SEO блоки, CTA, structured data, EN/ES).
- `scripts/seo-lang-policy.js` — читает `data/rl/lang-policy.json`, возвращает веса EN/ES для генератора; с fallback 70/30.
- `scripts/seo-cache.js` — файловый кэш для тяжёлых вычислений в генераторе (используется через `withCache`).
- `scripts/seo-sitemap-batcher.js` — создаёт `sitemap-en-*.xml`, `sitemap-es-*.xml`, индексы и `sitemap-seo.xml`, учитывает RL-политику скорости (`data/rl/sitemap-policy.json`), прогрев по `SEO_LAUNCH_DATE`.
- `scripts/build-sitemap-only.js` — повторный прогон sitemap на готовых HTML (используется автопилотом).
- `scripts/seo-metrics.js` — агрегирует `data/metrics/massive-gen-quality.json` → `data/metrics/quality-dashboard.json`.
- `public/seo.css` — основной CSS для всех SEO-страниц.

### EXTENSIONS

- **Reinforcement Learning** (`scripts/rl/*.js`):  
  - `reward-model.js` (behavior log + GSC CSV → url-rewards),  
  - `policy-updater.js` (A/B weights, link boost, sitemap policy, lang policy),  
  - `rl-train-and-apply.js`,  
  - `extract-gsc-from-zip.js`, `prepare-gsc-csv.js`, `fetch-gsc-api.js`,  
  - `policy-engine.js` (регулирует lang/cluster policy),  
  - `auto-gsc-train.js` (обновляет политики, версии, timestamps).  
  Статус: **Partial** — скрипты есть, требуют данных и ручного запуска/автопилота.
- **Autonomy layer**: `scripts/autonomy/run-daily-cycle.js`, `scripts/utils/autonomy-logger.js`, `config/autonomy-config.json`, `data/autonomy-log.jsonl`, `scripts/dashboard/build-dashboard-data.js`, `public/internal/seo-autonomy-9d3f7c.html`.
- **Knowledge Graph**: реализован (см. выше), генерирует отдельные кластерные страницы и перелинковку.
- **AI content**: специализированных модулей нет — статус **Planned**.
- **Lang policy config**: `config/lang-policy.json`, `config/cluster-policy.json` (обновляются RL/автопилотом).

### Отсутствующие / Planned

- `scripts/sync-articles-to-static-pages.js` — **Planned** (упоминание осталось только в логах, файла в репо нет; синхронизация сейчас происходит напрямую при записи HTML).
- `scripts/ai/*` — **Planned** (нет LLM-генераторов; документация отмечает как будущую интеграцию).
- Любые KG router/api файлы, кроме перечисленных, отсутствуют.


