# Изменения в SEO Монстре для интеграции со страницей /sitemaps

## 📝 Конкретные изменения в коде

### Файл: `scripts/seo/seo-sitemap-engine.js`

#### ✅ Добавлено в функцию `writeSitemaps()`:

**Строка 167-169** (после `integrateWithRootSitemap(seoIndexPath);`):
```javascript
// Создаем JSON с метаданными о sitemaps для страницы /sitemaps
writeSitemapMetadata(indexEntries, byLang, pages.length);
```

#### ✅ Новая функция `writeSitemapMetadata()` (строки 257-307):

```javascript
/**
 * writeSitemapMetadata: создает JSON файл с метаданными о sitemaps для страницы /sitemaps
 */
function writeSitemapMetadata(indexEntries, byLang, totalPages) {
  const metadataPath = path.join(PUBLIC_ROOT, 'internal/sitemaps-metadata.json');
  ensureDir(path.dirname(metadataPath));

  const byLangStats = {};
  for (const lang of Object.keys(byLang)) {
    const langEntries = indexEntries.filter((e) => e.lang === lang);
    byLangStats[lang] = {
      sitemapFiles: langEntries.map((e) => ({
        fileName: e.fileName,
        url: `/seo/sitemaps/${e.fileName}`,
      })),
      indexFile: {
        fileName: `sitemap-${lang}-index.xml`,
        url: `/seo/sitemaps/sitemap-${lang}-index.xml`,
      },
      pagesCount: byLang[lang].length,
    };
  }

  const metadata = {
    lastUpdated: new Date().toISOString(),
    totalPages,
    totalSitemapFiles: indexEntries.length,
    languages: Object.keys(byLang),
    mainIndex: {
      fileName: 'sitemap-seo.xml',
      url: '/seo/sitemaps/sitemap-seo.xml',
    },
    alternativeIndex: {
      fileName: 'sitemap-seo-monster.xml',
      url: '/sitemap-seo-monster.xml',
    },
    byLanguage: byLangStats,
    allSitemapFiles: indexEntries.map((e) => ({
      fileName: e.fileName,
      lang: e.lang,
      url: `/seo/sitemaps/${e.fileName}`,
    })),
  };

  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
  log('SITEMAP', `Sitemap metadata written to ${metadataPath}`);
}
```

## 📊 Что изменилось по сравнению с предыдущей версией:

### До изменений:
- SEO монстр создавал только XML sitemap файлы
- Не было метаданных о созданных sitemaps
- Страница `/sitemaps` не могла получить информацию о sitemaps

### После изменений:
- ✅ SEO монстр создает JSON файл с метаданными (`public/internal/sitemaps-metadata.json`)
- ✅ Метаданные включают:
  - Общее количество страниц
  - Количество sitemap файлов
  - Список языков
  - Группировку по языкам с количеством страниц
  - Ссылки на все sitemap файлы
  - Дата последнего обновления
- ✅ Страница `/sitemaps` может динамически загружать и отображать эту информацию

## 🔄 Процесс работы:

1. **Во время build** SEO монстр:
   - Создает sitemap XML файлы (как и раньше)
   - **НОВОЕ**: Создает JSON файл с метаданными

2. **При открытии `/sitemaps`**:
   - Страница загружает JSON через JavaScript
   - Отображает актуальную информацию о sitemaps
   - Показывает статистику по языкам и страницам

## 📁 Новый файл, создаваемый SEO монстром:

**Путь**: `public/internal/sitemaps-metadata.json`

**Содержимое**:
```json
{
  "lastUpdated": "2025-11-29T15:41:28.000Z",
  "totalPages": 360,
  "totalSitemapFiles": 2,
  "languages": ["en", "es"],
  "mainIndex": {
    "fileName": "sitemap-seo.xml",
    "url": "/seo/sitemaps/sitemap-seo.xml"
  },
  "alternativeIndex": {
    "fileName": "sitemap-seo-monster.xml",
    "url": "/sitemap-seo-monster.xml"
  },
  "byLanguage": {
    "en": {
      "sitemapFiles": [
        {
          "fileName": "sitemap-en-1.xml",
          "url": "/seo/sitemaps/sitemap-en-1.xml"
        }
      ],
      "indexFile": {
        "fileName": "sitemap-en-index.xml",
        "url": "/seo/sitemaps/sitemap-en-index.xml"
      },
      "pagesCount": 180
    },
    "es": {
      "sitemapFiles": [...],
      "indexFile": {...},
      "pagesCount": 180
    }
  },
  "allSitemapFiles": [...]
}
```

## ⚙️ Технические детали:

- **Функция вызывается**: После создания всех sitemap XML файлов
- **Расположение JSON**: `public/internal/sitemaps-metadata.json`
- **Формат**: JSON с отступами (pretty-printed)
- **Обновление**: При каждом build SEO монстра

## 🎯 Результат:

Теперь страница `/sitemaps` полностью интегрирована с SEO монстром и автоматически отображает актуальную информацию о всех созданных sitemap файлах.

