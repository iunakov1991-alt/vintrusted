const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const METRICS_FILE = path.join(ROOT, "data", "metrics", "massive-gen-quality.json");
const OUT_FILE = path.join(ROOT, "data", "metrics", "quality-dashboard.json");

function main() {
  if (!fs.existsSync(METRICS_FILE)) {
    console.error("[SEO-METRICS] No massive-gen-quality.json, nothing to do.");
    process.exit(0);
  }
  const src = JSON.parse(fs.readFileSync(METRICS_FILE, "utf8"));
  const sum = src.summary || {};

  const alerts = [];

  if (sum.avgWords < 250 || sum.avgWords > 1300) {
    alerts.push("Average word count outside target range (250–1300).");
  }
  if (sum.avgFaqCount < 2) {
    alerts.push("FAQ too short on average (<2).");
  }

  const langs = sum.langs || {};
  const total = Object.values(langs).reduce((s, v) => s + v, 0) || 1;
  const enShare = (langs.en || 0) / total;
  const esShare = (langs.es || 0) / total;
  if (enShare < 0.6 || enShare > 0.8) {
    alerts.push(
      `EN share drifted from target 70%: current ${(enShare * 100).toFixed(1)}%.`
    );
  }
  if (esShare < 0.2 || esShare > 0.4) {
    alerts.push(
      `ES share drifted from target 30%: current ${(esShare * 100).toFixed(1)}%.`
    );
  }

  const dashboard = {
    updatedAt: new Date().toISOString(),
    summary: sum,
    alerts,
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(dashboard, null, 2), "utf8");
  console.log("[SEO-METRICS] quality-dashboard.json updated.");
}

if (require.main === module) {
  main();
}

module.exports = { main };


