# 🔍 ОТЛАДКА GITHUB_TOKEN

**Проблема:** API все еще возвращает fallback сообщение вместо запуска через GitHub Actions

---

## 🔍 ДИАГНОСТИКА

### 1. Проверьте, что токен доступен в Vercel

1. **Откройте:** https://vercel.com/dimas-projects-edf037c0/vintrusted/settings/environment-variables
2. **Проверьте:**
   - ✅ `GITHUB_TOKEN` существует
   - ✅ Доступен для Production, Preview, Development
   - ✅ Значение не пустое

### 2. Проверьте логи Vercel Functions

1. **Откройте:** https://vercel.com/dimas-projects-edf037c0/vintrusted/functions
2. **Найдите функцию:** `api/dashboard.js`
3. **Проверьте логи** на наличие:
   - `[Dashboard API] GitHub token exists: true/false`
   - `[Dashboard API] GitHub repo: ...`
   - `[Dashboard API] Workflow ID: ...`
   - Ошибки, если есть

### 3. Проверьте права токена

Токен должен иметь:
- ✅ `repo` (Full control of private repositories)
- ✅ `workflow` (Update GitHub Action workflows)

**Как проверить:**
1. Откройте: https://github.com/settings/tokens
2. Найдите ваш токен
3. Проверьте scopes

### 4. Проверьте репозиторий

**По умолчанию:** `iunakov1991-alt/vintrusted`

**Если отличается:**
1. Добавьте в Vercel Environment Variables:
   - **Key:** `GITHUB_REPO`
   - **Value:** `ваш_username/ваш_repo`

### 5. Проверьте workflow файл

**Файл должен существовать:**
`.github/workflows/monster8-batch-scheduler.yml`

**Проверьте:**
1. Файл существует в репозитории
2. Имеет `workflow_dispatch` trigger
3. Правильное имя файла (без опечаток)

---

## 🧪 ТЕСТИРОВАНИЕ ТОКЕНА

### Вариант 1: Через curl

```bash
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/user
```

**Ожидаемый результат:**
```json
{
  "login": "ваш_username",
  ...
}
```

### Вариант 2: Проверка прав на workflow

```bash
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/repos/iunakov1991-alt/vintrusted/actions/workflows
```

**Ожидаемый результат:**
Список workflows, включая `monster8-batch-scheduler.yml`

---

## 🔧 ВОЗМОЖНЫЕ ПРОБЛЕМЫ И РЕШЕНИЯ

### Проблема: "GitHub token exists: false"

**Причины:**
1. Токен не установлен в Vercel
2. Токен установлен только для одного окружения
3. Нужен redeploy после добавления переменной

**Решение:**
1. Проверьте Vercel Environment Variables
2. Убедитесь, что токен доступен для всех окружений
3. Сделайте redeploy: https://vercel.com/dimas-projects-edf037c0/vintrusted/deployments

### Проблема: "GitHub API вернул статус 401"

**Причины:**
1. Токен неверный
2. Токен истек
3. Токен не имеет правильных прав

**Решение:**
1. Создайте новый токен
2. Убедитесь, что права `repo` и `workflow` включены
3. Обновите токен в Vercel

### Проблема: "GitHub API вернул статус 404"

**Причины:**
1. Неправильный репозиторий
2. Workflow файл не существует
3. Неправильное имя workflow

**Решение:**
1. Проверьте `GITHUB_REPO` в Vercel
2. Проверьте, что файл `.github/workflows/monster8-batch-scheduler.yml` существует
3. Проверьте имя файла (должно быть точно `monster8-batch-scheduler.yml`)

### Проблема: "GitHub API вернул статус 403"

**Причины:**
1. Токен не имеет права `workflow`
2. Workflow отключен в репозитории

**Решение:**
1. Проверьте права токена (должен быть `workflow`)
2. Проверьте, что workflow включен: https://github.com/iunakov1991-alt/vintrusted/actions/workflows/monster8-batch-scheduler.yml

---

## 📋 ЧЕКЛИСТ ОТЛАДКИ

- [ ] `GITHUB_TOKEN` существует в Vercel
- [ ] Токен доступен для всех окружений
- [ ] Токен имеет права `repo` и `workflow`
- [ ] `GITHUB_REPO` установлен (если репозиторий отличается)
- [ ] Workflow файл существует
- [ ] Workflow имеет `workflow_dispatch` trigger
- [ ] Проверены логи Vercel Functions
- [ ] Сделан redeploy после добавления переменной

---

## 🎯 СЛЕДУЮЩИЕ ШАГИ

1. **Проверьте логи** в Vercel Functions
2. **Проверьте права токена** в GitHub
3. **Проверьте workflow файл** в репозитории
4. **Сделайте redeploy** если нужно
5. **Протестируйте снова** через дашборд

---

**После исправления:** Партии должны запускаться реально через GitHub Actions! 🚀
