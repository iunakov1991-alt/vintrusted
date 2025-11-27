// Собирает все данные монстра в один JSON для дашборда:
// - seo-stats.json (sitemap)
// - autonomy-state.json
// - lang-policy.json
// - cluster-policy.json
// - aggregated-metrics.json (GSC/GA4)
// - автономный лог (autonomy-log.jsonl, только счётчики)
// + генерит "Cursor tasks" — готовые bash-сниппеты.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const INTERNAL_DIR = path.join(PUBLIC_DIR, "internal");

const DASH_CONFIG = path.join(ROOT, "config", "dashboard-config.json");
const SEO_STATS = path.join(PUBLIC_DIR, "seo-stats.json");
const AUTONOMY_STATE = path.join(ROOT, "data", "autonomy-state.json");
const AUTONOMY_LOG = path.join(ROOT, "data", "autonomy-log.jsonl");
const LANG_POLICY = path.join(ROOT, "config", "lang-policy.json");
const CLUSTER_POLICY = path.join(ROOT, "config", "cluster-policy.json");
const METRICS = path.join(ROOT, "data", "gsc", "processed", "aggregated-metrics.json");

function safeReadJSON(p, fallback) {
  try {
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

function safeReadLines(p, maxLines) {
  try {
    if (!fs.existsSync(p)) return [];
    const raw = fs.readFileSync(p, "utf8").trim();
    if (!raw) return [];
    const lines = raw.split("\n");
    return lines.slice(-maxLines);
  } catch {
    return [];
  }
}

function summarizeLog(lines) {
  const summary = {
    total: lines.length,
    info: 0,
    warn: 0,
    error: 0,
    lastErrors: [],
  };
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      const lvl = obj.level || "info";
      if (lvl === "info") summary.info++;
      else if (lvl === "warn") summary.warn++;
      else if (lvl === "error") {
        summary.error++;
        if (summary.lastErrors.length < 5) {
          summary.lastErrors.push({
            ts: obj.ts,
            scope: obj.scope,
            message: obj.message,
          });
        }
      }
    } catch {
      // ignore broken
    }
  }
  return summary;
}

function buildCursorTasks(context) {
  const tasks = [];

  const {
    seoStats,
    autonomyState,
    langPolicy,
    metrics,
    dashboardConfig,
  } = context;

  const projectPath = "/Users/dmitrii/Desktop/website";

  // 1) Если страниц очень много и нет sitemap-экспозиции целиком — подсказка по лимитам
  if (seoStats && seoStats.totalUrls && seoStats.totalSitemaps) {
    const total = seoStats.totalUrls;
    const exposed = seoStats.exposedUrls || 0;
    if (total - exposed > 200000) {
      tasks.push({
        id: "tune-build-limits",
        title: "Поджать лимит страниц на билд и замедлить раскрытие",
        reason:
          "Большой хвост неэкспонированных URL в sitemap, можно уменьшить нагрузку.",
        bash: `#!/bin/bash
cd "${projectPath}"

# Открой .env и настрои параметры:
# SEO_MAX_PAGES_PER_BUILD=300000
# SEO_TARGET_FULL_EXPOSURE_DAYS=240

# После правок запусти:
npm run build:seo
`,
      });
    }
  }

  // 2) Если ES CTR существенно выше EN — предложить поднять ES долю (через политику / RL)
  const globalEnCtr = metrics?.global?.en?.ctr || 0;
  const globalEsCtr = metrics?.global?.es?.ctr || 0;
  if (globalEsCtr > globalEnCtr * 1.3 && globalEsCtr > 0.03) {
    tasks.push({
      id: "boost-es-share",
      title: "Увеличить долю ES-страниц",
      reason:
        "CTR по испанскому трафику заметно выше — можно дать больше ES.",
      bash: `#!/bin/bash
cd "${projectPath}"

# Вариант 1: дать RL самому обновить политику:
npm run rl:auto

# Вариант 2: временно руками поправить config/lang-policy.json,
# увеличив global.esShare и уменьшив global.enShare.
`,
    });
  }

  // 3) Если ошибок в логах много — задача на диагностику
  if (
    context.logSummary &&
    context.logSummary.error >
      (dashboardConfig.maxAllowedErrorsPerDay || 5)
  ) {
    tasks.push({
      id: "inspect-errors",
      title: "Разобраться с ошибками билда/автопилота",
      reason:
        "Число ошибок в autonomy-log.jsonl превышает допустимый порог.",
      bash: `#!/bin/bash
cd "${projectPath}"

# Посмотреть последние ошибки:
tail -n 100 data/autonomy-log.jsonl | grep '"level":"error"' || true

# При необходимости локально прогнать:
npm run autonomy:daily
`,
    });
  }

  // 4) Если totalUrls сильно ниже targetTotalPages — мягкий пинок на масштабирование
  const targetPages = dashboardConfig.targetTotalPages || 20000000;
  const totalUrls = seoStats?.totalUrls || 0;
  if (totalUrls && totalUrls < targetPages * 0.3) {
    const suggestedPages = Math.max(2000000, Math.floor(targetPages / 2));
    tasks.push({
      id: "scale-up-pages",
      title: "Увеличить целевое количество страниц",
      reason:
        "Текущее количество страниц сильно ниже целевого, можно расширить сетку.",
      bash: `#!/bin/bash
cd "${projectPath}"

# Открой .env и увеличь:
# SEO_TARGET_PAGES=${suggestedPages}
# SEO_MAX_PAGES_PER_BUILD=500000

# Затем запусти билд:
npm run build:seo
`,
    });
  }

  // 5) Таска на пересборку дашборда вручную (если что-то поломалось)
  tasks.push({
    id: "rebuild-dashboard",
    title: "Пересобрать дашборд вручную",
    reason: "Если графики или данные дашборда выглядят неверно.",
    bash: `#!/bin/bash
cd "${projectPath}"

# Собрать данные дашборда:
node scripts/dashboard/build-dashboard-data.js

# Затем задеплоить (если используешь Vercel CLI):
# npx vercel --prod --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" --confirm
`,
  });

  return tasks;
}

function main() {
  const dashboardConfig = safeReadJSON(DASH_CONFIG, {});
  const seoStats = safeReadJSON(SEO_STATS, null);
  const autonomyState = safeReadJSON(AUTONOMY_STATE, null);
  const langPolicy = safeReadJSON(LANG_POLICY, null);
  const clusterPolicy = safeReadJSON(CLUSTER_POLICY, null);
  const metrics = safeReadJSON(METRICS, null);
  const logLines = safeReadLines(AUTONOMY_LOG, 500);
  const logSummary = summarizeLog(logLines);

  const now = new Date().toISOString();

  const summary = {
    projectName: dashboardConfig.projectName || "Vintrusted SEO Autonomy",
    updatedAt: now,
    totalUrls: seoStats?.totalUrls || 0,
    exposedUrls: seoStats?.exposedUrls || 0,
    totalSitemaps: seoStats?.totalSitemaps || 0,
    allowedSitemaps: seoStats?.allowedSitemaps || 0,
    urlsPerSitemap: seoStats?.urlsPerSitemap || 0,
    builds: autonomyState?.builds || {},
    lastBuildAt: autonomyState?.lastBuildAt || null,
  };

  const language = {
    enShare: langPolicy?.global?.enShare ?? null,
    esShare: langPolicy?.global?.esShare ?? null,
    lastUpdated: langPolicy?.lastUpdated || null,
  };

  const traffic = {
    global: {
      en: metrics?.global?.en || null,
      es: metrics?.global?.es || null,
    },
    clusters: metrics?.clusters || null,
  };

  const data = {
    meta: {
      updatedAt: now,
      config: dashboardConfig,
    },
    summary,
    language,
    traffic,
    clusters: {
      boosted: clusterPolicy?.boostedClusters || [],
      suppressed: clusterPolicy?.suppressedClusters || [],
      focusTopics: clusterPolicy?.focusTopics || [],
    },
    logs: {
      summary: logSummary,
    },
    cursorTasks: buildCursorTasks({
      seoStats,
      autonomyState,
      langPolicy,
      metrics,
      dashboardConfig,
      logSummary,
    }),
  };

  fs.mkdirSync(INTERNAL_DIR, { recursive: true });
  const outPath = path.join(INTERNAL_DIR, "dashboard-data.json");
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf8");
  console.log("[DASHBOARD] dashboard-data.json updated:", outPath);
}

if (require.main === module) {
  main();
}

module.exports = { main };

