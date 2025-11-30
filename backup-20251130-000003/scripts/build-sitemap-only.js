// build-sitemap-only.js
// Запускается, когда страницы УЖЕ сгенерированы,
// а нам нужно только собрать sitemap'ы без повторной генерации контента.

const fs = require("fs");
const path = require("path");
const { createBatchedSitemaps } = require("./seo-sitemap-batcher");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const STATIC_PAGES_ROOT = path.join(PUBLIC_DIR, "static-pages");

function log(msg) {
  const now = new Date().toISOString();
  console.log(`[SEO SITEMAP ONLY] ${now} - ${msg}`);
}

function collectHtmlFiles(rootDir) {
  const result = [];

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
        result.push(full);
      }
    }
  }

  walk(rootDir);
  return result;
}

function main() {
  log(`Старт: сбор HTML-файлов из ${STATIC_PAGES_ROOT}`);
  if (!fs.existsSync(STATIC_PAGES_ROOT)) {
    log("ОШИБКА: public/static-pages не существует. Нечего индексировать.");
    process.exit(1);
  }

  const htmlFiles = collectHtmlFiles(STATIC_PAGES_ROOT);
  log(`Найдено HTML-файлов: ${htmlFiles.length}`);

  if (htmlFiles.length === 0) {
    log("Нет HTML-файлов — sitemap создавать нечего.");
    return;
  }

  createBatchedSitemaps(htmlFiles);
  log("Готово: sitemap-файлы созданы на основе существующих страниц.");
}

if (require.main === module) {
  main();
}

module.exports = { main };

