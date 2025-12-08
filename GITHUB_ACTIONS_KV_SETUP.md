# 🔧 НАСТРОЙКА KV В GITHUB ACTIONS

## ✅ ЧТО СДЕЛАНО

Добавлены переменные окружения в `.github/workflows/monster8-batch-scheduler.yml`:
- `KV_REST_API_URL` (из GitHub Secrets)
- `KV_REST_API_TOKEN` (из GitHub Secrets)
- `UPSTASH_REDIS_REST_URL` (из GitHub Secrets)
- `UPSTASH_REDIS_REST_TOKEN` (из GitHub Secrets)

## 📋 ЧТО НУЖНО СДЕЛАТЬ

### Добавить секреты в GitHub:

1. **Откройте:** https://github.com/iunakov1991-alt/vintrusted/settings/secrets/actions

2. **Добавьте секреты:**
   - `KV_REST_API_URL` = значение из Vercel Environment Variables
   - `KV_REST_API_TOKEN` = значение из Vercel Environment Variables
   - Или:
   - `UPSTASH_REDIS_REST_URL` = значение из Vercel Environment Variables
   - `UPSTASH_REDIS_REST_TOKEN` = значение из Vercel Environment Variables

3. **Где взять значения:**
   - Откройте Vercel: https://vercel.com/dimas-projects-edf037c0/vintrusted/settings/environment-variables
   - Скопируйте значения `KV_REST_API_URL` и `KV_REST_API_TOKEN`

## ✅ ПОСЛЕ ДОБАВЛЕНИЯ

После добавления секретов:
1. Запустите новую партию через дашборд
2. Скрипт сможет обновлять KV во время выполнения
3. Статус будет обновляться в реальном времени

---

**Важно:** Без этих секретов скрипт не сможет обновлять KV, и статус останется в `queued`.
