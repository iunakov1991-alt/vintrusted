const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const STATIC_PAGES_ROOT = path.join(PUBLIC_DIR, "static-pages");
const BASE_URL = (process.env.SEO_BASE_URL || "https://vintrusted.com").replace(/\/+$/, "");

const URLS_PER_SITEMAP = parseInt(process.env.SEO_URLS_PER_SITEMAP || "30000", 10);
const LAUNCH_DATE_STR = process.env.SEO_LAUNCH_DATE || "2025-12-10";

function log(msg) {
  console.log(`[SEO SITEMAP] ${new Date().toISOString()} - ${msg}`);
}

function toUrlFromStaticPages(absolutePath) {
  const rel = path.relative(STATIC_PAGES_ROOT, absolutePath).replace(/\\/g, "/");
  let urlPath = rel.replace(/index\.html$/i, "");
  if (!urlPath.startsWith("/")) urlPath = "/" + urlPath;
  return BASE_URL + urlPath;
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function getLaunchDate() {
  let launchDate;
  try {
    launchDate = new Date(LAUNCH_DATE_STR);
    if (isNaN(launchDate.getTime())) throw new Error("Invalid date");
  } catch {
    launchDate = new Date();
  }
  return launchDate;
}

function calcDaysPassed(launchDate) {
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((now.getTime() - launchDate.getTime()) / msPerDay));
}

function getDailyQuota(daysPassed, lang) {
  const weekIndex = Math.floor(daysPassed / 7);
  if (lang === "es") {
    if (weekIndex <= 1) return 2000;
    if (weekIndex <= 3) return 5000;
    if (weekIndex <= 7) return 15000;
    return 30000;
  } else {
    if (weekIndex <= 1) return 10000;
    if (weekIndex <= 3) return 20000;
    if (weekIndex <= 7) return 50000;
    return 80000;
  }
}

function buildLangSitemaps(lang, urls, daysPassed) {
  if (!urls.length) {
    log(`Нет URL для языка ${lang}, пропускаем.`);
    return { totalUrls: 0, totalParts: 0, allowedParts: 0 };
  }

  const sortedUnique = Array.from(new Set(urls)).sort();
  const totalUrls = sortedUnique.length;
  const chunks = chunkArray(sortedUnique, URLS_PER_SITEMAP);
  const totalParts = chunks.length;

  const dailyQuota = getDailyQuota(daysPassed, lang);
  const allowedUrls = Math.min(totalUrls, dailyQuota * (daysPassed + 1));
  const allowedParts = Math.min(totalParts, Math.ceil(allowedUrls / URLS_PER_SITEMAP));

  log(
    `[${lang.toUpperCase()}] totalUrls=${totalUrls}, totalParts=${totalParts}, ` +
      `dailyQuota=${dailyQuota}, allowedUrls=${allowedUrls}, allowedParts=${allowedParts}`
  );

  const lastmod = new Date().toISOString();
  const prefix = lang === "es" ? "sitemap-es" : "sitemap-en";
  const indexName = lang === "es" ? "sitemap-es-index.xml" : "sitemap-en-index.xml";

  chunks.forEach((chunk, idx) => {
    const partIndex = idx + 1;
    const xmlItems = chunk
      .map(
        (u) => `
  <url>
    <loc>${u}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
      )
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlItems}
</urlset>
`;
    const sitemapPath = path.join(PUBLIC_DIR, `${prefix}-${partIndex}.xml`);
    fs.writeFileSync(sitemapPath, xml, "utf8");
    log(`${prefix}-${partIndex}.xml создан: ${sitemapPath}, URL-ов: ${chunk.length}`);
  });

  const indexItems = [];
  for (let i = 1; i <= allowedParts; i++) {
    const loc = `${BASE_URL}/${prefix}-${i}.xml`;
    indexItems.push(`
  <sitemap>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`);
  }

  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexItems.join("\n")}
</sitemapindex>
`;
  const indexPath = path.join(PUBLIC_DIR, indexName);
  fs.writeFileSync(indexPath, indexXml, "utf8");
  log(`${indexName} создан: ${indexPath}, частей: ${allowedParts}/${totalParts}`);

  return { totalUrls, totalParts, allowedParts, allowedUrls };
}

function createBatchedSitemaps(htmlFiles) {
  if (!htmlFiles || !htmlFiles.length) {
    log("Нет HTML-файлов для sitemap, пропускаем.");
    return;
  }

  const allUrls = htmlFiles
    .filter((f) => f && f.toLowerCase().endsWith(".html"))
    .map((f) => toUrlFromStaticPages(f));

  const enUrls = [];
  const esUrls = [];

  allUrls.forEach((url) => {
    const pathPart = url.replace(BASE_URL, "");
    if (pathPart.startsWith("/es/")) {
      esUrls.push(url);
    } else {
      enUrls.push(url);
    }
  });

  const launchDate = getLaunchDate();
  const daysPassed = calcDaysPassed(launchDate);

  const enStats = buildLangSitemaps("en", enUrls, daysPassed);
  const esStats = buildLangSitemaps("es", esUrls, daysPassed);

  const lastmod = new Date().toISOString();
  const globalIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap-en-index.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-es-index.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
</sitemapindex>
`;
  fs.writeFileSync(path.join(PUBLIC_DIR, "sitemap-seo.xml"), globalIndex, "utf8");
  log("sitemap-seo.xml создан как глобальный индекс EN+ES");

  const stats = {
    baseUrl: BASE_URL,
    launchDate: LAUNCH_DATE_STR,
    daysPassed,
    urlsPerSitemap: URLS_PER_SITEMAP,
    en: enStats,
    es: esStats,
  };
  try {
    fs.writeFileSync(
      path.join(PUBLIC_DIR, "seo-stats.json"),
      JSON.stringify(stats, null, 2),
      "utf8"
    );
    log("seo-stats.json обновлён.");
  } catch (e) {
    log(`Ошибка записи seo-stats.json: ${e.message}`);
  }
}

module.exports = { createBatchedSitemaps };
