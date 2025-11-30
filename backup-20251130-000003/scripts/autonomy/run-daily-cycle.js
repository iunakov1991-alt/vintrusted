// Главный дневной цикл:
// 1) решает, запускать ли билд
// 2) вызывает npm run build:seo (или прямой build-seo-pages)
// 3) запускает build-sitemap-only
// 4) запускает авто-обновление GSC → RL → политики
// Работает без участия человека, если вызывать по расписанию (cron/GitHub Actions).

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { log } = require("../utils/autonomy-logger");

const ROOT = path.resolve(__dirname, "..", "..");
const CONFIG_PATH = path.join(ROOT, "config", "autonomy-config.json");
const STATE_FILE = path.join(ROOT, "data", "autonomy-state.json");

function safeReadJSON(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJSON(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
}

function hoursDiff(a, b) {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60);
}

function shouldRunBuild(config, state) {
  if (!config.enableAutoBuild) return false;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const buildsToday = (state.builds && state.builds[today]) || 0;
  if (buildsToday >= (config.maxBuildsPerDay || 1)) return false;

  if (state.lastBuildAt) {
    const last = new Date(state.lastBuildAt);
    const diff = hoursDiff(now, last);
    if (diff < (config.minHoursBetweenBuilds || 8)) return false;
  }

  return true;
}

function run() {
  const config = safeReadJSON(CONFIG_PATH, { enableAutoBuild: true });
  let state = safeReadJSON(STATE_FILE, { builds: {} });

  log("AUTONOMY", "info", "Starting daily cycle", { config });

  let didBuild = false;

  if (shouldRunBuild(config, state)) {
    try {
      log("AUTONOMY", "info", "Running SEO build: npm run build:seo");
      execSync("npm run build:seo", { stdio: "inherit", cwd: ROOT });
      didBuild = true;

      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      state.lastBuildAt = now.toISOString();
      state.builds = state.builds || {};
      state.builds[today] = (state.builds[today] || 0) + 1;
      writeJSON(STATE_FILE, state);

      log("AUTONOMY", "info", "SEO build completed");
    } catch (err) {
      log("AUTONOMY", "error", "SEO build failed", { error: err.message });
    }
  } else {
    log("AUTONOMY", "info", "Build skipped by policy");
  }

  // sitemap-only (на случай, если build:seo уже генерит — это будет быстрая до-синхронизация)
  try {
    if (config.enableAutoSitemap) {
      const sitemapScript = path.join(ROOT, "scripts", "build-sitemap-only.js");
      if (fs.existsSync(sitemapScript)) {
        log("AUTONOMY", "info", "Running sitemap-only builder");
        execSync(`node ${sitemapScript}`, { stdio: "inherit", cwd: ROOT });
        log("AUTONOMY", "info", "Sitemap-only build completed");
      } else {
        log(
          "AUTONOMY",
          "warn",
          "build-sitemap-only.js not found, skipping sitemap-only step"
        );
      }
    }
  } catch (err) {
    log("AUTONOMY", "error", "Sitemap-only build failed", {
      error: err.message,
    });
  }

  // RL обновление: GSC → extract → rl:train → policy-engine
  try {
    if (config.enableAutoRL) {
      const autoGsc = path.join(ROOT, "scripts", "rl", "auto-gsc-train.js");
      if (fs.existsSync(autoGsc)) {
        log("AUTONOMY", "info", "Running auto GSC → RL pipeline");
        execSync(`node ${autoGsc}`, { stdio: "inherit", cwd: ROOT });
        log("AUTONOMY", "info", "Auto GSC → RL pipeline completed");
      } else {
        log(
          "AUTONOMY",
          "warn",
          "auto-gsc-train.js not found, skipping RL pipeline"
        );
      }

      const policyEngine = path.join(ROOT, "scripts", "rl", "policy-engine.js");
      if (fs.existsSync(policyEngine)) {
        log("AUTONOMY", "info", "Running RL policy engine");
        execSync(`node ${policyEngine}`, { stdio: "inherit", cwd: ROOT });
        log("AUTONOMY", "info", "RL policy engine completed");
      } else {
        log(
          "AUTONOMY",
          "warn",
          "policy-engine.js not found, skipping policy update"
        );
      }
    }
  } catch (err) {
    log("AUTONOMY", "error", "Auto RL phase failed", { error: err.message });
  }

  // Сборка dashboard-data.json
  try {
    const dashScript = path.join(ROOT, "scripts", "dashboard", "build-dashboard-data.js");
    if (fs.existsSync(dashScript)) {
      log("AUTONOMY", "info", "Building dashboard-data.json");
      execSync(`node ${dashScript}`, { stdio: "inherit", cwd: ROOT });
      log("AUTONOMY", "info", "Dashboard data build completed");
    } else {
      log(
        "AUTONOMY",
        "warn",
        "build-dashboard-data.js not found, skipping dashboard build"
      );
    }
  } catch (err) {
    log("AUTONOMY", "error", "Dashboard data build failed", {
      error: err.message,
    });
  }

  log("AUTONOMY", "info", "Daily cycle finished", { didBuild });
}

if (require.main === module) {
  run();
}

module.exports = { run };

