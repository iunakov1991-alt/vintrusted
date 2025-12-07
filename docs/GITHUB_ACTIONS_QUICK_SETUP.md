# 🚀 БЫСТРАЯ НАСТРОЙКА GITHUB ACTIONS ДЛЯ АВТОЗАПУСКА ПАРТИЙ

**Время настройки:** 5 минут  
**Статус:** ✅ Workflow уже создан, нужно только добавить Secrets

---

## 📋 ЧТО НУЖНО СДЕЛАТЬ

### ШАГ 0: Настроить GITHUB_TOKEN для запуска через дашборд (НОВОЕ!)

**Для запуска партий через дашборд нужно настроить GitHub Personal Access Token.**

📖 **Подробная инструкция:** `docs/GITHUB_TOKEN_SETUP.md`

**Кратко:**
1. Создайте GitHub Personal Access Token с правами `repo` и `workflow`
2. Добавьте в Vercel Environment Variables:
   - **Key:** `GITHUB_TOKEN`
   - **Value:** ваш токен
3. Готово! Теперь партии будут запускаться реально через дашборд

---

### ШАГ 1: Добавить API ключи в GitHub Secrets

#### 🔗 Ссылка:
**https://github.com/iunakov1991-alt/vintrusted/settings/secrets/actions**

(Замените `iunakov1991-alt/vintrusted` на ваш репозиторий, если отличается)

#### 📝 Инструкция:

1. **Откройте ссылку выше** (или перейдите: **Settings → Secrets and variables → Actions → Secrets**)

2. **Нажмите "New repository secret"**

3. **Добавьте следующие Secrets:**

   | Имя Secret | Значение | Обязательно? | Где взять? |
   |------------|----------|-------------|------------|
   | `DEEPSEEK_API_KEY` | Ваш API ключ DeepSeek | ✅ **ДА** | https://platform.deepseek.com/api_keys |
   | `GROQ_API_KEY` | Ваш API ключ Groq | ⚠️ Рекомендуется | https://console.groq.com/keys |
   | `VERCEL_DEPLOY_HOOK` | Webhook URL для деплоя | ❌ Опционально | Vercel → Project → Settings → Git → Deploy Hooks |

4. **Для каждого Secret:**
   - Введите **Name** (например: `DEEPSEEK_API_KEY`)
   - Введите **Secret** (ваш ключ)
   - Нажмите **"Add secret"**

---

### ШАГ 2: Проверить, что Workflow активен

#### 🔗 Ссылка:
**https://github.com/iunakov1991-alt/vintrusted/actions/workflows/monster8-batch-scheduler.yml**

#### 📝 Инструкция:

1. **Откройте ссылку выше** (или перейдите: **Actions → MONSTER 8.0 Batch Scheduler**)

2. **Проверьте, что workflow виден** (должен быть в списке workflows)

3. **Нажмите "Run workflow"** для тестового запуска:
   - Выберите branch: `main`
   - Оставьте параметры по умолчанию (`auto`)
   - Нажмите **"Run workflow"**

4. **Дождитесь завершения** (может занять 10-30 минут)

---

### ШАГ 3: Проверить расписание

#### 🔗 Ссылка:
**https://github.com/iunakov1991-alt/vintrusted/blob/main/.github/workflows/monster8-batch-scheduler.yml**

#### 📝 Инструкция:

1. **Откройте ссылку выше** (или файл `.github/workflows/monster8-batch-scheduler.yml`)

2. **Проверьте расписание** (строки 6-12):
   ```yaml
   schedule:
     - cron: "0 9 * * *"   # 09:00 UTC (11:00 MSK)
     - cron: "0 15 * * *"  # 15:00 UTC (18:00 MSK)
     - cron: "0 21 * * *"  # 21:00 UTC (00:00 MSK)
   ```

3. **Если нужно изменить расписание:**
   - Отредактируйте файл
   - Закоммитьте изменения
   - GitHub автоматически обновит расписание

---

## ✅ ЧЕКЛИСТ НАСТРОЙКИ

- [ ] Добавлен `DEEPSEEK_API_KEY` в Secrets
- [ ] Добавлен `GROQ_API_KEY` в Secrets (рекомендуется)
- [ ] Добавлен `VERCEL_DEPLOY_HOOK` в Secrets (опционально, для автодеплоя)
- [ ] Протестирован ручной запуск через "Run workflow"
- [ ] Проверено расписание (3 раза в день)
- [ ] Проверен дашборд на отображение прогресса: **https://vintrusted.com/dashboard**

---

## 🔗 ВАЖНЫЕ ССЫЛКИ

### GitHub:
- **Secrets:** https://github.com/iunakov1991-alt/vintrusted/settings/secrets/actions
- **Workflow:** https://github.com/iunakov1991-alt/vintrusted/actions/workflows/monster8-batch-scheduler.yml
- **Actions (все запуски):** https://github.com/iunakov1991-alt/vintrusted/actions

### Дашборд:
- **Dashboard:** https://vintrusted.com/dashboard
- **Прогресс партии:** https://vintrusted.com/dashboard (секция "⚙️ Прогресс партии")

### API Keys:
- **DeepSeek:** https://platform.deepseek.com/api_keys
- **Groq:** https://console.groq.com/keys
- **Vercel Deploy Hooks:** https://vercel.com/dimas-projects-edf037c0/vintrusted/settings/git (Settings → Git → Deploy Hooks)

---

## 📊 КАК ПРОВЕРИТЬ, ЧТО ВСЁ РАБОТАЕТ

### 1. Проверка Secrets:

1. Перейдите: **https://github.com/iunakov1991-alt/vintrusted/settings/secrets/actions**
2. Убедитесь, что видите:
   - ✅ `DEEPSEEK_API_KEY` (с иконкой закрытого глаза)
   - ✅ `GROQ_API_KEY` (если добавили)
   - ✅ `VERCEL_DEPLOY_HOOK` (если добавили)

### 2. Тестовый запуск:

1. Перейдите: **https://github.com/iunakov1991-alt/vintrusted/actions/workflows/monster8-batch-scheduler.yml**
2. Нажмите **"Run workflow"**
3. Выберите branch: `main`
4. Нажмите **"Run workflow"**
5. Дождитесь завершения (зеленая галочка ✅)

### 3. Проверка логов:

1. Откройте запущенный workflow
2. Нажмите на job **"Run MONSTER 8.0 Batch"**
3. Проверьте шаги:
   - ✅ "Checkout repository" - успешно
   - ✅ "Setup Node.js" - успешно
   - ✅ "Install dependencies" - успешно
   - ✅ "Run MONSTER 8.0 Orchestrator" - успешно

### 4. Проверка дашборда:

1. Откройте: **https://vintrusted.com/dashboard**
2. Найдите секцию **"⚙️ Прогресс партии"**
3. Должен отображаться:
   - Статус: "🟢 Выполняется" или "✅ Завершена"
   - Прогресс-бар с процентами
   - Количество завершенных страниц

---

## ⚠️ ВОЗМОЖНЫЕ ПРОБЛЕМЫ

### Проблема: "DEEPSEEK_API_KEY not set"

**Решение:**
1. Перейдите: **https://github.com/iunakov1991-alt/vintrusted/settings/secrets/actions**
2. Убедитесь, что `DEEPSEEK_API_KEY` добавлен
3. Проверьте, что имя точно `DEEPSEEK_API_KEY` (без пробелов, с заглавными буквами)

### Проблема: Workflow не запускается по расписанию

**Решение:**
1. GitHub Actions может задержать первый запуск на несколько минут
2. Проверьте, что workflow включен: **https://github.com/iunakov1991-alt/vintrusted/actions/workflows/monster8-batch-scheduler.yml**
3. Нажмите на три точки (⋮) → "Enable workflow" (если видно "Disable workflow", значит уже включен)

### Проблема: Workflow падает с ошибкой

**Решение:**
1. Откройте failed workflow: **https://github.com/iunakov1991-alt/vintrusted/actions**
2. Нажмите на failed run
3. Откройте job **"Run MONSTER 8.0 Batch"**
4. Проверьте логи шага, где произошла ошибка
5. Скачайте артефакты (если есть) для детального анализа

---

## 📅 РАСПИСАНИЕ ЗАПУСКОВ

| UTC | EST | MSK | Описание |
|-----|-----|-----|----------|
| 09:00 | 02:00 | 11:00 | Утренняя партия |
| 15:00 | 08:00 | 18:00 | Дневная партия |
| 21:00 | 14:00 | 00:00 | Вечерняя партия |

**Примечание:** GitHub Actions использует UTC время. Первый автоматический запуск может произойти в течение часа после настройки.

---

## 🎯 СЛЕДУЮЩИЕ ШАГИ

После настройки:

1. ✅ **Дождитесь первого автоматического запуска** (в течение часа)
2. ✅ **Проверьте дашборд** - прогресс должен отображаться
3. ✅ **Проверьте логи** - убедитесь, что всё работает корректно
4. ✅ **Настройте уведомления** (опционально) - GitHub может отправлять email при ошибках

---

## 📞 НУЖНА ПОМОЩЬ?

- **Документация:** `docs/GITHUB_ACTIONS_BATCH_SETUP.md`
- **Workflow файл:** `.github/workflows/monster8-batch-scheduler.yml`
- **Логи:** https://github.com/iunakov1991-alt/vintrusted/actions

---

**Статус:** ✅ Готово к использованию  
**Последнее обновление:** 2025-12-07
