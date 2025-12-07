# 🧪 ТЕСТИРОВАНИЕ ЗАПУСКА ПАРТИЙ

**Дата:** 2025-12-07  
**Статус:** GITHUB_TOKEN уже настроен ✅

---

## ✅ ЧТО УЖЕ СДЕЛАНО

- ✅ `GITHUB_TOKEN` добавлен в Vercel Environment Variables
- ✅ Переменная доступна для всех окружений (development, preview, production)
- ✅ Код обновлен для реального запуска через GitHub Actions

---

## 🧪 КАК ПРОТЕСТИРОВАТЬ

### Вариант 1: Через дашборд (рекомендуется)

1. **Откройте дашборд:**
   - https://vintrusted.com/dashboard

2. **Нажмите "🚀 Запустить партию"**

3. **Проверьте результат:**
   - ✅ Должно появиться: "✅ Партия запущена через GitHub Actions!"
   - ✅ Должна быть ссылка на GitHub Actions
   - ✅ Модальное окно должно закрыться

4. **Проверьте GitHub Actions:**
   - Откройте: https://github.com/iunakov1991-alt/vintrusted/actions
   - Должен появиться новый запуск workflow "MONSTER 8.0 Batch Scheduler"
   - Статус: "🟡 In progress" или "✅ Completed"

---

### Вариант 2: Через API напрямую

```bash
curl -X POST "https://vintrusted.com/dashboard/api/batch/start" \
  -H "Content-Type: application/json" | jq '.'
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "message": "✅ Партия запущена через GitHub Actions!",
  "workflow": {
    "repo": "iunakov1991-alt/vintrusted",
    "workflow": "monster8-batch-scheduler.yml",
    "phase": "en_only",
    "length": "long"
  },
  "githubUrl": "https://github.com/iunakov1991-alt/vintrusted/actions"
}
```

---

## 🔍 ПРОВЕРКА РАБОТЫ

### 1. Проверьте логи Vercel Functions

1. Откройте: https://vercel.com/dimas-projects-edf037c0/vintrusted/functions
2. Найдите функцию `api/dashboard.js`
3. Проверьте логи на наличие:
   - ✅ "GitHub Actions workflow запущен успешно"
   - ❌ Или ошибок, если что-то не работает

### 2. Проверьте GitHub Actions

1. Откройте: https://github.com/iunakov1991-alt/vintrusted/actions
2. Найдите последний запуск "MONSTER 8.0 Batch Scheduler"
3. Проверьте:
   - ✅ Workflow запустился
   - ✅ Все шаги выполнены успешно
   - ✅ Партия сгенерирована

### 3. Проверьте дашборд

1. Откройте: https://vintrusted.com/dashboard
2. Найдите секцию "⚙️ Прогресс партии"
3. Проверьте:
   - ✅ Статус обновляется
   - ✅ Прогресс-бар показывает прогресс
   - ✅ Количество завершенных страниц увеличивается

---

## ⚠️ ВОЗМОЖНЫЕ ПРОБЛЕМЫ

### Проблема: "Партия не может быть запущена автоматически"

**Причины:**
1. `GITHUB_TOKEN` не имеет правильных прав
2. Токен истек
3. Неправильный репозиторий

**Решение:**
1. Проверьте права токена (должны быть `repo` и `workflow`)
2. Создайте новый токен, если истек
3. Проверьте `GITHUB_REPO` в Vercel (должно быть `iunakov1991-alt/vintrusted`)

### Проблема: Workflow не запускается

**Причины:**
1. Workflow файл не существует
2. Неправильное имя workflow
3. Неправильная ветка

**Решение:**
1. Проверьте файл: `.github/workflows/monster8-batch-scheduler.yml`
2. Проверьте, что workflow имеет `workflow_dispatch` trigger
3. Проверьте, что ветка `main` существует

### Проблема: Workflow запускается, но падает

**Причины:**
1. Не настроены секреты в GitHub
2. Ошибка в workflow

**Решение:**
1. Проверьте GitHub Secrets: https://github.com/iunakov1991-alt/vintrusted/settings/secrets/actions
2. Проверьте логи workflow для деталей ошибки

---

## 📋 ЧЕКЛИСТ ПРОВЕРКИ

- [ ] `GITHUB_TOKEN` настроен в Vercel ✅ (уже сделано)
- [ ] Токен имеет права `repo` и `workflow`
- [ ] Протестирован запуск через дашборд
- [ ] Проверено, что workflow запускается в GitHub Actions
- [ ] Проверено, что прогресс отображается в дашборде
- [ ] Проверены логи на наличие ошибок

---

## 🎯 СЛЕДУЮЩИЕ ШАГИ

1. **Протестируйте запуск** через дашборд
2. **Проверьте GitHub Actions** - должен появиться новый запуск
3. **Проверьте прогресс** в дашборде
4. **Если всё работает** - можно использовать для регулярных запусков!

---

**Готово к тестированию!** 🚀
