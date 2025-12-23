// RL-политика: читает агрегированные метрики и корректирует lang/cluster policy.
// В реальной жизни сюда можно подвесить настоящий RL/ML.
// Сейчас — детерминированная логика на основе GA4/GSC-метрик.

const fs = require("fs");
const path = require("path");
const { log } = require("../utils/autonomy-logger");

const ROOT = path.resolve(__dirname, "..", "..");
const METRICS_FILE = path.join(
  ROOT,
  "data",
  "gsc",
  "processed",
  "aggregated-metrics.json"
);
const LANG_POLICY = path.join(ROOT, "config", "lang-policy.json");
const CLUSTER_POLICY = path.join(ROOT, "config", "cluster-policy.json");

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

function run() {
  const metrics = safeReadJSON(METRICS_FILE, null);
  if (!metrics) {
    log(
      "RL-POLICY",
      "warn",
      "No aggregated metrics found, skipping policy updates"
    );
    return;
  }

  let langPolicy = safeReadJSON(LANG_POLICY, {
    version: 1,
    global: { enShare: 0.7, esShare: 0.3 },
    perStateOverrides: {},
  });

  let clusterPolicy = safeReadJSON(CLUSTER_POLICY, {
    version: 1,
    boostedClusters: [],
    suppressedClusters: [],
    focusTopics: ["dmv", "fraud", "auctions"],
  });

  // Пример логики:
  // - если ES CTR в штатах с высокой Hispanic-долей >= 30% → поднять esShare там.
  // - если какой-то кластер даёт много денег → добавить его в boostedClusters.
  const now = new Date().toISOString();

  if (metrics.global && metrics.global.en && metrics.global.es) {
    const enCtr = metrics.global.en.ctr || 0;
    const esCtr = metrics.global.es.ctr || 0;

    if (esCtr > enCtr * 1.2) {
      langPolicy.global.esShare = Math.min(
        0.6,
        (langPolicy.global.esShare || 0.3) + 0.05
      );
      langPolicy.global.enShare = 1 - langPolicy.global.esShare;
    } else if (enCtr > esCtr * 1.2) {
      langPolicy.global.enShare = Math.min(
        0.9,
        (langPolicy.global.enShare || 0.7) + 0.05
      );
      langPolicy.global.esShare = 1 - langPolicy.global.enShare;
    }
  }

  if (metrics.clusters) {
    const boosted = [];
    const suppressed = [];

    for (const [clusterName, data] of Object.entries(metrics.clusters)) {
      const revenue = data.revenue || 0;
      const ctr = data.ctr || 0;
      if (revenue > 1000 || ctr > 0.08) boosted.push(clusterName);
      if (revenue === 0 && ctr < 0.01) suppressed.push(clusterName);
    }

    clusterPolicy.boostedClusters = boosted;
    clusterPolicy.suppressedClusters = suppressed;
  }

  langPolicy.lastUpdated = now;
  langPolicy.version = (langPolicy.version || 1) + 1;
  clusterPolicy.lastUpdated = now;
  clusterPolicy.version = (clusterPolicy.version || 1) + 1;

  writeJSON(LANG_POLICY, langPolicy);
  writeJSON(CLUSTER_POLICY, clusterPolicy);

  log("RL-POLICY", "info", "Policies recalculated", {
    langPolicyVersion: langPolicy.version,
    clusterPolicyVersion: clusterPolicy.version,
  });
}

if (require.main === module) {
  run();
}

module.exports = { run };

















