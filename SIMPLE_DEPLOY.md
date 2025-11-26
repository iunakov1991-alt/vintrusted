# Простой деплой через GitHub

## ✅ GitHub подключен к Vercel

Vercel автоматически задеплоит после push в GitHub.

## 🚀 Простой способ (3 команды)

Откройте терминал и выполните:

```bash
cd /Users/dmitrii/Desktop/website
git add vercel.json articles2/ public/sitemap.xml articles2-list.json
git commit -m "Deploy all: 24,000 articles + pagination (41,161 routes)"
git push
```

После `git push` Vercel автоматически начнет деплой!

## 📋 Что будет задеплоено

- ✅ vercel.json (41,161 маршрутов)
- ✅ articles2/ (10,000 статей + 200 пагинация)
- ✅ public/sitemap.xml (обновленный)
- ✅ Все в одном деплое

## ⏱️ Время деплоя

Деплой займет 5-15 минут из-за большого количества файлов.

## 📊 Проверка деплоя

После push:
1. Зайдите в Vercel Dashboard
2. Проверьте статус последнего деплоя
3. Дождитесь завершения

---

**Важно**: Используйте `git add` с конкретными файлами/папками, чтобы избежать зависания.


