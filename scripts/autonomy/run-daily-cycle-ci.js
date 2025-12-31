// Лёгкий автономный цикл для GitHub Actions.
// Цели:
// 1) Не зависать >30–40 минут.
// 2) Гарантированно обновлять дашборд.
// 3) Не запускать тяжёлый RL/AI в CI.

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const INTERNAL_DIR = path.join(PUBLIC_DIR, "internal");
const SNAPSHOT_PATH = path.join(INTERNAL_DIR, "seo-autonomy-last.json");

const HARD_TIMEOUT_MIN = parseInt(process.env.AUTONOMY_HARD_TIMEOUT_MIN || "40", 10);
const MAX_PAGES_PER_BUILD = parseInt(process.env.SEO_MAX_PAGES_PER_BUILD || "10000", 10);
const TARGET_PAGES = parseInt(process.env.SEO_TARGET_PAGES || String(MAX_PAGES_PER_BUILD), 10);

function log(msg) {
  const now = new Date().toISOString();
  console.log(`[CI-AUTONOMY] ${now} - ${msg}`);
}

function run(cmd, opts = {}) {
  log(`RUN: ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: ROOT, ...opts });
}

function safeReadJson(p, fallback) {
  try {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf8"));
    }
  } catch (e) {
    log(`WARN: cannot read JSON ${p}: ${e.message}`);
  }
  return fallback;
}

function collectQuickStats() {
  let pages = 0;
  const staticRoot = path.join(PUBLIC_DIR, "static-pages");
  const sitemaps = [];
  if (fs.existsSync(staticRoot)) {
    const stack = [staticRoot];
    while (stack.length) {
      const dir = stack.pop();
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const it of items) {
        const full = path.join(dir, it.name);
        if (it.isDirectory()) stack.push(full);
        else if (it.isFile() && it.name.toLowerCase().endsWith(".html")) pages++;
      }
    }
  }
  const files = fs.readdirSync(PUBLIC_DIR);
  for (const f of files) {
    if (f.startsWith("sitemap-") && f.endsWith(".xml")) {
      sitemaps.push(f);
    }
  }
  return { pages, sitemaps, staticRoot };
}

function buildDashboardSnapshot(extra = {}) {
  const prev = safeReadJson(SNAPSHOT_PATH, {});
  const quick = collectQuickStats();
  const snapshot = {
    updatedAt: new Date().toISOString(),
    mode: "ci-light",
    hardTimeoutMin: HARD_TIMEOUT_MIN,
    maxPagesPerBuild: MAX_PAGES_PER_BUILD,
    targetPages: TARGET_PAGES,
    pagesInStatic: quick.pages,
    sitemapFiles: quick.sitemaps,
    prevSnapshot: prev,
    extra,
  };
  fs.mkdirSync(INTERNAL_DIR, { recursive: true });
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), "utf8");
  log(`Dashboard snapshot written to ${SNAPSHOT_PATH}`);
}

async function main() {
  const start = Date.now();
  log("CI autonomy cycle started");

  // 0. Предварительный снимок (на случай очень раннего падения)
  buildDashboardSnapshot({ phase: "start" });

  // 1. Лёгкая генерация страниц (без монструозных объёмов)
  try {
    log(`Step 1: generate SEO pages (max ${MAX_PAGES_PER_BUILD})`);
    process.env.SEO_MAX_PAGES_PER_BUILD = String(MAX_PAGES_PER_BUILD);
    process.env.SEO_TARGET_PAGES = String(TARGET_PAGES);
    // Твой уже существующий скрипт массовой генерации
    // НЕ меняем его логику, просто ограничиваем .env
    run("npm run build:seo");
  } catch (e) {
    log(`ERROR on build:seo: ${e.message}`);
  }

  // 2. БЫСТРОЕ обновление sitemap (без повторной генерации контента)
  try {
    log("Step 2: rebuild sitemap only");
    if (fs.existsSync(path.join(ROOT, "scripts", "build-sitemap-only.js"))) {
      run("node scripts/build-sitemap-only.js");
    } else {
      log("skip sitemap-only: scripts/build-sitemap-only.js not found");
    }
  } catch (e) {
    log(`ERROR on sitemap-only: ${e.message}`);
  }

  // 3. БЕЗ RL / тяжёлого AI в CI
  log("Step 3: skip heavy RL/AI in CI (ci-light mode)");
  // Если когда-нибудь появится лёгкий RL, можешь добавить что-то вроде:
  // if (process.env.AUTONOMY_LIGHT_RL === "true") { ... }

  // 4. Финальный снимок для дашборда (гарантированно вызывается)
  const durSec = ((Date.now() - start) / 1000).toFixed(1);
  buildDashboardSnapshot({ phase: "end", durationSec: Number(durSec) });

  log(`CI autonomy cycle finished in ${durSec}s`);
}

const killTimer = setTimeout(() => {
  log(`HARD TIMEOUT ${HARD_TIMEOUT_MIN}min reached, exiting with code 0 (dashboard already written).`);
  try {
    buildDashboardSnapshot({ phase: "timeout" });
  } catch {}
  process.exit(0);
}, HARD_TIMEOUT_MIN * 60 * 1000);

main()
  .catch((e) => {
    log(`FATAL: ${e.message}`);
    try {
      buildDashboardSnapshot({ phase: "fatal", error: e.message });
    } catch {}
    process.exitCode = 1;
  })
  .finally(() => clearTimeout(killTimer));






















