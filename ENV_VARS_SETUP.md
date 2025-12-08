# ✅ НАСТРОЙКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ

## 📋 ЧТО ДОБАВИТЬ В VERCEL

Добавьте в Vercel Environment Variables:

### Обязательные (для работы Redis):

1. **`KV_REST_API_URL`**
   - Значение: `https://positive-platypus-25780.upstash.io`
   - Доступность: ✅ Production, ✅ Preview, ✅ Development

2. **`KV_REST_API_TOKEN`**
   - Значение: `AWS0AAIncDI1MTIzNDUxMGYwOGY0MWI0YjkyN2E1YjEyMzIyOTdiMXAyMjU3ODA`
   - Доступность: ✅ Production, ✅ Preview, ✅ Development

### Опциональные (не обязательны для работы):

- `KV_REST_API_READ_ONLY_TOKEN` - только для чтения (не используется)
- `KV_URL` - для Redis протокола (не используется)
- `REDIS_URL` - для Redis протокола (не используется)

---

## 🔧 КАК ДОБАВИТЬ

1. **Откройте:**
   - https://vercel.com/dimas-projects-edf037c0/vintrusted/settings/environment-variables

2. **Нажмите "Add New":**
   - Key: `KV_REST_API_URL`
   - Value: `https://positive-platypus-25780.upstash.io`
   - Environments: ✅ Production, ✅ Preview, ✅ Development
   - Нажмите "Save"

3. **Нажмите "Add New" еще раз:**
   - Key: `KV_REST_API_TOKEN`
   - Value: `AWS0AAIncDI1MTIzNDUxMGYwOGY0MWI0YjkyN2E1YjEyMzIyOTdiMXAyMjU3ODA`
   - Environments: ✅ Production, ✅ Preview, ✅ Development
   - Нажмите "Save"

---

## ✅ ПРОВЕРКА

После добавления переменных:

1. **Сделайте REDEPLOY:**
   - https://vercel.com/dimas-projects-edf037c0/vintrusted/deployments
   - Нажмите "..." на последнем deployment → "Redeploy"

2. **Проверьте API:**
   ```bash
   curl https://vintrusted.com/api/batch-status
   ```
   Должен вернуть статус **БЕЗ** ошибки!

---

**После добавления переменных и redeploy всё заработает!** 🚀

