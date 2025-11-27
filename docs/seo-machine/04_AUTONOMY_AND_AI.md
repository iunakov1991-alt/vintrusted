# Autonomy & AI Layer

## 1. Цель автономии

Свести участие человека к минимуму: машина сама генерирует новые страницы, дозирует раскрытие sitemap, анализирует данные (GSC/GA, behavior logs), предлагает правки или правит автоматически. От человека требуется лишь смотреть дашборд и иногда подтверждать крупные действия.

## 2. Текущий статус (по коду репозитория)

| Направление | Что есть | Статус |
| --- | --- | --- |
| **Автопилот** | `scripts/autonomy/run-daily-cycle.js`, `config/autonomy-config.json`, `scripts/utils/autonomy-logger.js`, `data/autonomy-log.jsonl`. Цикл решает, запускать ли билд (`npm run build:seo`), далее `build-sitemap-only`, затем RL-пайплайн и пересборка дашборда. | PARTIAL (зависит от расписания, но код готов). |
| **Dashboard** | `scripts/dashboard/build-dashboard-data.js` + `public/internal/seo-autonomy-9d3f7c.html`. Собирает `seo-stats`, `autonomy-state`, `lang-policy`, `cluster-policy`, агрегированные GSC метрики, лог ошибок, cursor tasks. | IMPLEMENTED (ручное открытие `internal` HTML). |
| **Lang policy runtime** | `scripts/seo-lang-policy.js` (генерация) + `scripts/autonomy/lang-policy-runtime.js` (для других генераторов, если нужно). | IMPLEMENTED. |
| **RL** | `scripts/rl/*.js` (reward-model, policy-updater, rl-train-and-apply, auto-gsc-train, policy-engine, extract/prepare/fetch). Интеграция в build: `build-seo-full-5.js` запускает `rl-train-and-apply` при наличии данных или если `SEO_ENABLE_RL=true`. | PARTIAL (процесс есть, нужен стабильный фид данных). |
| **GSC / GA интеграция** | ZIP pipeline (`extract-gsc-from-zip`, `prepare-gsc-csv`), API stub (`fetch-gsc-api.js`), конфиги `config/dashboard-config.json`. GA-сниппеты подставляются через `scripts/seo-analytics.js`. | PARTIAL (для GSC API нужны секреты). |
| **AI контент** | В коде нет модулей `scripts/ai/*` и обращений к LLM API. | PLANNED. |

## 3. План интеграции AI-контента (TODO)

1. **LLM wrapper**  
   - Создать `scripts/ai/content-worker.js` (или аналог) с заполнителями API-ключей.  
   - На вход: `{lang, state, make, year, intent, targetWords}`.  
   - На выход: структурированный JSON (summary, sections, FAQ, bullet-пойнты, таблицы).
2. **Batch orchestrator**  
   - Worker читает список задач из `data/ai-queue.jsonl`, работает батчами (например, 20 запросов).  
   - Добавить кэш `data/ai-cache/*.json` + TTL.
3. **Интеграция с генератором**  
   - В `generate-massive-seo-articles.js` добавить опцию `USE_AI_CONTENT=1`, при которой текстовые блоки подтягиваются из кэша/worker, но структура (CTA, таблицы, внутренние ссылки) остаётся прежней.  
   - Контроль длины и фактов: проверки word-count (600–1200 EN, 650–1300 ES), наличие минимум 3 factual blocks и 3 FAQ.
4. **Валидатор**  
   - `scripts/seo-text-quality.js` уже умеет считать слова. Добавить флаги, если AI-блоки выходят за диапазон или содержат повторяющиеся шаблоны.
5. **Monitoring**  
   - В dashboard новый раздел “AI Output” (кол-во AI-страниц, avg word count, флаги).  
   - Автотаски для Cursor, если AI-контент вышел за рамки.

## 4. RL / GSC-цикл (как реализовано сейчас)

1. **Источник данных**
   - ZIP: положить файл из GSC в `data/gsc/raw/` и запустить `npm run rl:auto`. `scripts/rl/extract-gsc-from-zip.js` ищет последнюю ZIP, извлекает Pages.csv/Страницы.csv → `data/gsc/gsc-raw.csv`, затем `scripts/rl/prepare-gsc-csv.js` приводит к `data/gsc/gsc-latest.csv`.
   - API: задать `USE_GSC_API=1`, `GSC_CLIENT_EMAIL`, `GSC_PRIVATE_KEY`, `GSC_PROPERTY_URL`. `auto-gsc-train.js` попытается вызвать `scripts/rl/fetch-gsc-api.js` (stub, нужно заполнить реальный запрос).
2. **Reward & Policy**
   - `npm run rl:train` → `scripts/rl/rl-train-and-apply.js`.  
   - `reward-model.js` объединяет behavior (`data/behavior-logs/behavior.log`) + GSC CSV, нормализует метрики, пишет `data/rl/url-rewards.json`.  
   - `policy-updater.js` создаёт/обновляет:  
     - `data/a-b-tests/policy.json` (распределение A/B шаблонов);  
     - `data/internal-link-graphs/boosted.json` (список URL для линк-буста);  
     - `data/rl/sitemap-policy.json` (target days, min/max sitemap per day);  
     - `data/rl/lang-policy.json` (EN/ES share).  
3. **Политики верхнего уровня**
   - `scripts/rl/policy-engine.js` читает агрегированные метрики (`data/gsc/processed/aggregated-metrics.json`) и корректирует `config/lang-policy.json`, `config/cluster-policy.json` (версионность + timestamp).
   - `config/lang-policy.json` → генератор (через `scripts/seo-lang-policy.js`).  
   - `config/cluster-policy.json` → можно использовать в KG/intent приоритезации (пока только обновляется).
4. **Автоматический запуск**
   - `npm run autonomy:daily` (или GitHub Actions `.github/workflows/autonomy-daily.yml`) вызывает `auto-gsc-train.js` и `policy-engine.js` после билда.  
   - Желаемая частота: ежедневно (cron 08:00 UTC) или после каждого крупного билда.

> Если данных GSC/behavior нет — пайплайн отрабатывает, но политики остаются на дефолте.


