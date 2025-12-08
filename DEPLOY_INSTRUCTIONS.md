# 🚀 ИНСТРУКЦИЯ ПО ДЕПЛОЮ

## ❌ ПРОБЛЕМА

Изменения не запушены в GitHub, поэтому Vercel их не видит.

## ✅ РЕШЕНИЕ

### Вариант 1: Ручной push (рекомендуется)

1. Откройте терминал
2. Выполните:
```bash
cd /Users/dmitrii/Desktop/website
git fetch origin
git pull origin main
git push origin main
```

### Вариант 2: Через Vercel Dashboard

1. Откройте: https://vercel.com/dimas-projects-edf037c0/vintrusted
2. Нажмите "Settings" → "Git"
3. Проверьте подключение к репозиторию
4. Нажмите "Redeploy" на последнем deployment

### Вариант 3: Vercel CLI

```bash
vercel --prod
```

---

## 📋 ЧТО СОЗДАНО (готово к деплою)

✅ `api/batch-runner.js` - API для запуска партий  
✅ `api/batch-dashboard.js` - API для дашборда  
✅ `public/batch-dashboard.html` - HTML дашборда  
✅ `batch-dashboard.html` - Копия в корне  
✅ `vercel.json` - Обновленная конфигурация  

---

## ⏱️ ПОСЛЕ ДЕПЛОЯ

Подождите 1-3 минуты, затем откройте:
**https://vintrusted.com/batch-dashboard**

---

**Все файлы готовы, нужно только задеплоить!** ✅
