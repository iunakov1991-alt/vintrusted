const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, "..", "..");
const AB_POLICY = path.join(ROOT, "data", "a-b-tests", "policy.json");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadWeights() {
  try {
    if (!fs.existsSync(AB_POLICY)) return { A: 0.5, B: 0.5 };
    const json = JSON.parse(fs.readFileSync(AB_POLICY, "utf8"));
    let A = Number(json.A ?? 0.5);
    let B = Number(json.B ?? 0.5);
    if (A < 0) A = 0;
    if (B < 0) B = 0;
    if (A === 0 && B === 0) {
      A = 0.5;
      B = 0.5;
    }
    const sum = A + B;
    return { A: A / sum, B: B / sum };
  } catch {
    return { A: 0.5, B: 0.5 };
  }
}

module.exports.pickTemplate = function () {
  const { A, B } = loadWeights();
  const r = Math.random();
  const variant = r < A ? "A" : "B";
  const logDir = path.join(ROOT, "data", "a-b-tests");
  ensureDir(logDir);
  const logPath = path.join(logDir, "ab.log");
  fs.appendFileSync(logPath, JSON.stringify({ ts: Date.now(), variant, weights: { A, B } }) + "\n");
  return variant;
};

