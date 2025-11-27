// scripts/build-seo-full-5.js
// Оркестратор Build 5.0 (Self-Learning RL Engine):
// 1) запускает текущий scripts/build-seo-pages.js (фабрика страниц + sitemap)
// 2) запускает Quality Engine (anti-thin + фильтрация sitemap)
// 3) запускает Graph Engine (knowledge graph)
// 4) запускает Sitemap Inspector (health-check)
// 5) [ОПЦИОНАЛЬНО] запускает RL Training (если есть данные GSC + behavior)

const path = require("path");
const { execSync } = require("child_process");
const fs = require("fs");
const { ROOT } = require("./seo-config");

function log(msg) {
  console.log(`[SEO BUILD 5.0] ${new Date().toISOString()} - ${msg}`);
}

function run(cmd, optional = false) {
  log(`Запуск: ${cmd}`);
  try {
    execSync(cmd, {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    });
    log(`OK: ${cmd}`);
  } catch (err) {
    if (optional) {
      log(`WARN (опционально): ${cmd} - ${err.message}`);
      return;
    }
    log(`ERROR в ${cmd}: ${err.message}`);
    throw err;
  }
}

function hasRLData() {
  const behaviorLog = path.join(ROOT, "data", "behavior-logs", "behavior.log");
  const gscCsv = path.join(ROOT, "data", "gsc", "gsc-latest.csv");
  const hasBehavior = fs.existsSync(behaviorLog) && fs.statSync(behaviorLog).size > 0;
  const hasGSC = fs.existsSync(gscCsv) && fs.statSync(gscCsv).size > 0;
  return hasBehavior || hasGSC; // Достаточно хотя бы одного источника
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

  // 5) RL Training (опционально, если есть данные)
  if (hasRLData() || process.env.SEO_ENABLE_RL === "true") {
    log("Обнаружены данные для RL training, запускаем обучение...");
    run("node scripts/rl/rl-train-and-apply.js", true);
  } else {
    log("RL training пропущен (нет данных GSC/behavior или SEO_ENABLE_RL != true)");
    log("  Чтобы включить RL: скопируй GSC CSV в data/gsc/gsc-latest.csv");
    log("  или установи SEO_ENABLE_RL=true");
  }

  log("Build 5.0 завершён.");
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

