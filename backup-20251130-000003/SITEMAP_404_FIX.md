# Исправление 404 для Sitemap XML

## ✅ Что было сделано:

1. **Добавлен build entry** для `public/seo/sitemaps/**`:
   ```json
   {
     "src": "public/seo/sitemaps/**",
     "use": "@vercel/static"
   }
   ```

2. **Добавлены rewrites** для доступа к sitemap файлам:
   ```json
   {
     "source": "/seo/sitemaps/:file*",
     "destination": "/seo/sitemaps/:file*"
   },
   {
     "source": "/sitemap-seo-monster.xml",
     "destination": "/sitemap-seo-monster.xml"
   }
   ```

## 🔍 Объяснение:

**Почему был 404:**
- Sitemap файлы создаются в `public/seo/sitemaps/` во время билда на Vercel
- Но не было явного rewrite для доступа к ним по URL `/seo/sitemaps/*`
- Хотя есть build для `public/**`, иногда нужен явный rewrite для подпапок

**Что исправлено:**
- Добавлен build entry для явной обработки sitemap файлов
- Добавлены rewrites для маршрутизации запросов к sitemap файлам
- Rewrites добавлены в КОНЕЦ списка, чтобы не конфликтовать с другими правилами

## ⚠️ Безопасность изменений:

- ✅ НЕ затронуты существующие API routes
- ✅ НЕ затронуты существующие HTML страницы
- ✅ НЕ затронуты существующие rewrites для /vin/*
- ✅ Добавлены только новые rewrites в конец списка
- ✅ Изменения минимальны и изолированы

## 📍 После деплоя проверьте:

- https://vintrusted.com/seo/sitemaps/sitemap-seo.xml
- https://vintrusted.com/seo/sitemaps/sitemap-en-1.xml
- https://vintrusted.com/seo/sitemaps/sitemap-es-1.xml
- https://vintrusted.com/sitemap-seo-monster.xml

Все должны возвращать XML, а не 404.
