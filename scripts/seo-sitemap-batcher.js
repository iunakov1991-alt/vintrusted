const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const STATIC_PAGES_ROOT = path.join(PUBLIC_DIR, "static-pages");
const BASE_URL = (process.env.SEO_BASE_URL || "https://vintrusted.com").replace(/\/+$/, "");

const URLS_PER_SITEMAP = parseInt(process.env.SEO_URLS_PER_SITEMAP || "30000", 10);
const DEFAULT_TARGET_FULL_EXPOSURE_DAYS = parseInt(process.env.SEO_TARGET_FULL_EXPOSURE_DAYS || "90", 10);
const DEFAULT_MIN_SPD = parseInt(process.env.SEO_MIN_SITEMAPS_PER_DAY || "1", 10);
const DEFAULT_MAX_SPD = parseInt(process.env.SEO_MAX_SITEMAPS_PER_DAY || "40", 10);
const LAUNCH_DATE_STR = process.env.SEO_LAUNCH_DATE || "2025-12-10";

const RL_SITEMAP_POLICY = path.join(ROOT, "data", "rl", "sitemap-policy.json");

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

function loadRLPolicy() {
  try {
    if (!fs.existsSync(RL_SITEMAP_POLICY)) return null;
    return JSON.parse(fs.readFileSync(RL_SITEMAP_POLICY, "utf8"));
  } catch {
    return null;
  }
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function getDailyQuota(daysPassed, lang, totalParts) {
  // RL policy override
  const rl = loadRLPolicy();
  const targetDays = rl ? (rl.targetFullExposureDays || DEFAULT_TARGET_FULL_EXPOSURE_DAYS) : DEFAULT_TARGET_FULL_EXPOSURE_DAYS;
  let minSPD = rl ? (rl.minSitemapsPerDay || DEFAULT_MIN_SPD) : DEFAULT_MIN_SPD;
  let maxSPD = rl ? (rl.maxSitemapsPerDay || DEFAULT_MAX_SPD) : DEFAULT_MAX_SPD;

  // Базовая скорость для раскрытия за targetDays
  const baseRate = Math.max(1, Math.ceil((totalParts || 1) / Math.max(1, targetDays)));
  let spd = clamp(baseRate, minSPD, maxSPD);

  // Прогрев: первые дни не даём слишком много
  if (daysPassed < 15) {
    spd = Math.min(spd, 1);
  } else if (daysPassed < 30) {
    spd = Math.min(spd, 3);
  }

  // Конвертируем sitemaps per day в URLs per day
  const urlsPerDay = spd * URLS_PER_SITEMAP;

  // Fallback к старой логике если RL policy нет или для совместимости
  if (!rl) {
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

  return urlsPerDay;
}

function buildLangSitemaps(lang, urls, daysPassed, totalPartsHint) {
  if (!urls.length) {
    log(`Нет URL для языка ${lang}, пропускаем.`);
    return { totalUrls: 0, totalParts: 0, allowedParts: 0 };
  }

  const sortedUnique = Array.from(new Set(urls)).sort();
  const totalUrls = sortedUnique.length;
  const chunks = chunkArray(sortedUnique, URLS_PER_SITEMAP);
  const totalParts = chunks.length;

  const dailyQuota = getDailyQuota(daysPassed, lang, totalPartsHint || totalParts);
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

  const enChunks = chunkArray(Array.from(new Set(enUrls)).sort(), URLS_PER_SITEMAP);
  const esChunks = chunkArray(Array.from(new Set(esUrls)).sort(), URLS_PER_SITEMAP);
  const enTotalParts = enChunks.length;
  const esTotalParts = esChunks.length;

  const enStats = buildLangSitemaps("en", enUrls, daysPassed, enTotalParts);
  const esStats = buildLangSitemaps("es", esUrls, daysPassed, esTotalParts);

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

  const rl = loadRLPolicy();
  const stats = {
    baseUrl: BASE_URL,
    launchDate: LAUNCH_DATE_STR,
    daysPassed,
    urlsPerSitemap: URLS_PER_SITEMAP,
    targetFullExposureDays: rl ? (rl.targetFullExposureDays || DEFAULT_TARGET_FULL_EXPOSURE_DAYS) : DEFAULT_TARGET_FULL_EXPOSURE_DAYS,
    minSitemapsPerDay: rl ? (rl.minSitemapsPerDay || DEFAULT_MIN_SPD) : DEFAULT_MIN_SPD,
    maxSitemapsPerDay: rl ? (rl.maxSitemapsPerDay || DEFAULT_MAX_SPD) : DEFAULT_MAX_SPD,
    rlOverride: rl || null,
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
