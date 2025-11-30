# Решение проблемы множественных деплоев в Vercel

## Проблема

Vercel создает сотни деплоев из-за:
- Большого количества файлов (27,581 HTML)
- Больших изменений в vercel.json (56,012 строк)
- Автоматического деплоя для каждой ветки/коммита

## Решения

### 1. Настройка автоматического деплоя в Vercel Dashboard

1. Зайдите в **Vercel Dashboard** → Ваш проект → **Settings** → **Git**
2. Настройте **Production Branch**: только `main`
3. Отключите **Automatic deployments from Git branches** для ненужных веток
4. Включите **Ignore Build Step** для определенных коммитов

### 2. Использование .vercelignore

Создайте/обновите `.vercelignore` чтобы исключить ненужные файлы:

```
# Исключить временные файлы
*.log
.DS_Store
.env.local

# Исключить большие папки (если не нужны для деплоя)
# node_modules/ (уже исключено)
```

### 3. Настройка через vercel.json

Добавьте в `vercel.json` настройки для оптимизации:

```json
{
  "version": 2,
  "buildCommand": "echo 'No build needed'",
  "devCommand": "echo 'No dev server'",
  "installCommand": "echo 'No install needed'",
  "framework": null,
  "ignoreCommand": "git diff --quiet HEAD^ HEAD"
}
```

### 4. Использование [skip ci] или [skip vercel]

В сообщении коммита добавьте `[skip vercel]` чтобы пропустить деплой:

```bash
git commit -m "Update config [skip vercel]"
```

### 5. Ручное управление деплоями

Вместо автоматического деплоя используйте:
- **Manual Deploy** через Vercel CLI: `vercel --prod`
- Деплой только важных коммитов

### 6. Ограничение веток для деплоя

В настройках Vercel:
- **Production Branch**: `main` только
- **Preview Deployments**: отключить для всех веток кроме `main`
- **Automatic deployments**: только для `main`

## Рекомендуемое решение

### Вариант A: Отключить автоматический деплой для всех веток кроме main

1. Vercel Dashboard → Settings → Git
2. **Production Branch**: `main`
3. **Preview Deployments**: отключить
4. **Automatic deployments**: только для `main`

### Вариант B: Использовать [skip vercel] для промежуточных коммитов

```bash
# Для промежуточных изменений
git commit -m "WIP: update config [skip vercel]"

# Для финального деплоя
git commit -m "Deploy batch 1: articles"
```

### Вариант C: Деплой через Vercel CLI только когда готово

```bash
# Установить Vercel CLI
npm i -g vercel

# Деплой только когда все готово
vercel --prod
```

## Проверка текущих настроек

В Vercel Dashboard проверьте:
- Сколько деплоев создается в день
- Какие ветки триггерят деплои
- Настройки автоматического деплоя

## Очистка старых деплоев

В Vercel Dashboard можно:
1. Удалить старые деплои (если они не нужны)
2. Ограничить количество хранимых деплоев в настройках

---

**Рекомендация**: Используйте Вариант A + Вариант B для контроля деплоев.


