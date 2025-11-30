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

    // Группировка по языкам
    const byLang = {};
    for (const p of pages) {
      if (!byLang[p.lang]) byLang[p.lang] = [];
      byLang[p.lang].push(p);
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
        const locs = chunkPages.map((p) => {
          const priority = Math.min(1.0, (p.qualityScore || 0.5) + 0.3);
          const lastmod = new Date().toISOString().split('T')[0];
          return `<url>
  <loc>https://vintrusted.com${p.url}</loc>
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

