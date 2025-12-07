# 🔧 НАСТРОЙКА VERCEL KV ДЛЯ СТАТУСА ПАРТИЙ

## 📋 ЧТО НУЖНО СДЕЛАТЬ

### ШАГ 1: Установить пакет (уже сделано)
```bash
npm install @vercel/kv
```

### ШАГ 2: Создать Vercel KV в Dashboard

1. **Откройте Vercel Dashboard:**
   - https://vercel.com/dimas-projects-edf037c0/vintrusted

2. **Перейдите в Storage:**
   - Нажмите на вкладку **"Storage"** в меню проекта
   - Или откройте: https://vercel.com/dimas-projects-edf037c0/vintrusted/storage

3. **Создайте KV Database:**
   - Нажмите **"Create Database"**
   - Выберите **"KV"** (Key-Value)
   - Назовите: `batch-status-kv` (или любое другое имя)
   - Выберите регион (ближайший к вам)
   - Нажмите **"Create"**

4. **Подключите к проекту:**
   - После создания KV автоматически подключится к проекту
   - Vercel автоматически создаст переменные окружения:
     - `KV_REST_API_URL`
     - `KV_REST_API_TOKEN`
     - `KV_REST_API_READ_ONLY_TOKEN`

### ШАГ 3: Проверьте переменные окружения

1. **Откройте Environment Variables:**
   - https://vercel.com/dimas-projects-edf037c0/vintrusted/settings/environment-variables

2. **Проверьте наличие:**
   - `KV_REST_API_URL` ✅
   - `KV_REST_API_TOKEN` ✅
   - `KV_REST_API_READ_ONLY_TOKEN` ✅

   Эти переменные создаются автоматически при создании KV.

### ШАГ 4: Деплой

После создания KV:
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
2. **API сохраняет** статус в Vercel KV (Redis)
3. **Дашборд читает** статус через GET из `/api/batch-status`
4. **KV хранит** статус постоянно (не очищается между вызовами)

---

## 💰 СТОИМОСТЬ

Vercel KV имеет бесплатный план:
- **Free tier:** 256 MB storage, 30K reads/day, 30K writes/day

Этого более чем достаточно для статуса партий.

---

**Готово!** После создания KV все будет работать автоматически! 🎉
