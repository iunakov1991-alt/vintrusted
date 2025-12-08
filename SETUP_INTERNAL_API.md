# 🔧 НАСТРОЙКА INTERNAL STATUS API

## ✅ ЧТО СДЕЛАНО

### 1. Создан Internal Status Update API
- **Файл:** `api/batch-status-update.js`
- **Назначение:** Единая точка для обновления статуса партий из GitHub Actions
- **Защита:** Требует секретный токен `MONSTER_INTERNAL_SECRET` в заголовке `X-MONSTER-SECRET`

### 2. Обновлен GitHub Actions Workflow
- **Файл:** `.github/workflows/monster8-batch-scheduler.yml`
- **Изменения:**
  - Принимает `batch_id` как input (передается из `/api/batch-runner/start`)
  - При старте: устанавливает статус `running` через `/api/batch-status-update`
  - В конце: финализирует партию (`success`/`failed`) через тот же API

### 3. Обновлен Batch Runner Script
- **Файл:** `scripts/build_topics_batch_parallel.js`
- **Изменения:**
  - Убрана прямая работа с KV из GitHub Actions
  - Все обновления статуса теперь через `/api/batch-status-update`
  - Проверка `stopRequested` через `/api/batch-status`

### 4. Обновлен API запуска партий
- **Файл:** `api/batch-runner.js`
- **Изменения:**
  - Передает `batch_id` в GitHub Actions workflow через `inputs.batch_id`

---

## 🔑 ЧТО НУЖНО НАСТРОИТЬ

### 1. GitHub Secrets

Открой: https://github.com/iunakov1991-alt/vintrusted/settings/secrets/actions

Добавь секрет:
- **Имя:** `MONSTER_INTERNAL_SECRET`
- **Значение:** Любая случайная строка (минимум 32 символа)
  
  Можно сгенерировать так:
  ```bash
  openssl rand -hex 32
  ```
  
  Или просто используй:
  ```
  monster-internal-secret-2025-secure-token-12345
  ```

### 2. Vercel Environment Variables

Открой: https://vercel.com/dimas-projects-edf037c0/vintrusted/settings/environment-variables

Добавь переменную:
- **Имя:** `MONSTER_INTERNAL_SECRET`
- **Значение:** **ТАКОЕ ЖЕ**, как в GitHub Secrets
- **Environments:** Production, Preview, Development (выбери все)

---

## 🔍 ПРОВЕРКА

### 1. Проверь, что API работает:

```bash
# Должен вернуть 401 без секрета
curl -X POST https://vintrusted.com/api/batch-status-update \
  -H "Content-Type: application/json" \
  -d '{"id":"test","patch":{"status":"running"}}'

# Должен вернуть 404 (нет партии) с секретом
curl -X POST https://vintrusted.com/api/batch-status-update \
  -H "Content-Type: application/json" \
  -H "X-MONSTER-SECRET: твой-секрет" \
  -d '{"id":"test","patch":{"status":"running"}}'
```

### 2. Запусти новую партию:

```bash
curl -X POST https://vintrusted.com/api/batch-runner/start \
  -H "Content-Type: application/json" \
  -d '{"phase":"en_only","length":"short"}'
```

### 3. Проверь статус:

```bash
curl https://vintrusted.com/api/batch-status | jq .
```

Ожидаемый результат:
- Статус должен быстро перейти из `queued` в `running`
- `topicsDone`, `htmlGenerated` должны обновляться в процессе
- В конце статус должен стать `success` или `failed`

### 4. Проверь GitHub Actions:

Открой: https://github.com/iunakov1991-alt/vintrusted/actions

Найди последний запуск `monster8-batch-scheduler` и проверь логи:
- В шаге "Set batch to RUNNING" должен быть успешный curl
- В шаге "Finalize batch status" должна быть финализация

---

## 🎯 КАК ЭТО РАБОТАЕТ

```
┌─────────────────┐
│ Vercel Dashboard│
│  (браузер)      │
└────────┬────────┘
         │ 1. POST /api/batch-runner/start
         ↓
┌─────────────────┐
│ Vercel Function │
│ batch-runner.js │
│                 │
│ • Создает batch │
│ • Пишет в KV    │
│   status=queued │
│ • Триггерит     │
│   GitHub Actions│
│   с batch_id    │
└────────┬────────┘
         │ 2. GitHub API call
         ↓
┌─────────────────┐
│ GitHub Actions  │
│ (worker)        │
│                 │
│ 3. curl POST    │
│   /batch-status-│
│   update        │
│   status=running│
│                 │
│ 4. Генерация    │
│    страниц...   │
│                 │
│ 5. curl POST    │
│   после каждого │
│   чанка:        │
│   topicsDone+=N │
│                 │
│ 6. curl POST    │
│   финал:        │
│   status=success│
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Vercel Function │
│ batch-status-   │
│ update.js       │
│                 │
│ • Проверяет     │
│   X-MONSTER-    │
│   SECRET        │
│ • Обновляет KV  │
│ • Если финальный│
│   статус →      │
│   архивирует    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Upstash Redis   │
│ (KV Store)      │
│                 │
│ • current       │
│ • last          │
│ • archive       │
└─────────────────┘
```

---

## ❓ FAQ

**Q: Почему не писать в KV напрямую из GitHub Actions?**
A: Из-за сложности настройки Upstash Redis в GitHub Actions (нужны переменные, SDK, и т.д.). API проще и надежнее.

**Q: Что если GitHub Actions не может достучаться до Vercel?**
A: Партия останется в статусе `queued`. Но это редкий случай — Vercel доступен из GitHub Actions.

**Q: Нужно ли удалять старые секреты (KV_REST_API_*, BATCH_STATUS_TOKEN)?**
A: Можно оставить для совместимости, но они больше не используются в новом workflow.

**Q: Как отладить, если не работает?**
A: Проверь логи GitHub Actions. Там будут видны все curl запросы и их ответы.

---

## ✅ CHECKLIST

- [ ] Добавлен `MONSTER_INTERNAL_SECRET` в GitHub Secrets
- [ ] Добавлен `MONSTER_INTERNAL_SECRET` в Vercel Environment Variables (тот же!)
- [ ] Сделан redeploy Vercel (автоматически после push)
- [ ] Запущена тестовая партия
- [ ] Проверен переход статуса: queued → running → success/failed
- [ ] Проверены логи GitHub Actions

---

**После настройки секретов, запусти новую партию и проверь логи!** 🚀
