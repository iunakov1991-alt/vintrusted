# 🔐 НАСТРОЙКА GITHUB SECRETS

## ⚡ ОБЯЗАТЕЛЬНЫЕ СЕКРЕТЫ

Перейдите в настройки GitHub Secrets:
**https://github.com/iunakov1991-alt/vintrusted/settings/secrets/actions**

### 1. MONSTER_INTERNAL_SECRET
**Для чего:** Защита internal API `/api/batch-status-update`

**Где взять:** 
- Используйте тот же токен, что и `BATCH_STATUS_TOKEN` в Vercel
- Или создайте новый: любая случайная строка (минимум 32 символа)

**Как добавить:**
1. Откройте: https://github.com/iunakov1991-alt/vintrusted/settings/secrets/actions/new
2. Name: `MONSTER_INTERNAL_SECRET`
3. Value: (скопируйте значение из Vercel Environment Variable `BATCH_STATUS_TOKEN`)
4. Нажмите "Add secret"

---

### 2. DEEPSEEK_API_KEY (уже есть)
✅ Уже настроен — используется для генерации контента

---

### 3. GROQ_API_KEY (опционально)
✅ Уже настроен — используется для дополнительных LLM операций

---

## ✅ ПРОВЕРКА

После добавления секрета проверьте:

```bash
# 1. Запустите новую партию через дашборд
curl -X POST https://vintrusted.com/api/batch-runner/start \
  -H "Content-Type: application/json" \
  -d '{"phase":"test","length":"short"}'

# 2. Проверьте, что партия перешла в running
curl -s https://vintrusted.com/api/batch-status | jq '.current.status'
# Должно вернуть: "running" (через 10-20 секунд после запуска)

# 3. Проверьте логи GitHub Actions
# https://github.com/iunakov1991-alt/vintrusted/actions
```

---

## 🔄 КАК ЭТО РАБОТАЕТ

```
┌─────────────────────────────────────────────────────────────────┐
│                        ПОЛНАЯ СХЕМА                              │
└─────────────────────────────────────────────────────────────────┘

1️⃣ Дашборд → /api/batch-runner/start
   ├─ Создает запись в KV (status: queued, id: 2025-12-08_...)
   └─ Триггерит GitHub Actions workflow (передает batch_id)

2️⃣ GitHub Actions workflow запускается
   ├─ Шаг "Set batch to RUNNING"
   │  └─ POST /api/batch-status-update
   │     └─ KV: status → running
   │
   ├─ Шаг "Run MONSTER 8.0 Orchestrator"
   │  └─ scripts/build_topics_batch_parallel.js
   │     ├─ После каждого чанка → POST /api/batch-status-update
   │     │  └─ KV: topicsDone, fatalErrors обновляются
   │     │
   │     └─ Перед каждым чанком → GET /api/batch-status
   │        └─ Проверяет stopRequested
   │
   └─ Шаг "Finalize batch status"
      └─ POST /api/batch-status-update
         └─ KV: status → success/failed/stopped

3️⃣ Дашборд читает статус
   └─ GET /api/batch-status → показывает текущее состояние
```

---

## 🚨 ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ

### Партия висит в "queued"
**Причина:** GitHub Actions не может обновить статус

**Решение:**
1. Проверьте, что `MONSTER_INTERNAL_SECRET` добавлен в GitHub Secrets
2. Проверьте, что токен совпадает с `BATCH_STATUS_TOKEN` в Vercel
3. Проверьте логи workflow: https://github.com/iunakov1991-alt/vintrusted/actions

### GitHub Actions показывает 401 Unauthorized
**Причина:** Неверный секрет

**Решение:**
1. Откройте Vercel: https://vercel.com/dimas-projects-edf037c0/vintrusted/settings/environment-variables
2. Скопируйте значение `BATCH_STATUS_TOKEN`
3. Обновите `MONSTER_INTERNAL_SECRET` в GitHub Secrets

---

**Все готово!** 🎉

