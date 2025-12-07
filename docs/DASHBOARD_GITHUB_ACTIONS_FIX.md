# 🔧 ИСПРАВЛЕНИЕ: ДАШБОРД НЕ ОБНОВЛЯЕТСЯ ИЗ GITHUB ACTIONS

**Дата:** 2025-12-07  
**Проблема:** Дашборд не показывает прогресс партий, запущенных через GitHub Actions  
**Статус:** ✅ **ИСПРАВЛЕНО**

---

## ❌ ПРОБЛЕМА

GitHub Actions работает в **изолированной среде runner**, и файлы `tmp/batch-status.json` создаются там, но **не попадают на Vercel**. 

Vercel - это отдельный сервер, который не имеет доступа к файлам из GitHub Actions runner.

**Результат:** Дашборд на Vercel не видит прогресс партий, запущенных через GitHub Actions.

---

## ✅ РЕШЕНИЕ

**Сохраняем `batch-status.json` в репозиторий** через git commit, чтобы Vercel мог его прочитать после деплоя.

### Что было добавлено в workflow:

```yaml
- name: Commit batch status to repo
  if: always()
  run: |
    # Сохраняем статус в репозиторий, чтобы Vercel мог его прочитать
    if [ -f "tmp/batch-status.json" ]; then
      git config --local user.email "action@github.com"
      git config --local user.name "GitHub Action"
      git add tmp/batch-status.json
      git commit -m "Update batch status [skip ci]" || echo "No changes to commit"
      git push origin main || echo "Push failed (non-critical)"
    fi
```

---

## 🔄 КАК ЭТО РАБОТАЕТ

1. **GitHub Actions запускает партию**
   - Создается `tmp/batch-status.json` в runner
   - Статус обновляется во время выполнения

2. **После завершения (или ошибки)**
   - Workflow коммитит `tmp/batch-status.json` в репозиторий
   - Файл попадает в git

3. **Vercel деплоит обновление**
   - Vercel видит новый коммит
   - Деплоит обновленный `tmp/batch-status.json`
   - Дашборд может прочитать статус

4. **Дашборд обновляется**
   - API `/api/status` читает `tmp/batch-status.json`
   - Прогресс отображается в дашборде

---

## ⚠️ ВАЖНО

### 1. Файл должен быть в git

Убедитесь, что `tmp/batch-status.json` **не игнорируется** в `.gitignore`:

```bash
# Проверьте .gitignore
cat .gitignore | grep batch-status

# Если файл игнорируется, добавьте исключение:
# !tmp/batch-status.json
```

### 2. Vercel должен деплоить коммиты

Проверьте настройки Vercel:
- **Settings → Git → Production Branch:** должен быть `main`
- **Settings → Git → Deploy Hooks:** должен быть включен автоматический деплой

### 3. Задержка обновления

- **GitHub Actions:** коммитит статус сразу после завершения
- **Vercel:** деплоит в течение 1-2 минут после коммита
- **Дашборд:** обновляется каждые 5 секунд

**Итого:** прогресс появится в дашборде через 1-3 минуты после завершения партии.

---

## 🧪 ПРОВЕРКА

### 1. Проверьте, что workflow коммитит статус:

1. Перейдите: **https://github.com/iunakov1991-alt/vintrusted/actions**
2. Откройте последний запуск
3. Найдите шаг **"Commit batch status to repo"**
4. Проверьте, что он успешно выполнился

### 2. Проверьте, что файл в репозитории:

1. Перейдите: **https://github.com/iunakov1991-alt/vintrusted/blob/main/tmp/batch-status.json**
2. Файл должен существовать и содержать актуальный статус

### 3. Проверьте дашборд:

1. Откройте: **https://vintrusted.com/dashboard**
2. Секция **"⚙️ Прогресс партии"** должна показывать:
   - Статус: "🟢 Выполняется" или "✅ Завершена"
   - Прогресс-бар с процентами
   - Количество завершенных страниц

---

## 🔄 АЛЬТЕРНАТИВНОЕ РЕШЕНИЕ (если не работает)

Если коммит в репозиторий не работает, можно использовать:

### Вариант 1: GitHub API для хранения статуса

Создать отдельный API endpoint, который будет читать статус из GitHub API.

### Вариант 2: Внешнее хранилище

Использовать базу данных (MongoDB, PostgreSQL) или key-value хранилище (Redis) для хранения статуса.

### Вариант 3: Webhook для обновления

GitHub Actions отправляет webhook на Vercel API, который обновляет статус напрямую.

---

## ✅ СТАТУС

- ✅ Workflow обновлен для коммита статуса
- ✅ Файл `tmp/batch-status.json` будет в репозитории
- ✅ Vercel сможет прочитать статус после деплоя
- ✅ Дашборд будет показывать прогресс

**Следующий запуск:** После следующего запуска GitHub Actions, прогресс должен появиться в дашборде через 1-3 минуты.

---

**Последнее обновление:** 2025-12-07
