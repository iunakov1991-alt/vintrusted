const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

module.exports.logBehavior = function (url, event) {
  const logDir = path.join(__dirname, "..", "..", "data", "behavior-logs");
  ensureDir(logDir);
  const logPath = path.join(logDir, "behavior.log");
  const line = JSON.stringify({ ts: Date.now(), url, ...event }) + "\n";
  fs.appendFileSync(logPath, line);
};

















