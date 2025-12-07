# 📊 КАК ПРОВЕРИТЬ ЛОГИ VERCEL FUNCTIONS

**Проблема:** Ссылка на функции возвращает 404

---

## 🔍 АЛЬТЕРНАТИВНЫЕ СПОСОБЫ

### Вариант 1: Через Deployment Logs (рекомендуется)

1. **Откройте проект:**
   - https://vercel.com/dimas-projects-edf037c0/vintrusted

2. **Перейдите в раздел "Deployments"**

3. **Откройте последний deployment**

4. **Найдите вкладку "Runtime Logs"** или "Functions"

5. **Выберите функцию:** `api/dashboard.js`

6. **Проверьте логи** на наличие:
   - `[Dashboard API] GitHub token exists: true/false`
   - `[Dashboard API] GitHub repo: ...`
   - Ошибки, если есть

---

### Вариант 2: Через Vercel CLI (локально)

```bash
# Установите Vercel CLI (если еще не установлен)
npm i -g vercel

# Войдите в аккаунт
vercel login

# Просмотрите логи
vercel logs vintrusted --follow
```

---

### Вариант 3: Через API напрямую

Проверьте, что происходит при вызове API:

```bash
# Проверьте ответ API
curl -X POST "https://vintrusted.com/dashboard/api/batch/start" \
  -H "Content-Type: application/json" \
  -v 2>&1 | grep -i "github\|token\|error"
```

---

### Вариант 4: Через Vercel Dashboard → Project Settings

1. **Откройте:** https://vercel.com/dimas-projects-edf037c0/vintrusted/settings
2. **Найдите раздел "Functions"** или "Logs"
3. **Проверьте логи функций**

---

## 🔍 ЧТО ИСКАТЬ В ЛОГАХ

### Успешный запуск:

```
[Dashboard API] GitHub token exists: true
[Dashboard API] GitHub repo: iunakov1991-alt/vintrusted
[Dashboard API] Workflow ID: monster8-batch-scheduler.yml
[Dashboard API] GitHub API response status: 204
[Dashboard API] ✅ GitHub Actions workflow запущен успешно!
```

### Ошибка (токен не найден):

```
[Dashboard API] GitHub token exists: false
[Dashboard API] ⚠️ GITHUB_TOKEN не найден, используем fallback
```

### Ошибка (неправильные права):

```
[Dashboard API] GitHub API response status: 401
[Dashboard API] ❌ GitHub Actions error: 401 Unauthorized
```

### Ошибка (workflow не найден):

```
[Dashboard API] GitHub API response status: 404
[Dashboard API] ❌ GitHub Actions error: 404 Not Found
```

---

## 🧪 БЫСТРАЯ ПРОВЕРКА БЕЗ ЛОГОВ

### Проверка через API:

```bash
# Проверьте, что API возвращает
curl -X POST "https://vintrusted.com/dashboard/api/batch/start" \
  -H "Content-Type: application/json" | jq '.message'
```

**Если видите:**
- `"✅ Партия запущена через GitHub Actions!"` → ✅ Работает!
- `"Партия не может быть запущена автоматически"` → ❌ Проблема с токеном

### Проверка GitHub Actions:

1. **Откройте:** https://github.com/iunakov1991-alt/vintrusted/actions
2. **Проверьте, есть ли новый запуск** после нажатия кнопки
3. **Если есть** → API сработал, но вернул ошибку
4. **Если нет** → API вызов не дошел до GitHub

---

## 🔧 ДИАГНОСТИКА БЕЗ ЛОГОВ

### 1. Проверьте переменные окружения:

1. **Откройте:** https://vercel.com/dimas-projects-edf037c0/vintrusted/settings/environment-variables
2. **Проверьте:**
   - ✅ `GITHUB_TOKEN` существует
   - ✅ Доступен для Production, Preview, Development
   - ✅ Значение не пустое

### 2. Проверьте права токена:

1. **Откройте:** https://github.com/settings/tokens
2. **Найдите ваш токен**
3. **Проверьте scopes:**
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)

### 3. Сделайте redeploy:

1. **Откройте:** https://vercel.com/dimas-projects-edf037c0/vintrusted/deployments
2. **Найдите последний deployment**
3. **Нажмите "..." → "Redeploy"**
4. **Дождитесь завершения**
5. **Протестируйте снова**

---

## 📋 ЧЕКЛИСТ ДИАГНОСТИКИ

- [ ] Проверены логи через Deployment → Runtime Logs
- [ ] Проверены переменные окружения в Vercel
- [ ] Проверены права токена в GitHub
- [ ] Сделан redeploy после добавления переменной
- [ ] Проверен GitHub Actions на наличие нового запуска
- [ ] Протестирован API напрямую через curl

---

## 🎯 СЛЕДУЮЩИЕ ШАГИ

1. **Попробуйте доступ к логам** через Deployment → Runtime Logs
2. **Проверьте переменные** в Vercel Settings
3. **Сделайте redeploy** если нужно
4. **Протестируйте снова** через дашборд

---

**Если логи недоступны:** Используйте альтернативные способы диагностики выше! 🔍
