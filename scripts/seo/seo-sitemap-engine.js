const fs = require('fs');
const path = require('path');
const { log } = require('./logger');

const SITEMAP_ROOT = path.join(process.cwd(), 'public/seo/sitemaps');
const PUBLIC_ROOT = path.join(process.cwd(), 'public');
const INTERNAL_ROOT = path.join(process.cwd(), 'public/internal');

function chunk(arr, n) {
  const res = [];
  for (let i = 0; i < arr.length; i += n) res.push(arr.slice(i, i + n));
  return res;
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function writeSitemaps(pages, config) {
  ensureDir(SITEMAP_ROOT);

  // Чистим только свои XML
  const existing = fs.readdirSync(SITEMAP_ROOT);
  for (const f of existing) {
    if (f.endsWith('.xml')) {
      fs.unlinkSync(path.join(SITEMAP_ROOT, f));
    }
  }

  const byLang = {};
  for (const p of pages) {
    if (!byLang[p.lang]) byLang[p.lang] = [];
    byLang[p.lang].push(p);
  }

  const indexEntries = [];
  const maxPerFile = 20000; // безопасно под Pro

  for (const lang of Object.keys(byLang)) {
    const list = byLang[lang];
    const chunksArr = chunk(list, maxPerFile);

    chunksArr.forEach((chunkPages, idx) => {
      const part = idx + 1;
      const fileName = `sitemap-${lang}-${part}.xml`;
      const locs = chunkPages
        .map((p) => `<url><loc>https://vintrusted.com${p.url}</loc></url>`)
        .join('');
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${locs}
</urlset>`;
      fs.writeFileSync(path.join(SITEMAP_ROOT, fileName), xml, 'utf8');
      indexEntries.push({ lang, fileName });
    });

    const indexName = `sitemap-${lang}-index.xml`;
    const entries = indexEntries
      .filter((e) => e.lang === lang)
      .map(
        (e) =>
          `<sitemap><loc>https://vintrusted.com/seo/sitemaps/${e.fileName}</loc></sitemap>`
      )
      .join('');
    const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;
    fs.writeFileSync(path.join(SITEMAP_ROOT, indexName), indexXml, 'utf8');
  }

  // Глобальный индекс внутри public/seo/sitemaps
  const globalIndexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexEntries
  .map(
    (e) =>
      `<sitemap><loc>https://vintrusted.com/seo/sitemaps/${e.fileName}</loc></sitemap>`
  )
  .join('')}
</sitemapindex>`;
  const seoIndexPath = path.join(SITEMAP_ROOT, 'sitemap-seo.xml');
  fs.writeFileSync(seoIndexPath, globalIndexXml, 'utf8');

  log(
    'SITEMAP',
    `Sitemaps written for ${Object.keys(byLang).length} languages. Total files (incl. index): ${
      indexEntries.length + 1
    }`
  );

  integrateWithRootSitemap(seoIndexPath);

  // JSON метаданные для /sitemaps
  writeSitemapMetadata(indexEntries, byLang, pages.length);
}

function integrateWithRootSitemap(seoIndexPath) {
  ensureDir(PUBLIC_ROOT);

  const monsterPath = path.join(PUBLIC_ROOT, 'sitemap-seo-monster.xml');
  try {
    fs.copyFileSync(seoIndexPath, monsterPath);
    log('SITEMAP', 'Root sitemap-seo-monster.xml updated.');
  } catch (e) {
    log('SITEMAP', `copy monster sitemap error: ${e.message}`);
  }

  const rootSitemapPath = path.join(PUBLIC_ROOT, 'sitemap.xml');
  if (!fs.existsSync(rootSitemapPath)) {
    return;
  }

  try {
    let content = fs.readFileSync(rootSitemapPath, 'utf8');

    if (!content.includes('<sitemapindex')) {
      return;
    }

    const targetLoc = 'https://vintrusted.com/seo/sitemaps/sitemap-seo.xml';

    if (content.includes(targetLoc)) {
      return;
    }

    const insert = `<sitemap><loc>${targetLoc}</loc></sitemap>`;
    if (content.includes('</sitemapindex>')) {
      content = content.replace('</sitemapindex>', `${insert}\n</sitemapindex>`);
      fs.writeFileSync(rootSitemapPath, content, 'utf8');
      log('SITEMAP', 'Root sitemap.xml patched with SEO index link.');
    }
  } catch (e) {
    log('SITEMAP', `root sitemap integration error: ${e.message}`);
  }
}

function writeSitemapMetadata(indexEntries, byLang, totalPages) {
  try {
    ensureDir(INTERNAL_ROOT);

    const languages = Object.keys(byLang);
    const totalSitemapFiles = indexEntries.length + 1; // +1 за sitemap-seo.xml

    const byLanguage = {};
    for (const lang of languages) {
      const langEntries = indexEntries.filter((e) => e.lang === lang);
      const sitemapFiles = langEntries.map((e) => ({
        fileName: e.fileName,
        url: `/seo/sitemaps/${e.fileName}`
      }));
      const indexFileName = `sitemap-${lang}-index.xml`;
      byLanguage[lang] = {
        sitemapFiles,
        indexFile: {
          fileName: indexFileName,
          url: `/seo/sitemaps/${indexFileName}`
        },
        pagesCount: (byLang[lang] || []).length
      };
    }

    const allSitemapFiles = indexEntries.map((e) => ({
      lang: e.lang,
      fileName: e.fileName,
      url: `/seo/sitemaps/${e.fileName}`
    }));

    const payload = {
      lastUpdated: new Date().toISOString(),
      totalPages,
      totalSitemapFiles,
      languages,
      mainIndex: {
        fileName: 'sitemap-seo.xml',
        url: '/seo/sitemaps/sitemap-seo.xml'
      },
      alternativeIndex: {
        fileName: 'sitemap-seo-monster.xml',
        url: '/sitemap-seo-monster.xml'
      },
      byLanguage,
      allSitemapFiles
    };

    const outPath = path.join(INTERNAL_ROOT, 'sitemaps-metadata.json');
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
    log('SITEMAP', 'sitemaps-metadata.json updated.');
  } catch (e) {
    log('SITEMAP', `sitemaps-metadata write error: ${e.message}`);
  }
}

module.exports = { writeSitemaps };
