// Копирует все HTML (и сопутствующие файлы) из legacy-директорий
//   articles/ и articles2/
// в public/static-pages/ с сохранением структуры путей.
//
// Пример:
//   website/articles/foo/bar/index.html
// → website/public/static-pages/articles/foo/bar/index.html

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const STATIC_ROOT = path.join(ROOT, "public", "static-pages");

const LEGACY_DIRS = [
  path.join(ROOT, "articles"),
  path.join(ROOT, "articles2"),
];

function log(msg) {
  const now = new Date().toISOString();
  console.log(`[SYNC-ARTICLES] ${now} - ${msg}`);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDirRecursive(srcDir) {
  if (!fs.existsSync(srcDir)) {
    log(`Пропуск: директория не найдена: ${srcDir}`);
    return 0;
  }

  let filesCopied = 0;

  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        const rel = path.relative(ROOT, full); // например: "articles/foo/index.html"
        const dest = path.join(STATIC_ROOT, rel); // "public/static-pages/articles/foo/index.html"
        ensureDir(path.dirname(dest));
        fs.copyFileSync(full, dest);
        filesCopied++;
      }
    }
  }

  walk(srcDir);
  return filesCopied;
}

function main() {
  log("Старт синхронизации legacy-статей в public/static-pages");
  ensureDir(STATIC_ROOT);

  let total = 0;
  for (const dir of LEGACY_DIRS) {
    const count = copyDirRecursive(dir);
    log(`Из ${dir} скопировано файлов: ${count}`);
    total += count;
  }

  log(`Синхронизация завершена. Всего файлов скопировано: ${total}`);
}

if (require.main === module) {
  main();
}

module.exports = { main };

