const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

module.exports.touchPageAge = function (url) {
  const outDir = path.join(__dirname, "..", "..", "data", "page-age");
  ensureDir(outDir);
  const filePath = path.join(outDir, "page-age.json");
  const map = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : {};
  if (!map[url]) map[url] = Date.now();
  fs.writeFileSync(filePath, JSON.stringify(map, null, 2));
};















