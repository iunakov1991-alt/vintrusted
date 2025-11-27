# SEO Machine Dashboard

## 1. Назначение

Секретный экран для владельца монстра. Находится по адресу `/internal/seo-autonomy-9d3f7c.html` (файл `public/internal/seo-autonomy-9d3f7c.html`). Открывается как статическая страница (без аутентификации, поэтому держим URL в секрете / отдаём через basic-auth на CDN). Страница:

- показывает состояние генерации (URL, sitemap, builds, язык, ошибки);
- подтягивает cursor tasks и подсказки;
- даёт одну кнопку “Run SEO Machine” (заглушка до подключения к автопилоту);
- даёт ссылки на документацию `/docs/seo-machine/*.md`.

## 2. Структура экрана

Фактическая реализация (HTML + чистый JS):

1. **System Status** (первый card в левой колонке)  
   - Использует `public/seo-stats.json` → `totalUrls`, `exposedUrls`, `allowedSitemaps/totalSitemaps`.  
   - Прогресс-бар показывает долю раскрытых URL.  
   - В верхней плашке отображается цветовой статус (loading/success/error) и логи загрузки.
2. **Autopilot**  
   - Блок “Автопилот” показывает `data/autonomy-state.json` (последние билды, timestamps).  
   - Ошибки тянутся из `data/autonomy-log.jsonl` → обрабатываются `scripts/dashboard/build-dashboard-data.js`.
3. **Language split**  
   - Карточка “Языковая доля” читает `config/lang-policy.json` (через dashboard-data) и показывает EN/ES проценты, синхронизированные с RL.  
4. **Traffic & CTR**  
   - Использует `data/gsc/processed/aggregated-metrics.json` (если есть) → `global.en.ctr`, `global.es.ctr`, список focus-кластеров из `config/cluster-policy.json`.  
5. **Errors & Cursor tasks**  
   - Ошибки: последние элементы из `autonomy-log` (level warn/error).  
   - Tasks: формирует `scripts/dashboard/build-dashboard-data.js` (bash-блоки для Cursor).
6. **Docs & Control (новый блок)**  
   - Содержит ссылки на `/docs/seo-machine/0X_*.md`.  
   - Кнопка “Run SEO Machine” (placeholder) → сейчас вызывает `alert`, но документ фиксирует, что в будущем должна триггерить endpoint/команду `npm run build:seo`.

Все данные сначала собирает `scripts/dashboard/build-dashboard-data.js` в `public/internal/dashboard-data.json`, затем тот же скрипт встраивает JSON внутрь HTML (`<script id="dashboard-data">...</script>`), чтобы дашборд работал и при открытии через `file://`.

## 3. Техническая интеграция

- **Файл**: `public/internal/seo-autonomy-9d3f7c.html`. Обычный HTML, без React/Next. Встроенный JS отвечает за: auto-refresh (30s), статус-индикатор, лог загрузки, парсинг embedded JSON, fallback на `fetch("/internal/dashboard-data.json")`.
- **Данные**: `scripts/dashboard/build-dashboard-data.js` (команда `npm run dashboard:build`) собирает всё в один JSON, создаёт список cursor tasks и обновляет embedded блок.
- **Route**: `/internal/seo-autonomy-9d3f7c.html` (можно пробросить через Vercel rewrites на `/internal/*`).
- **Secret**: сейчас — только «security through obscurity». Для более надёжной защиты добавить basic-auth на CDN или проверку токена (например, `?token=...`, проверяемый в JS до рендера). В манифесте отмечено как TODO.
- **One button run**: HTML содержит кнопку `data-action="run-seo-machine"`. Пока она выводит предупреждение (“hook up to npm run build:seo”). После появления backend endpoint её нужно привязать к POST запросу, который запустит `npm run build:seo`/`npm run autonomy:daily`.


