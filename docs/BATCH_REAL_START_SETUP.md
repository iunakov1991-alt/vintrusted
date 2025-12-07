# 🚀 НАСТРОЙКА РЕАЛЬНОГО ЗАПУСКА ПАРТИЙ ЧЕРЕЗ ДАШБОРД

**Статус:** ✅ Реализовано  
**Дата:** 2025-12-07

---

## 📋 ЧТО ИЗМЕНИЛОСЬ

Теперь при нажатии кнопки **"🚀 Запустить партию"** в дашборде партия **реально запускается** через GitHub Actions API, а не просто показывает инструкции!

---

## 🔧 НАСТРОЙКА (1 РАЗ)

### ШАГ 1: Создать GitHub Personal Access Token

1. **Откройте:** https://github.com/settings/tokens
2. **Нажмите:** "Generate new token" → "Generate new token (classic)"
3. **Настройки:**
   - **Note:** `MONSTER 8.0 Batch Runner`
   - **Expiration:** `No expiration` (или выберите срок)
   - **Scopes:**
     - ✅ `repo` (Full control of private repositories)
     - ✅ `workflow` (Update GitHub Action workflows)
4. **Скопируйте токен** (показывается только один раз!)

---

### ШАГ 2: Добавить токен в Vercel

1. **Откройте:** https://vercel.com/dimas-projects-edf037c0/vintrusted/settings/environment-variables

2. **Добавьте переменную:**
   - **Key:** `GITHUB_TOKEN`
   - **Value:** ваш токен из Шага 1
   - **Environment:** ✅ Production, ✅ Preview, ✅ Development

3. **Опционально (если репозиторий отличается):**
   - **Key:** `GITHUB_REPO`
   - **Value:** `iunakov1991-alt/vintrusted`
   - **Environment:** ✅ Production, ✅ Preview, ✅ Development

4. **Сохраните изменения**

5. **Перезапустите деплоймент** (если нужно):
   - Vercel автоматически перезапустит функции при следующем деплое
   - Или нажмите "Redeploy" в Vercel Dashboard

---

## ✅ ПРОВЕРКА

### 1. Откройте дашборд:
https://vintrusted.com/dashboard

### 2. Нажмите "🚀 Запустить партию"

### 3. Проверьте результат:

**Если токен настроен правильно:**
- ✅ Увидите: "✅ Партия запущена через GitHub Actions!"
- ✅ Ссылка на GitHub Actions будет показана
- ✅ Партия реально запустится в GitHub Actions

**Если токен не настроен:**
- ⚠️ Увидите инструкции для локального запуска
- ⚠️ Партия не запустится автоматически

---

## 🔍 ПРОВЕРКА В GITHUB ACTIONS

1. **Откройте:** https://github.com/iunakov1991-alt/vintrusted/actions
2. **Проверьте:**
   - Должен появиться новый запуск workflow "MONSTER 8.0 Batch Scheduler"
   - Статус должен быть "🟡 In progress" или "✅ Completed"

---

## 📊 КАК ЭТО РАБОТАЕТ

1. **Пользователь нажимает "Запустить партию"** в дашборде
2. **Frontend отправляет POST запрос** на `/api/batch/start`
3. **Backend (api/dashboard.js):**
   - Генерирует превью партии
   - Определяет параметры (phase, length mode)
   - **Вызывает GitHub Actions API** для запуска workflow
4. **GitHub Actions запускает workflow** `monster8-batch-scheduler.yml`
5. **Workflow выполняет партию** через `monster8_orchestrator.sh`
6. **Прогресс отображается в дашборде** через `tmp/batch-status.json`

---

## ⚠️ ВАЖНЫЕ ЗАМЕЧАНИЯ

### 1. Токен должен иметь правильные права:
- ✅ `repo` - для доступа к репозиторию
- ✅ `workflow` - для запуска workflows

### 2. Репозиторий должен быть правильным:
- По умолчанию: `iunakov1991-alt/vintrusted`
- Если отличается, установите `GITHUB_REPO` в Vercel

### 3. Workflow должен существовать:
- Файл: `.github/workflows/monster8-batch-scheduler.yml`
- Должен иметь `workflow_dispatch` trigger

### 4. Ветка должна быть правильной:
- По умолчанию используется `main`
- Если у вас `master`, нужно изменить код

---

## 🔧 УСТРАНЕНИЕ ПРОБЛЕМ

### Проблема: "Партия не может быть запущена автоматически"

**Причины:**
1. `GITHUB_TOKEN` не установлен в Vercel
2. Токен не имеет правильных прав
3. Токен истек

**Решение:**
1. Проверьте Vercel Environment Variables
2. Проверьте права токена (должны быть `repo` и `workflow`)
3. Создайте новый токен, если истек

### Проблема: "GitHub Actions запуск не удался"

**Причины:**
1. Неправильный репозиторий
2. Workflow не существует
3. Неправильная ветка

**Решение:**
1. Проверьте `GITHUB_REPO` в Vercel
2. Проверьте, что файл `.github/workflows/monster8-batch-scheduler.yml` существует
3. Проверьте логи в Vercel Functions

### Проблема: Workflow запускается, но партия не выполняется

**Причины:**
1. Не настроены секреты в GitHub (DEEPSEEK_API_KEY и т.д.)
2. Ошибка в workflow

**Решение:**
1. Проверьте GitHub Secrets: https://github.com/iunakov1991-alt/vintrusted/settings/secrets/actions
2. Проверьте логи workflow: https://github.com/iunakov1991-alt/vintrusted/actions

---

## 📋 ЧЕКЛИСТ

- [ ] Создан GitHub Personal Access Token
- [ ] Токен имеет права `repo` и `workflow`
- [ ] `GITHUB_TOKEN` добавлен в Vercel Environment Variables
- [ ] `GITHUB_REPO` добавлен (если репозиторий отличается)
- [ ] Протестирован запуск через дашборд
- [ ] Проверено, что workflow запускается в GitHub Actions
- [ ] Проверено, что прогресс отображается в дашборде

---

## 🔗 ССЫЛКИ

- **GitHub Tokens:** https://github.com/settings/tokens
- **Vercel Environment Variables:** https://vercel.com/dimas-projects-edf037c0/vintrusted/settings/environment-variables
- **GitHub Actions:** https://github.com/iunakov1991-alt/vintrusted/actions
- **Дашборд:** https://vintrusted.com/dashboard
- **Подробная инструкция:** `docs/GITHUB_TOKEN_SETUP.md`

---

**Готово!** Теперь партии запускаются реально через дашборд! 🎉
