# 🔑 НАСТРОЙКА GITHUB_TOKEN ДЛЯ ЗАПУСКА ПАРТИЙ

Для того чтобы партии запускались реально через дашборд, нужно настроить GitHub Personal Access Token.

---

## 📋 ШАГ 1: Создать GitHub Personal Access Token

1. **Перейдите на GitHub:**
   - Откройте: https://github.com/settings/tokens
   - Или: Settings → Developer settings → Personal access tokens → Tokens (classic)

2. **Создайте новый токен:**
   - Нажмите "Generate new token" → "Generate new token (classic)"
   - Название: `MONSTER 8.0 Batch Runner`
   - Срок действия: `No expiration` (или выберите нужный срок)
   - **Права (scopes):**
     - ✅ `repo` (Full control of private repositories)
     - ✅ `workflow` (Update GitHub Action workflows)

3. **Скопируйте токен:**
   - ⚠️ **ВАЖНО:** Токен показывается только один раз!
   - Сохраните его в безопасном месте

---

## 📋 ШАГ 2: Добавить токен в Vercel Environment Variables

1. **Откройте Vercel Dashboard:**
   - Ссылка: https://vercel.com/dimas-projects-edf037c0/vintrusted/settings/environment-variables

2. **Добавьте переменную:**
   - **Key:** `GITHUB_TOKEN`
   - **Value:** `ваш_github_token_здесь`
   - **Environment:** Production, Preview, Development (все три)

3. **Также добавьте (опционально):**
   - **Key:** `GITHUB_REPO`
   - **Value:** `iunakov1991-alt/vintrusted`
   - **Environment:** Production, Preview, Development

4. **Сохраните изменения**

---

## 📋 ШАГ 3: Проверить работу

1. **Откройте дашборд:**
   - https://vintrusted.com/dashboard

2. **Нажмите "🚀 Запустить партию"**

3. **Проверьте результат:**
   - Если токен настроен правильно, вы увидите:
     ```
     ✅ Партия запущена через GitHub Actions!
     ```
   - Если токен не настроен, вы увидите инструкции для локального запуска

4. **Проверьте GitHub Actions:**
   - Откройте: https://github.com/iunakov1991-alt/vintrusted/actions
   - Вы должны увидеть новый запуск workflow "MONSTER 8.0 Batch Scheduler"

---

## 🔍 УСТРАНЕНИЕ ПРОБЛЕМ

### Проблема: "Партия не может быть запущена автоматически"

**Решение:**
1. Проверьте, что `GITHUB_TOKEN` добавлен в Vercel Environment Variables
2. Проверьте, что токен имеет права `repo` и `workflow`
3. Проверьте, что токен не истек
4. Проверьте логи в Vercel Functions для деталей ошибки

### Проблема: "GitHub Actions запуск не удался"

**Решение:**
1. Проверьте, что workflow файл существует: `.github/workflows/monster8-batch-scheduler.yml`
2. Проверьте, что репозиторий правильный: `GITHUB_REPO` должен быть `iunakov1991-alt/vintrusted`
3. Проверьте, что ветка правильная (по умолчанию используется `main`)

### Проблема: Workflow запускается, но партия не выполняется

**Решение:**
1. Проверьте логи GitHub Actions: https://github.com/iunakov1991-alt/vintrusted/actions
2. Проверьте, что все секреты настроены в GitHub (DEEPSEEK_API_KEY, GROQ_API_KEY и т.д.)
3. Проверьте, что `monster8_orchestrator.sh` существует и исполняемый

---

## 🔒 БЕЗОПАСНОСТЬ

- ⚠️ **НЕ коммитьте токен в Git!**
- ⚠️ **НЕ делитесь токеном публично!**
- ✅ Используйте только в Vercel Environment Variables
- ✅ Регулярно обновляйте токен
- ✅ Используйте минимально необходимые права

---

## 📋 ПРОВЕРКА ТОКЕНА

Проверить, работает ли токен, можно через API:

```bash
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/user
```

Если токен валидный, вы получите информацию о пользователе.

---

**Готово!** Теперь партии будут запускаться реально через дашборд! 🚀
