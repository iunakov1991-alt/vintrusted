const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

module.exports.pickTemplate = function () {
  const variant = Math.random() < 0.5 ? "A" : "B";
  const logDir = path.join(__dirname, "..", "..", "data", "a-b-tests");
  ensureDir(logDir);
  const logPath = path.join(logDir, "ab.log");
  fs.appendFileSync(logPath, JSON.stringify({ ts: Date.now(), variant }) + "\n");
  return variant;
};

