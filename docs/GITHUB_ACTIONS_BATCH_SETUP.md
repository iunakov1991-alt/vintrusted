# 🚀 НАСТРОЙКА GITHUB ACTIONS ДЛЯ АВТОМАТИЧЕСКОГО ЗАПУСКА ПАРТИЙ

**Дата:** 2025-12-07  
**Версия:** MONSTER 8.0  
**Статус:** ✅ Готово к использованию

---

## 📋 ОБЗОР

GitHub Actions workflow автоматически запускает партии MONSTER 8.0 по расписанию:
- **3 раза в день:** 09:00, 15:00, 21:00 UTC
- **Ручной запуск:** через GitHub UI в любое время
- **Автоматический деплой:** после успешной генерации (опционально)

---

## ⚙️ НАСТРОЙКА

### 1. GitHub Secrets (обязательно)

Перейдите в **Settings → Secrets and variables → Actions → Secrets** и добавьте:

#### Обязательные:
- `DEEPSEEK_API_KEY` - API ключ для DeepSeek (обязательно для AI генерации)
- `GROQ_API_KEY` - API ключ для Groq (опционально, но рекомендуется)

#### Опциональные:
- `VERCEL_DEPLOY_HOOK` - Webhook URL для автоматического деплоя на Vercel

### 2. GitHub Variables (опционально)

Перейдите в **Settings → Secrets and variables → Actions → Variables** и добавьте:

#### AI Configuration:
- `DEEPSEEK_MODEL` = `deepseek-chat` (по умолчанию)
- `DEEPSEEK_BASE_URL` = `https://api.deepseek.com/v1/chat/completions` (по умолчанию)
- `LLM_GEN_MODE` = `ensemble` (по умолчанию)
- `LLM_QA_MODE` = `deepseek` (по умолчанию)

#### Orchestrator Configuration:
- `EN_THRESHOLD_FOR_ES` = `100` (по умолчанию)
- `ES_HARD_MIN` = `50` (по умолчанию)
- `DEFAULT_DAY_WORKERS` = `10` (по умолчанию)
- `DEFAULT_NIGHT_WORKERS` = `6` (по умолчанию)
- `MONSTER8_BPG` = `0` (по умолчанию, отключен)
- `MONSTER8_LATENCY_HARD_MAX` = `4.0` (по умолчанию)

#### Deploy Configuration:
- `AUTO_DEPLOY` = `1` (по умолчанию, включен)
- `SEO_BASE_URL` = `https://vintrusted.com` (по умолчанию)

---

## 📅 РАСПИСАНИЕ

Workflow запускается автоматически:
- **09:00 UTC** (02:00 EST / 11:00 MSK) - Утренняя партия
- **15:00 UTC** (08:00 EST / 18:00 MSK) - Дневная партия
- **21:00 UTC** (14:00 EST / 00:00 MSK) - Вечерняя партия

### Изменение расписания

Отредактируйте `.github/workflows/monster8-batch-scheduler.yml`:

```yaml
schedule:
  - cron: "0 9 * * *"   # 09:00 UTC
  - cron: "0 15 * * *"  # 15:00 UTC
  - cron: "0 21 * * *"  # 21:00 UTC
```

Формат cron: `минута час день месяц день_недели`

Примеры:
- `"0 9 * * *"` - каждый день в 09:00 UTC
- `"0 */6 * * *"` - каждые 6 часов
- `"0 9 * * 1-5"` - только в будние дни в 09:00 UTC

---

## 🎮 РУЧНОЙ ЗАПУСК

### Через GitHub UI:

1. Перейдите в **Actions → MONSTER 8.0 Batch Scheduler**
2. Нажмите **Run workflow**
3. Выберите параметры (опционально):
   - **Force phase:** `auto` / `en_only` / `mixed` / `es_focus`
   - **Force length:** `auto` / `short` / `long`
4. Нажмите **Run workflow**

### Через GitHub CLI:

```bash
gh workflow run monster8-batch-scheduler.yml \
  -f force_phase=auto \
  -f force_length=auto
```

---

## 📊 МОНИТОРИНГ

### Просмотр логов:

1. Перейдите в **Actions → MONSTER 8.0 Batch Scheduler**
2. Выберите нужный запуск
3. Откройте **Run MONSTER 8.0 Batch** job
4. Просмотрите логи каждого шага

### Артефакты:

После каждого запуска доступны артефакты:
- **batch-logs-{run_id}** - логи оркестратора и статусы (хранятся 7 дней)
- **generated-pages-sample-{run_id}** - примеры сгенерированных страниц (хранятся 3 дня)

### Дашборд:

Прогресс партии отображается в дашборде:
- **URL:** `https://vintrusted.com/dashboard`
- **Секция:** "⚙️ Прогресс партии"
- **Обновление:** каждые 5 секунд

---

## 🔧 УСТРАНЕНИЕ ПРОБЛЕМ

### Партия не запускается:

1. **Проверьте Secrets:**
   - `DEEPSEEK_API_KEY` должен быть установлен
   - Проверьте в **Settings → Secrets and variables → Actions**

2. **Проверьте логи:**
   - Откройте **Actions → последний запуск → Run MONSTER 8.0 Batch**
   - Ищите ошибки в шаге "Run MONSTER 8.0 Orchestrator"

3. **Проверьте timeout:**
   - По умолчанию: 120 минут (2 часа)
   - Если партия слишком долгая, увеличьте `timeout-minutes` в workflow

### Партия завершается с ошибкой:

1. **Проверьте API ключи:**
   - DeepSeek API может быть недоступен
   - Проверьте лимиты API

2. **Проверьте latency:**
   - Если `MONSTER8_LATENCY_HARD_MAX` слишком низкий, оркестратор может прервать выполнение
   - Увеличьте значение в Variables

3. **Проверьте логи:**
   - Скачайте артефакт `batch-logs-{run_id}`
   - Изучите `logs/orchestrator.log`

### Прогресс не виден в дашборде:

1. **Проверьте файл статуса:**
   - `tmp/batch-status.json` должен создаваться во время выполнения
   - Проверьте в артефактах

2. **Проверьте деплой:**
   - Файлы должны быть задеплоены на Vercel
   - Проверьте `tmp/deploy-status.json` в артефактах

---

## 📝 ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ

### Запуск только для EN (Фаза 1):

```bash
gh workflow run monster8-batch-scheduler.yml \
  -f force_phase=en_only \
  -f force_length=short
```

### Запуск длинной партии:

```bash
gh workflow run monster8-batch-scheduler.yml \
  -f force_phase=auto \
  -f force_length=long
```

### Отключение автоматического деплоя:

Установите Variable: `AUTO_DEPLOY` = `0`

---

## ✅ ЧЕКЛИСТ НАСТРОЙКИ

- [ ] Добавлен `DEEPSEEK_API_KEY` в Secrets
- [ ] Добавлен `GROQ_API_KEY` в Secrets (опционально)
- [ ] Добавлен `VERCEL_DEPLOY_HOOK` в Secrets (для автодеплоя)
- [ ] Настроены Variables (опционально, есть дефолты)
- [ ] Проверено расписание (3 раза в день)
- [ ] Протестирован ручной запуск
- [ ] Проверены логи первого запуска
- [ ] Проверен дашборд на отображение прогресса

---

## 🔗 СВЯЗАННЫЕ ДОКУМЕНТЫ

- [MONSTER 8.0 Orchestrator](../monster8_orchestrator.sh)
- [Dashboard Setup](../docs/DASHBOARD_PHASES_STRATEGY.md)
- [Phase Strategy](../docs/PHASE_3_FRAUD_DAMAGE_STRATEGY.md)

---

**Статус:** ✅ Готово к использованию  
**Последнее обновление:** 2025-12-07
