const fs = require('fs');
const path = require('path');

module.exports.computeQualityIndex = function () {
  const logPath = path.join(__dirname, "..", "..", "data", "behavior-logs", "behavior.log");
  if (!fs.existsSync(logPath)) return 0.42;

  const lines = fs.readFileSync(logPath, 'utf8').trim().split("\n").filter(Boolean);
  if (!lines.length) return 0.42;

  let clicks = 0, scroll = 0, cta = 0, bounce = 0;

  for (const raw of lines) {
    try {
      const e = JSON.parse(raw);
      if (e.type === "scroll") scroll++;
      if (e.type === "click") clicks++;
      if (e.type === "cta") cta++;
      if (e.type === "bounce") bounce++;
    } catch {
      // skip invalid lines
    }
  }

  const engagement = (scroll + clicks * 1.3 + cta * 2.0) / (bounce + 1);
  return Math.min(1, Math.max(0.05, engagement / 500));
};





