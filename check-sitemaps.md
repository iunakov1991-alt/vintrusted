# Sitemap XML файлы - Проверка

## ✅ Где находятся sitemap файлы:

1. **На Vercel (production)**:
   - `https://vintrusted.com/seo/sitemaps/sitemap-en-1.xml`
   - `https://vintrusted.com/seo/sitemaps/sitemap-es-1.xml`
   - `https://vintrusted.com/seo/sitemaps/sitemap-seo.xml` (глобальный индекс)
   - `https://vintrusted.com/sitemap-seo-monster.xml` (копия в корне)

2. **Локально**: Файлы НЕ создаются локально, только на Vercel во время билда

## 📊 Из логов билда:

```
[SEO SITEMAP] Sitemaps written for 2 languages. Total files (incl. index): 3
[SEO SITEMAP] Root sitemap-seo-monster.xml updated.
```

Это означает, что sitemaps были созданы успешно на Vercel.

## 🔍 Как проверить:

После деплоя проверьте:
- https://vintrusted.com/seo/sitemaps/sitemap-seo.xml
- https://vintrusted.com/sitemap-seo-monster.xml

## 📝 Структура sitemap:

- До 20,000 URL на файл (безопасно для Google)
- Автоматически разбивается на части если нужно
- Интегрируется в корневой sitemap.xml (если он существует)
