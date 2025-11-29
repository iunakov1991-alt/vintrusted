# Деплой через Vercel CLI (самый надёжный способ)

## Шаг 1: Вход в аккаунт

```bash
vercel login
```

Откроется браузер, войди в свой Vercel аккаунт.

## Шаг 2: Привязка проекта

```bash
cd /Users/dmitrii/Desktop/website
vercel link
```

Выбери:
- **Existing project**
- Найди проект "vintrusted"
- Или создай новый проект

## Шаг 3: Деплой на production

```bash
vercel --prod --force
```

Это задеплоит текущий коммит напрямую на production, обходя все проблемы с настройками Git в Dashboard.

## Преимущества

- ✅ Не зависит от настроек Git в Dashboard
- ✅ Использует текущий коммит из локального репозитория
- ✅ Быстро и надёжно
- ✅ Сразу видно результат в терминале

## После деплоя

Проверь Build Logs в Vercel Dashboard:
- Должен быть коммит `d1d0af9` (или последний)
- Должен быть `npm run vercel-build`
- Должны быть логи `[SEO BUILD 5.0] ...`
