const fs = require('fs');
const path = require('path');
const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Sitemap Engine
 * Генерация sitemaps с учетом приоритетов и crawl budget
 */
class SitemapEngine {
  constructor(config) {
    this.config = config;
    // Пишем только в public/seo/sitemaps - Vercel автоматически соберет файлы оттуда
    // Не используем Build Output API, чтобы избежать проблем с config.json
    this.publicSitemapRoot = path.join(process.cwd(), 'public', 'seo', 'sitemaps');
    this.sitemapRoot = this.publicSitemapRoot; // Используем тот же путь
  }

  ensureDir(p) {
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
    }
  }

  chunk(arr, n) {
    const res = [];
    for (let i = 0; i < arr.length; i += n) res.push(arr.slice(i, i + n));
    return res;
  }

  /**
   * Генерация sitemaps с приоритетами
   */
  writeSitemaps(pages, config) {
    // Создаем директорию
    this.ensureDir(this.sitemapRoot);

    // Очистка старых sitemaps
    if (fs.existsSync(this.sitemapRoot)) {
      const existing = fs.readdirSync(this.sitemapRoot);
        for (const f of existing) {
          if (f.endsWith('.xml')) {
          fs.unlinkSync(path.join(this.sitemapRoot, f));
        }
      }
    }

    // Группировка по языкам с фильтрацией некорректных URL
    const byLang = {};
    let filteredCount = 0;
    for (const p of pages) {
      // Фильтруем страницы с "undefined" в URL или без корректного stateSlug
      if (!p.url || p.url.includes('/undefined/') || p.url.includes('undefined')) {
        filteredCount++;
        log('SITEMAP', `Filtered out page with invalid URL: ${p.url}`);
        continue;
      }
      
      // Дополнительная проверка: если это VIN страница, stateSlug обязателен и не должен быть undefined
      // SEO страницы (seo-pages) не требуют stateSlug
      if (p.url && p.url.includes('/vin/')) {
        if (p.stateSlug === 'undefined' || p.stateSlug === undefined || p.stateSlug === null || p.stateSlug === 'state') {
          filteredCount++;
          log('SITEMAP', `Filtered out VIN page with invalid stateSlug: ${p.url}`);
          continue;
        }
      }
      
      if (!byLang[p.lang]) byLang[p.lang] = [];
      byLang[p.lang].push(p);
    }
    
    if (filteredCount > 0) {
      log('SITEMAP', `Filtered out ${filteredCount} pages with invalid URLs`);
    }

    const indexEntries = [];
    const maxPerFile = 20000;

    // Генерация sitemaps по языкам
    for (const lang of Object.keys(byLang)) {
      const list = byLang[lang];
      const chunks = this.chunk(list, maxPerFile);

      chunks.forEach((chunkPages, idx) => {
        const part = idx + 1;
        const fileName = `sitemap-${lang}-${part}.xml`;
        
        // Вычисление приоритета на основе quality score
        // Дополнительная фильтрация на уровне чанка (на случай если что-то пропустили)
        const validChunkPages = chunkPages.filter((p) => {
          if (!p.url || p.url.includes('/undefined/') || p.url.includes('undefined')) {
            return false;
          }
          // Для VIN страниц проверяем stateSlug, для SEO страниц - нет
          if (p.url.includes('/vin/')) {
            return p.stateSlug !== 'undefined' &&
                   p.stateSlug !== undefined &&
                   p.stateSlug !== null &&
                   p.stateSlug !== 'state';
          }
          return true; // SEO страницы валидны без stateSlug
        });
        
        const locs = validChunkPages.map((p) => {
          const priority = Math.min(1.0, (p.qualityScore || 0.5) + 0.3);
          const lastmod = new Date().toISOString().split('T')[0];
          // Дополнительная проверка URL перед добавлением
          const cleanUrl = p.url.replace(/\/undefined\//g, '/').replace(/undefined/g, '');
          return `<url>
  <loc>https://vintrusted.com${cleanUrl}</loc>
  <lastmod>${lastmod}</lastmod>
  <priority>${priority.toFixed(2)}</priority>
</url>`;
        }).join('');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${locs}
</urlset>`;

        // Пишем sitemap
        const outputPath = path.join(this.sitemapRoot, fileName);
        fs.writeFileSync(outputPath, xml, 'utf8');
        indexEntries.push({ lang, fileName });
      });

      // Индекс для языка
      const indexName = `sitemap-${lang}-index.xml`;
      const entries = indexEntries
        .filter((e) => e.lang === lang)
        .map((e) => `<sitemap><loc>https://vintrusted.com/seo/sitemaps/${e.fileName}</loc></sitemap>`)
        .join('');

      const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;

      // Пишем индекс
      const outputIndexPath = path.join(this.sitemapRoot, indexName);
      fs.writeFileSync(outputIndexPath, indexXml, 'utf8');
    }

    // Глобальный индекс
    const globalIndexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexEntries
  .map((e) => `<sitemap><loc>https://vintrusted.com/seo/sitemaps/${e.fileName}</loc></sitemap>`)
  .join('')}
</sitemapindex>`;

    // Пишем глобальный индекс
    const seoIndexPath = path.join(this.sitemapRoot, 'sitemap-seo.xml');
    fs.writeFileSync(seoIndexPath, globalIndexXml, 'utf8');

    // Копирование в корень public
    const publicRoot = path.join(process.cwd(), 'public');
    const rootIndexPath = path.join(publicRoot, 'sitemap-seo-monster.xml');
    fs.writeFileSync(rootIndexPath, globalIndexXml, 'utf8');

    log('SITEMAP', `Sitemaps written: ${indexEntries.length} files for ${Object.keys(byLang).length} languages`);
  }
}

module.exports = { SitemapEngine };

