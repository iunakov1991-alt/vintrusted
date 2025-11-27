// scripts/seo-quality-engine.js
// Quality & anti-thin слой поверх уже сгенерированных страниц.

const fs = require("fs");
const path = require("path");
const { STATIC_PAGES_ROOT, PUBLIC_DIR, BASE_URL, QUALITY_CONFIG } = require("./seo-config");

function log(msg) {
  console.log(`[SEO QUALITY] ${new Date().toISOString()} - ${msg}`);
}

function readFileSafe(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

function countWords(text) {
  const tokens = text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  return tokens.length;
}

function extractMainFact(html) {
  // Берём первый <p> после H1 или первый абзац основного содержания
  const m = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (!m) return "";
  const text = m[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.slice(0, QUALITY_CONFIG.MAIN_FACT_MAX_CHARS + 20); // берём чуть с запасом для оценки
}

function countTables(html) {
  const tableMatches = html.match(/<table[\s\S]*?<\/table>/gi) || [];
  let rows = 0;
  tableMatches.forEach((tbl) => {
    const trs = tbl.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    rows += trs.length;
  });
  return { tables: tableMatches.length, rows };
}

function countFaq(html) {
  // предположим, что FAQ-блок размечен data-faq-item или class="faq-item"
  const faqMatches =
    html.match(/data-faq-item=|"faq-item"/gi) || [];
  // грубо: один матч ~ один FAQ
  return faqMatches.length || 0;
}

function hasLogo(html) {
  return (
    /id=["']site-logo["']/i.test(html) ||
    /class=["'][^"']*site-logo[^"']*["']/i.test(html)
  );
}

function hasH1(html) {
  return /<h1[^>]*>[\s\S]*?<\/h1>/i.test(html);
}

function extractFacts(html) {
  // Наивно считаем "фактами" строки в <li>, <tr>, <p> с цифрами/конкретикой
  const candidates = html.match(/<(li|p|tr)[^>]*>[\s\S]*?<\/(li|p|tr)>/gi) || [];
  let facts = 0;
  for (const c of candidates) {
    const text = c.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (/\d/.test(text) || /title|salvage|accident|odometer|VIN|auction|DMV/i.test(text)) {
      facts++;
    }
  }
  return facts;
}

function scorePage(metrics) {
  let score = 0;

  // Слова
  if (
    metrics.wordCount >= QUALITY_CONFIG.MIN_WORDS &&
    metrics.wordCount <= QUALITY_CONFIG.MAX_WORDS
  ) {
    score += 0.25;
  } else if (metrics.wordCount >= QUALITY_CONFIG.MIN_WORDS / 2) {
    score += 0.1;
  }

  // Таблица
  if (
    metrics.tables >= 1 &&
    metrics.tableRows >= QUALITY_CONFIG.MIN_TABLE_ROWS
  ) {
    score += 0.2;
  }

  // FAQ
  if (
    metrics.faqItems >= QUALITY_CONFIG.MIN_FAQ_ITEMS &&
    metrics.faqItems <= QUALITY_CONFIG.MAX_FAQ_ITEMS
  ) {
    score += 0.15;
  }

  // Факты
  if (metrics.facts >= QUALITY_CONFIG.MIN_FACT_BLOCKS) {
    score += 0.2;
  }

  // Лого + H1
  if (metrics.hasLogo && metrics.hasH1) {
    score += 0.1;
  }

  // Main fact плотность
  if (metrics.mainFactLength > 0 && metrics.mainFactLength <= QUALITY_CONFIG.MAIN_FACT_MAX_CHARS) {
    score += 0.1;
  }

  return Math.min(1, score);
}

function htmlToUrl(htmlPath) {
  const rel = path.relative(STATIC_PAGES_ROOT, htmlPath).replace(/\\/g, "/");
  let urlPath = rel.replace(/index\.html$/i, "");
  if (!urlPath.startsWith("/")) urlPath = "/" + urlPath;
  return BASE_URL + urlPath;
}

function collectHtmlFiles(rootDir) {
  const res = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full);
      } else if (e.isFile() && e.name.toLowerCase().endsWith(".html")) {
        res.push(full);
      }
    }
  }
  walk(rootDir);
  return res;
}

function writeQualityIndex(records) {
  fs.mkdirSync(path.join("data"), { recursive: true });
  const outPath = path.join("data", "seo-quality-index.jsonl");
  const lines = records.map((r) => JSON.stringify(r));
  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
  log(`Записан индекс качества: ${outPath}, страниц: ${records.length}`);
}

function filterSitemaps(lowQualityUrls) {
  if (!QUALITY_CONFIG.AUTO_FILTER_LOW_QUALITY) {
    log("AUTO_FILTER_LOW_QUALITY=false — sitemap не трогаем.");
    return;
  }
  const publicFiles = fs.readdirSync(PUBLIC_DIR);
  const sitemapFiles = publicFiles.filter(
    (f) =>
      /^sitemap-seo(-[a-z]{2})?(-\d+)?\.xml$/i.test(f)
  );
  if (!sitemapFiles.length) {
    log("Нет sitemap-seo*.xml — пропускаем фильтрацию.");
    return;
  }

  const lowSet = new Set(lowQualityUrls);

  sitemapFiles.forEach((filename) => {
    const p = path.join(PUBLIC_DIR, filename);
    let xml = fs.readFileSync(p, "utf8");
    const beforeLen = xml.length;

    // Удаляем <url> блоки с low-quality loc
    lowSet.forEach((loc) => {
      const pattern = new RegExp(
        `<url>\\s*<loc>${loc.replace(
          /[-/\\^$*+?.()|[\]{}]/g,
          "\\$&"
        )}<\\/loc>[\\s\\S]*?<\\/url>`,
        "g"
      );
      xml = xml.replace(pattern, "");
    });

    if (xml.length !== beforeLen) {
      fs.writeFileSync(p, xml, "utf8");
      log(`Отфильтрован sitemap: ${filename}`);
    }
  });
}

function main() {
  log(`Старт анализа качества: ${STATIC_PAGES_ROOT}`);
  if (!fs.existsSync(STATIC_PAGES_ROOT)) {
    log("static-pages не найдены, выходим.");
    return;
  }

  const files = collectHtmlFiles(STATIC_PAGES_ROOT);
  log(`Найдено HTML файлов: ${files.length}`);

  const records = [];
  const lowQualityUrls = [];

  files.forEach((file, idx) => {
    if (idx > 0 && idx % 5000 === 0) {
      log(`Обработано файлов: ${idx}/${files.length}`);
    }

    const html = readFileSafe(file);
    if (!html) return;

    const wordCount = countWords(html);
    const mainFact = extractMainFact(html);
    const { tables, rows } = countTables(html);
    const faqItems = countFaq(html);
    const facts = extractFacts(html);
    const logo = hasLogo(html);
    const h1 = hasH1(html);

    const score = scorePage({
      wordCount,
      tables,
      tableRows: rows,
      faqItems,
      facts,
      hasLogo: logo,
      hasH1: h1,
      mainFactLength: mainFact.length,
    });

    const url = htmlToUrl(file);
    const rec = {
      file,
      url,
      wordCount,
      mainFactLength: mainFact.length,
      tables,
      tableRows: rows,
      faqItems,
      facts,
      hasLogo: logo,
      hasH1: h1,
      score,
      ts: new Date().toISOString(),
    };
    records.push(rec);

    if (score < QUALITY_CONFIG.MIN_SCORE) {
      lowQualityUrls.push(url);
    }
  });

  writeQualityIndex(records);
  log(
    `Страниц с низким качеством (score < ${QUALITY_CONFIG.MIN_SCORE}): ${lowQualityUrls.length}`
  );

  if (lowQualityUrls.length) {
    filterSitemaps(lowQualityUrls);
  }

  log("Quality Engine завершил работу.");
}

if (require.main === module) {
  main();
}

module.exports = { main };

