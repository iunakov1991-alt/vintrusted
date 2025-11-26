const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { createBatchedSitemaps } = require("./seo-sitemap-batcher");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const STATIC_PAGES_ROOT = path.join(PUBLIC_DIR, "static-pages");

function log(msg) {
  const now = new Date().toISOString();
  console.log(`[SEO BUILD] ${now} - ${msg}`);
}

function rimrafSafe(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function runNodeScript(fileName) {
  const absPath = path.join(ROOT, fileName);
  if (!fs.existsSync(absPath)) {
    log(`Skip generator (not found): ${fileName}`);
    return;
  }
  log(`Run: node ${fileName}`);
  execSync(`node ${fileName}`, {
    stdio: "inherit",
    cwd: ROOT,
    env: process.env
  });
}

function collectHtmlFiles(rootDir) {
  const result = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
        result.push(full);
      }
    }
  }
  walk(rootDir);
  return result;
}

function main() {
  const start = Date.now();
  log("Start SEO build (variant C)");

  log(`Clean: ${STATIC_PAGES_ROOT}`);
  rimrafSafe(STATIC_PAGES_ROOT);
  ensureDir(STATIC_PAGES_ROOT);

  const legacyGenerators = [
    "generate-10000-seo-articles.js",
    "generate-7000-seo-articles.js",
    "generate-5000-new-articles.js",
    "generate-pagination.js"
  ];
  for (const g of legacyGenerators) runNodeScript(g);

  runNodeScript("generate-massive-seo-articles.js");

  runNodeScript("scripts/generate-knowledge-graph-pages.js");

  const syncScript = path.join(ROOT, "sync-articles-to-static-pages.js");
  if (fs.existsSync(syncScript)) {
    log("Run legacy sync script");
    execSync(`node sync-articles-to-static-pages.js`, {
      stdio: "inherit",
      cwd: ROOT,
      env: process.env
    });
  }

  const htmlFiles = collectHtmlFiles(STATIC_PAGES_ROOT);
  log(`Collected HTML files: ${htmlFiles.length}`);

  createBatchedSitemaps(htmlFiles);

  const end = Date.now();
  log(`SEO build completed in ${((end - start) / 1000).toFixed(1)}s`);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    log(`Fatal error: ${err.message}`);
    process.exit(1);
  }
}
