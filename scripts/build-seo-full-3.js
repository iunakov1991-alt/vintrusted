// scripts/build-seo-full-3.js
// Оркестратор Build 3.0:
// 1) запускает текущий scripts/build-seo-pages.js (фабрика страниц + sitemap)
// 2) запускает Quality Engine (anti-thin + фильтрация sitemap)
// 3) запускает Graph Engine (knowledge graph)
// 4) запускает Sitemap Inspector (health-check)

const path = require("path");
const { execSync } = require("child_process");
const { ROOT } = require("./seo-config");

function log(msg) {
  console.log(`[SEO BUILD 3.0] ${new Date().toISOString()} - ${msg}`);
}

function run(cmd) {
  log(`Запуск: ${cmd}`);
  try {
    execSync(cmd, {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    });
    log(`OK: ${cmd}`);
  } catch (err) {
    log(`ERROR в ${cmd}: ${err.message}`);
    throw err;
  }
}

function main() {
  // 1) Основной билд (уже существующий)
  run("node scripts/build-seo-pages.js");

  // 2) Quality Engine
  run("node scripts/seo-quality-engine.js");

  // 3) Graph Engine
  run("node scripts/seo-graph-engine.js");

  // 4) Sitemap Inspector
  run("node scripts/seo-sitemap-inspector.js");

  log("Build 3.0 завершён.");
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    log(`Fatal error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { main };

