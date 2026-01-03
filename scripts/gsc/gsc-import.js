const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

module.exports.importGSC = function (csv) {
  const outDir = path.join(__dirname, "..", "..", "data", "gsc");
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, "gsc-latest.csv"), csv);
};
























