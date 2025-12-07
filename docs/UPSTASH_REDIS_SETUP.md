# 🔧 НАСТРОЙКА UPSTASH REDIS ДЛЯ СТАТУСА ПАРТИЙ

## 📋 ЧТО НУЖНО СДЕЛАТЬ

### ШАГ 1: Установить пакет (уже сделано)
```bash
npm install @upstash/redis
```

### ШАГ 2: Установить Upstash из Vercel Marketplace

1. **Откройте Vercel Marketplace:**
   - https://vercel.com/marketplace/upstash

2. **Нажмите "Install" на "Upstash for Redis"**

3. **Войдите или зарегистрируйтесь в Upstash:**
   - Если у вас нет аккаунта, создайте его (бесплатно)

4. **Выберите проект:**
   - Выберите `vintrusted` из списка проектов

5. **Создайте или выберите базу данных:**
   - Если у вас нет базы данных, создайте новую
   - Назовите: `batch-status-redis` (или любое другое имя)
   - Выберите регион (ближайший к вам)
   - Выберите план (Free tier достаточно)

6. **Подключите к проекту:**
   - Upstash автоматически создаст переменные окружения:
     - `UPSTASH_REDIS_REST_URL`
     - `UPSTASH_REDIS_REST_TOKEN`

### ШАГ 3: Проверьте переменные окружения

1. **Откройте Environment Variables:**
   - https://vercel.com/dimas-projects-edf037c0/vintrusted/settings/environment-variables

2. **Проверьте наличие:**
   - `UPSTASH_REDIS_REST_URL` ✅
   - `UPSTASH_REDIS_REST_TOKEN` ✅

   Эти переменные создаются автоматически при установке Upstash.

### ШАГ 4: Деплой

После установки Upstash:
1. Сделайте redeploy проекта
2. Или просто подождите автоматического деплоя

---

## ✅ ПРОВЕРКА

После деплоя:

1. **Запустите партию** через дашборд
2. **Проверьте статус:**
   ```bash
   curl https://vintrusted.com/api/batch-status
   ```
3. **Статус должен обновляться** в реальном времени

---

## 🔍 КАК ЭТО РАБОТАЕТ

1. **GitHub Actions** отправляет статус через POST на `/api/batch-status`
2. **API сохраняет** статус в Upstash Redis
3. **Дашборд читает** статус через GET из `/api/batch-status`
4. **Redis хранит** статус постоянно (не очищается между вызовами)

---

## 💰 СТОИМОСТЬ

Upstash Redis имеет бесплатный план:
- **Free tier:** 10K commands/day, 256 MB storage

Этого более чем достаточно для статуса партий.

---

## 🔗 ССЫЛКИ

- **Vercel Marketplace:** https://vercel.com/marketplace/upstash
- **Upstash Dashboard:** https://console.upstash.com/
- **Документация:** https://docs.upstash.com/redis

---

**Готово!** После установки Upstash все будет работать автоматически! 🎉
