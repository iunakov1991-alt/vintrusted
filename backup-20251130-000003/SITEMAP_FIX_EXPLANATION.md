# Исправление 404 для Sitemap XML

## Проблема:
`https://vintrusted.com/seo/sitemaps/sitemap-seo.xml` возвращает 404

## Причина:
Файлы в `public/` должны быть доступны напрямую по URL без префикса `public/`.
Rewrite для `/seo/sitemaps/:file*` может конфликтовать с автоматической обработкой статических файлов Vercel.

## Решение:
1. Убрал rewrite для sitemaps - файлы из `public/` автоматически доступны
2. Build entry для `public/seo/sitemaps/**` уже есть - это правильно
3. Файлы создаются во время билда в `public/seo/sitemaps/sitemap-seo.xml`

## Как это должно работать:
- Файл: `public/seo/sitemaps/sitemap-seo.xml`
- URL: `https://vintrusted.com/seo/sitemaps/sitemap-seo.xml`
- Vercel автоматически обслуживает файлы из `public/` по URL без префикса

## Если все еще 404:
Возможно файлы не создаются во время билда или не попадают в деплой.
Проверьте логи билда - должны быть строки:
- `[SEO SITEMAP] Sitemaps written for X languages`
- `[SEO SITEMAP] Root sitemap-seo-monster.xml updated.`
