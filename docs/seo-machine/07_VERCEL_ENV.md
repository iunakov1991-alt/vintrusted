# Vercel Environment Variables

## Обзор

Все переменные окружения, добавленные в Vercel (Project Settings → Environment Variables → All Environments).

## ✅ Исправлено

**Было:** `GROK_API_KEY` (опечатка)  
**Исправлено на:** `GROQ_API_KEY`  
**Статус:** ✅ Исправлено и задеплоено (2025-11-27)

## AI Providers

| Переменная | Статус | Использование | Примечания |
| --- | --- | --- | --- |
| `DEEPSEEK_API_KEY` | ✅ Используется | `scripts/ai/deepseek-client.js`, `scripts/ai/seo-writer-deepseek.js` | Обязательно для AI генерации |
| `GROQ_API_KEY` | ✅ Используется | `ai/providers/groq.js`, `ai/generator-skeleton.js`, `ai/critic.js` | Для AI Engine 11/10 |
| `AI_PROVIDER_PRIMARY` | ⏳ Planned | Не используется | Планируется для выбора основного провайдера |
| `AI_PROVIDER_SECONDARY` | ⏳ Planned | Не используется | Планируется для fallback |

## SEO Configuration

| Переменная | Статус | Использование | Default |
| --- | --- | --- | --- |
| `SEO_BASE_URL` | ✅ Используется | `scripts/seo-template.js`, `scripts/seo-sitemap-batcher.js` | `https://vintrusted.com` |
| `SEO_LAUNCH_DATE` | ✅ Используется | `scripts/seo-sitemap-batcher.js` | `2025-12-10` |
| `SEO_URLS_PER_SITEMAP` | ✅ Используется | `scripts/seo-sitemap-batcher.js` | `30000` |
| `SEO_TARGET_FULL_EXPOSURE_DAYS` | ✅ Используется | `scripts/seo-sitemap-batcher.js` | `90` |
| `SEO_MIN_SITEMAPS_PER_DAY` | ✅ Используется | `scripts/seo-sitemap-batcher.js` | `1` |
| `SEO_MAX_SITEMAPS_PER_DAY` | ✅ Используется | `scripts/seo-sitemap-batcher.js` | `40` |
| `SEO_TARGET_PAGES` | ✅ Используется | `generate-massive-seo-articles.js` | `500000` |
| `SEO_MAX_PAGES_PER_BUILD` | ✅ Используется | `generate-massive-seo-articles.js` | `500000` |

## Reinforcement Learning (RL)

| Переменная | Статус | Использование | Default | Примечания |
| --- | --- | --- | --- | --- |
| `RL_ENABLED` | ⏳ Planned | Не используется | `true` | Включить/выключить RL обучение |
| `RL_MIN_IMPRESSIONS` | ⏳ Planned | Не используется | `10` | Минимум impressions для RL |
| `RL_MIN_CLICKS` | ⏳ Planned | Не используется | `1` | Минимум clicks для RL |
| `RL_REFRESH_DAYS` | ⏳ Planned | Не используется | `7` | Частота обновления политик |
| `RL_MAX_URLS_PER_CYCLE` | ⏳ Planned | Не используется | `10000` | Лимит URL за цикл |
| `RL_EXPLORATION_RATE` | ⏳ Planned | Не используется | `0.1` | Коэффициент исследования |

**Текущая реализация:** RL использует фиксированные значения в коде (`scripts/rl/reward-model.js`, `scripts/rl/policy-updater.js`). Переменные добавлены в Vercel для будущей интеграции.

## Language Policy

| Переменная | Статус | Использование | Default | Примечания |
| --- | --- | --- | --- | --- |
| `LANG_POLICY_ENABLED` | ⏳ Planned | Не используется | `true` | Включить/выключить языковую политику |
| `LANG_DEFAULT_SHARE_EN` | ⏳ Planned | Не используется | `0.7` | Доля EN по умолчанию |
| `LANG_DEFAULT_SHARE_ES` | ⏳ Planned | Не используется | `0.3` | Доля ES по умолчанию |
| `LANG_MIN_SHARE_PER_LANG` | ⏳ Planned | Не используется | `0.1` | Минимум для каждого языка |
| `LANG_MAX_SHARE_PER_LANG` | ⏳ Planned | Не используется | `0.9` | Максимум для каждого языка |
| `LANG_ADAPTATION_WINDOW_DAYS` | ⏳ Planned | Не используется | `30` | Окно адаптации |
| `LANG_TRAFFIC_THRESHOLD` | ⏳ Planned | Не используется | `100` | Минимум трафика |
| `LANG_CTR_DELTA_THRESHOLD` | ⏳ Planned | Не используется | `0.02` | Минимум разницы CTR |
| `LANG_SAFETY_CAP_EN` | ⏳ Planned | Не используется | `0.95` | Защитный лимит EN |
| `LANG_SAFETY_CAP_ES` | ⏳ Planned | Не используется | `0.95` | Защитный лимит ES |

**Текущая реализация:** Языковая политика управляется через `config/lang-policy.json` и `data/rl/lang-policy.json` (генерируется RL-циклом). Переменные добавлены в Vercel для будущей интеграции.

## План интеграции

### RL переменные

Интегрировать в:
- `scripts/rl/reward-model.js` — использовать `RL_MIN_IMPRESSIONS`, `RL_MIN_CLICKS`
- `scripts/rl/policy-updater.js` — использовать `RL_MAX_URLS_PER_CYCLE`, `RL_EXPLORATION_RATE`
- `scripts/rl/rl-train-and-apply.js` — проверять `RL_ENABLED`
- `scripts/autonomy/run-daily-cycle.js` — использовать `RL_REFRESH_DAYS`

### Language Policy переменные

Интегрировать в:
- `scripts/seo-lang-policy.js` — использовать `LANG_DEFAULT_SHARE_EN/ES`, `LANG_MIN/MAX_SHARE`
- `scripts/rl/policy-updater.js` — использовать `LANG_ADAPTATION_WINDOW_DAYS`, `LANG_TRAFFIC_THRESHOLD`, `LANG_CTR_DELTA_THRESHOLD`
- `scripts/autonomy/lang-policy-runtime.js` — использовать `LANG_SAFETY_CAP_EN/ES`

### AI Provider переменные

Интегрировать в:
- `scripts/ai/deepseek-client.js` — использовать `AI_PROVIDER_PRIMARY` для выбора провайдера
- `ai/providers/gemini.js` — использовать `AI_PROVIDER_SECONDARY` для fallback

## Проверка в Vercel

1. Открой: https://vercel.com/dashboard
2. Выбери проект `vintrusted`
3. Settings → Environment Variables
4. Проверь, что все переменные добавлены в "All Environments"
5. **Исправь опечатку:** `GROK_API_KEY` → `GROQ_API_KEY`

## Обновлено

- **2025-11-27:** Добавлена документация всех переменных из Vercel
- **2025-11-27:** Отмечена опечатка `GROK_API_KEY` → `GROQ_API_KEY`
- **2025-11-27:** Указан статус каждой переменной (используется / planned)

