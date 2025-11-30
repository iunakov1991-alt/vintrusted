const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { log } = require("../utils/autonomy-logger");

const ROOT = path.resolve(__dirname, "..", "..");
const RAW_DIR = path.join(ROOT, "data", "gsc", "raw");
const PROCESSED_DIR = path.join(ROOT, "data", "gsc", "processed");
const LANG_POLICY = path.join(ROOT, "config", "lang-policy.json");
const CLUSTER_POLICY = path.join(ROOT, "config", "cluster-policy.json");

function getLatestZip() {
  if (!fs.existsSync(RAW_DIR)) return null;
  const files = fs.readdirSync(RAW_DIR).filter((f) =>
    f.toLowerCase().endsWith(".zip")
  );
  if (!files.length) return null;
  const withStats = files.map((f) => {
    const full = path.join(RAW_DIR, f);
    const stat = fs.statSync(full);
    return { file: full, mtime: stat.mtimeMs };
  });
  withStats.sort((a, b) => b.mtime - a.mtime);
  return withStats[0].file;
}

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
  log("RL-AUTO", "info", "Starting auto GSC → RL pipeline");

  // 1) Если включен API — сначала дергаем его
  const useApi = process.env.USE_GSC_API === "1";
  if (useApi) {
    const apiScript = path.join(ROOT, "scripts", "rl", "fetch-gsc-api.js");
    if (fs.existsSync(apiScript)) {
      try {
        log("RL-AUTO", "info", "USE_GSC_API=1, running fetch-gsc-api.js");
        execSync(`node ${apiScript}`, { stdio: "inherit", cwd: ROOT });
      } catch (err) {
        log("RL-AUTO", "warn", "fetch-gsc-api.js failed, continue with ZIP if present", {
          error: err.message,
        });
      }
    } else {
      log("RL-AUTO", "warn", "fetch-gsc-api.js not found, cannot use API");
    }
  }

  // 2) Ищем ZIP; если нет — просто лог и выходим
  const latestZip = getLatestZip();
  if (!latestZip) {
    log(
      "RL-AUTO",
      "warn",
      "No GSC ZIP found in data/gsc/raw, skipping RL update"
    );
    return;
  }

  log("RL-AUTO", "info", "Using GSC ZIP", { zip: latestZip });

  try {
    // 3) extract-gsc-from-zip
    const extractor = path.join(
      ROOT,
      "scripts",
      "rl",
      "extract-gsc-from-zip.js"
    );
    if (fs.existsSync(extractor)) {
      log("RL-AUTO", "info", "Running extract-gsc-from-zip.js");
      execSync(`node ${extractor}`, { stdio: "inherit", cwd: ROOT });
    } else {
      log(
        "RL-AUTO",
        "warn",
        "extract-gsc-from-zip.js not found, skipping extraction"
      );
    }

    // 4) npm run rl:train
    log("RL-AUTO", "info", "Running npm run rl:train");
    execSync("npm run rl:train", { stdio: "inherit", cwd: ROOT });

    // 5) Обновляем политики (timestamp + инкремент версий)
    const langPolicy = safeReadJSON(LANG_POLICY, {
      version: 1,
      global: { enShare: 0.7, esShare: 0.3 },
      perStateOverrides: {},
    });

    const clusterPolicy = safeReadJSON(CLUSTER_POLICY, {
      version: 1,
      boostedClusters: [],
      suppressedClusters: [],
      focusTopics: ["dmv", "fraud", "auctions"],
    });

    const now = new Date().toISOString();
    langPolicy.lastUpdated = now;
    clusterPolicy.lastUpdated = now;
    langPolicy.version = (langPolicy.version || 1) + 1;
    clusterPolicy.version = (clusterPolicy.version || 1) + 1;

    writeJSON(LANG_POLICY, langPolicy);
    writeJSON(CLUSTER_POLICY, clusterPolicy);

    log("RL-AUTO", "info", "Policies updated", {
      langPolicyVersion: langPolicy.version,
      clusterPolicyVersion: clusterPolicy.version,
    });
  } catch (err) {
    log("RL-AUTO", "error", "Auto RL pipeline failed", {
      error: err.message,
    });
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };

