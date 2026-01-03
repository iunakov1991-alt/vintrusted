# CI Autonomy Light Mode

Цель: ежедневный безопасный прогон SEO-машины в GitHub Actions без зависаний и с гарантированным обновлением дашборда.

## Основные параметры

- Скрипт: `scripts/autonomy/run-daily-cycle-ci.js`
- Команда: `npm run autonomy:daily:ci`
- Лимиты:
  - `SEO_MAX_PAGES_PER_BUILD=10000`
  - `SEO_TARGET_PAGES=10000`
  - `AUTONOMY_HARD_TIMEOUT_MIN=40` (внутренний watchdog)
- RL/AI:
  - `AI_RL_ENABLED=false` в CI
  - `AI_MAX_TOKENS=400`
  - `AI_MAX_SECTIONS=3`

## Поведение

1. Быстрая генерация ограниченного количества страниц (`build:seo`).
2. Пересборка sitemap без повторной генерации контента (`build-sitemap-only`, если есть).
3. Пропуск тяжёлого RL/AI в CI.
4. Всегда пишет свежий snapshot в:
   - `public/internal/seo-autonomy-last.json`

## GitHub Actions

Workflow: `.github/workflows/autonomy-daily.yml`

- `timeout-minutes: 45`
- Ежедневный запуск по cron.
- Шаги:
  1. `npm ci`
  2. `npm run autonomy:daily:ci`
  3. `npm run dashboard:build`
  4. опциональный Vercel deploy hook
























