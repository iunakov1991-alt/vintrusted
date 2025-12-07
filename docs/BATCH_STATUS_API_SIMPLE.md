# 🚀 ПРОСТОЕ РЕШЕНИЕ: API ДЛЯ ОБНОВЛЕНИЯ СТАТУСА ПАРТИИ

**Дата:** 2025-12-07  
**Статус:** ✅ **ГОТОВО** - Без коммитов файлов, просто API запрос

---

## ✅ ЧТО ИЗМЕНИЛОСЬ

Вместо коммита файлов в репозиторий, GitHub Actions теперь **отправляет статус напрямую на Vercel через API**.

**Преимущества:**
- ✅ Нет коммитов файлов
- ✅ Мгновенное обновление (без ожидания деплоя)
- ✅ Проще и надежнее
- ✅ Работает в реальном времени

---

## ⚙️ НАСТРОЙКА (1 РАЗ)

### ШАГ 1: Добавить токен в GitHub Secrets

**Ссылка:** https://github.com/iunakov1991-alt/vintrusted/settings/secrets/actions

1. Откройте ссылку выше
2. Нажмите **"New repository secret"**
3. Добавьте:
   - **Name:** `BATCH_STATUS_TOKEN`
   - **Secret:** придумайте любой секретный токен (например: `monster8-batch-status-2025`)
4. Нажмите **"Add secret"**

### ШАГ 2: Добавить тот же токен в Vercel

**Ссылка:** https://vercel.com/dimas-projects-edf037c0/vintrusted/settings/environment-variables

1. Откройте ссылку выше
2. Нажмите **"Add New"**
3. Добавьте:
   - **Key:** `BATCH_STATUS_TOKEN`
   - **Value:** тот же токен, что в GitHub Secrets
   - **Environment:** Production (или All)
4. Нажмите **"Save"**

### ШАГ 3: (Опционально) Установить VERCEL_URL

**Ссылка:** https://github.com/iunakov1991-alt/vintrusted/settings/variables/actions

1. Откройте ссылку выше
2. Нажмите **"New repository variable"**
3. Добавьте:
   - **Name:** `VERCEL_URL`
   - **Value:** `https://vintrusted.com`
4. Нажмите **"Create variable"**

---

## 🎯 КАК ЭТО РАБОТАЕТ

1. **GitHub Actions запускает партию**
   - Создается `tmp/batch-status.json` локально в runner

2. **После завершения (или ошибки)**
   - Workflow отправляет POST запрос на `https://vintrusted.com/api/batch-status`
   - С токеном авторизации в заголовке

3. **Vercel API сохраняет статус**
   - Сохраняет в файл `tmp/batch-status.json` на Vercel
   - Мгновенно доступен для дашборда

4. **Дашборд читает статус**
   - API `/api/status` читает из того же файла
   - Прогресс отображается в реальном времени

---

## 📊 ПРОВЕРКА

### 1. Проверьте API endpoint:

**Ссылка:** https://vintrusted.com/api/batch-status

- Должен вернуть текущий статус (GET запрос)
- Или ошибку авторизации (POST без токена)

### 2. Проверьте workflow:

**Ссылка:** https://github.com/iunakov1991-alt/vintrusted/actions/workflows/monster8-batch-scheduler.yml

1. Запустите workflow вручную
2. Проверьте шаг **"Update batch status via API"**
3. Должно быть: `✅ Status updated successfully via API`

### 3. Проверьте дашборд:

**Ссылка:** https://vintrusted.com/dashboard

- Секция **"⚙️ Прогресс партии"** должна обновляться
- Без задержек на деплой

---

## 🔧 УСТРАНЕНИЕ ПРОБЛЕМ

### Проблема: "API update failed (HTTP 401)"

**Решение:**
- Проверьте, что `BATCH_STATUS_TOKEN` одинаковый в GitHub Secrets и Vercel
- Проверьте, что токен передается в заголовке: `Authorization: Bearer YOUR_TOKEN`

### Проблема: "BATCH_STATUS_TOKEN not set"

**Решение:**
- Добавьте `BATCH_STATUS_TOKEN` в GitHub Secrets
- Перезапустите workflow

### Проблема: "API update failed (HTTP 404)"

**Решение:**
- Проверьте, что `VERCEL_URL` правильный
- Проверьте, что endpoint задеплоен: `https://vintrusted.com/api/batch-status`

---

## ✅ ЧЕКЛИСТ

- [ ] `BATCH_STATUS_TOKEN` добавлен в GitHub Secrets
- [ ] `BATCH_STATUS_TOKEN` добавлен в Vercel Environment Variables
- [ ] `VERCEL_URL` добавлен в GitHub Variables (опционально)
- [ ] API endpoint работает: https://vintrusted.com/api/batch-status
- [ ] Workflow успешно отправляет статус
- [ ] Дашборд показывает прогресс

---

## 🔗 ССЫЛКИ

- **GitHub Secrets:** https://github.com/iunakov1991-alt/vintrusted/settings/secrets/actions
- **Vercel Environment Variables:** https://vercel.com/dimas-projects-edf037c0/vintrusted/settings/environment-variables
- **GitHub Variables:** https://github.com/iunakov1991-alt/vintrusted/settings/variables/actions
- **API endpoint:** https://vintrusted.com/api/batch-status
- **Dashboard:** https://vintrusted.com/dashboard

---

**Статус:** ✅ Готово к использованию  
**Последнее обновление:** 2025-12-07
