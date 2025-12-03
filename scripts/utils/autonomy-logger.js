const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const CONFIG_PATH = path.join(ROOT, "config", "autonomy-config.json");

let config = null;
try {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
} catch {
  config = { logFile: "data/autonomy-log.jsonl" };
}

const LOG_FILE = path.join(ROOT, config.logFile || "data/autonomy-log.jsonl");

function log(scope, level, message, extra = {}) {
  const entry = {
    ts: new Date().toISOString(),
    scope,
    level,
    message,
    ...extra,
  };
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n", "utf8");
  } catch (err) {
    console.error("[AUTONOMY-LOG] Failed to write log:", err.message);
  }
}

module.exports = { log };






