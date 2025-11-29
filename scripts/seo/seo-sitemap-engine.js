
const fs = require('fs');

const path = require('path');

const { log } = require('./logger');



const SITEMAP_ROOT = path.join(process.cwd(), 'public/seo/sitemaps');



function chunk(arr, n) {

  const res = [];

  for (let i = 0; i < arr.length; i += n) res.push(arr.slice(i, i + n));

  return res;

}



function writeSitemaps(pages, config) {

  if (!fs.existsSync(SITEMAP_ROOT)) fs.mkdirSync(SITEMAP_ROOT, { recursive: true });



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



  const allIndexEntries = [];

  const maxPerFile = 20000;



  for (const lang of Object.keys(byLang)) {

    const list = byLang[lang];

    const chunksArr = chunk(list, maxPerFile);

    const langEntries = [];



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

      langEntries.push({ lang, fileName });

      allIndexEntries.push({ lang, fileName });

    });



    const indexName = `sitemap-${lang}-index.xml`;

    const entriesXml = langEntries

      .map(

        (e) =>

          `<sitemap><loc>https://vintrusted.com/seo/sitemaps/${e.fileName}</loc></sitemap>`

      )

      .join('');

    const indexXml = `<?xml version="1.0" encoding="UTF-8"?>

<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${entriesXml}

</sitemapindex>`;

    fs.writeFileSync(path.join(SITEMAP_ROOT, indexName), indexXml, 'utf8');

  }



  const globalIndexXml = `<?xml version="1.0" encoding="UTF-8"?>

<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${allIndexEntries

  .map(

    (e) =>

      `<sitemap><loc>https://vintrusted.com/seo/sitemaps/${e.fileName}</loc></sitemap>`

  )

  .join('')}

</sitemapindex>`;

  fs.writeFileSync(path.join(SITEMAP_ROOT, 'sitemap-seo.xml'), globalIndexXml, 'utf8');



  log('SITEMAP', `Sitemaps written for ${Object.keys(byLang).length} languages`);

}



module.exports = { writeSitemaps };

