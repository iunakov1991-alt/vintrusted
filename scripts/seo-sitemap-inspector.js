// scripts/seo-sitemap-inspector.js
// Быстрая проверка sitemap и реального HTML.

const fs = require("fs");
const path = require("path");
const { PUBLIC_DIR, STATIC_PAGES_ROOT, BASE_URL } = require("./seo-config");

function log(msg) {
  console.log(`[SEO INSPECT] ${new Date().toISOString()} - ${msg}`);
}

function readSitemaps() {
  if (!fs.existsSync(PUBLIC_DIR)) return [];
  const files = fs.readdirSync(PUBLIC_DIR);
  const sitemapFiles = files.filter((f) =>
    /^sitemap-seo(-[a-z]{2})?(-\d+)?\.xml$/i.test(f)
  );
  const urls = [];
  sitemapFiles.forEach((f) => {
    try {
      const xml = fs.readFileSync(path.join(PUBLIC_DIR, f), "utf8");
      const matches = xml.match(/<loc>([\s\S]*?)<\/loc>/gi) || [];
      matches.forEach((m) => {
        const loc = m.replace(/<\/?loc>/gi, "").trim();
        if (loc) urls.push(loc);
      });
    } catch (e) {
      log(`Ошибка чтения sitemap ${f}: ${e.message}`);
    }
  });
  return urls;
}

function pickRandom(arr, n) {
  const copy = [...arr];
  const res = [];
  while (copy.length && res.length < n) {
    const idx = Math.floor(Math.random() * copy.length);
    res.push(copy.splice(idx, 1)[0]);
  }
  return res;
}

function urlToHtmlPath(url) {
  const pathPart = url.replace(BASE_URL, "");
  let rel = pathPart.replace(/^\/+/, "");
  if (!rel || rel.endsWith("/")) {
    rel = rel + "index.html";
  }
  return path.join(STATIC_PAGES_ROOT, rel);
}

function checkHtml(html) {
  const hasLogo =
    /id=["']site-logo["']/i.test(html) ||
    /class=["'][^"']*site-logo[^"']*["']/i.test(html);
  const hasH1 = /<h1[^>]*>[\s\S]*?<\/h1>/i.test(html);
  const hasTable = /<table[\s\S]*?<\/table>/i.test(html);
  const hasFaq = /data-faq-item=|"faq-item"/gi.test(html);
  return { hasLogo, hasH1, hasTable, hasFaq };
}

function main() {
  if (!fs.existsSync(PUBLIC_DIR) || !fs.existsSync(STATIC_PAGES_ROOT)) {
    log("PUBLIC или STATIC_PAGES_ROOT не найдены — инспекция невозможна.");
    return;
  }
  const allUrls = readSitemaps();
  if (!allUrls.length) {
    log("В sitemap нет URL — инспекция невозможна.");
    return;
  }

  const sampleSize = Math.min(50, allUrls.length);
  const sample = pickRandom(allUrls, sampleSize);
  log(`Инспекция случайных URL: ${sampleSize}`);

  const errors = [];

  sample.forEach((url) => {
    const htmlPath = urlToHtmlPath(url);
    if (!fs.existsSync(htmlPath)) {
      errors.push({ url, htmlPath, error: "FILE_NOT_FOUND" });
      return;
    }
    const html = fs.readFileSync(htmlPath, "utf8");
    const chk = checkHtml(html);
    if (!chk.hasLogo || !chk.hasH1 || !chk.hasTable || !chk.hasFaq) {
      errors.push({ url, htmlPath, ...chk });
    }
  });

  fs.mkdirSync(path.join("data"), { recursive: true });
  const outPath = path.join("data", "seo-sitemap-inspect.json");
  fs.writeFileSync(outPath, JSON.stringify({ sampleSize, errors }, null, 2), "utf8");
  log(`Отчёт инспекции записан: ${outPath}`);

  if (errors.length) {
    log(`Найдено проблемных страниц: ${errors.length} — билд продолжится, но это WARNING.`);
  } else {
    log("Инспекция пройдена успешно.");
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };

