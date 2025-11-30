// scripts/rl/extract-gsc-from-zip.js
// Автоматически находит ZIP файл из GSC, распаковывает и копирует CSV

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const os = require("os");

const ROOT = path.resolve(__dirname, "..", "..");
const DOWNLOADS = path.join(os.homedir(), "Downloads");
const TARGET = path.join(ROOT, "data", "gsc", "gsc-raw.csv");

function log(msg) {
  console.log(`[EXTRACT GSC] ${msg}`);
}

function findZipFiles() {
  const files = [];
  try {
    const items = fs.readdirSync(DOWNLOADS);
    for (const item of items) {
      const fullPath = path.join(DOWNLOADS, item);
      const stat = fs.statSync(fullPath);
      if (stat.isFile() && item.toLowerCase().endsWith(".zip")) {
        // Проверяем дату модификации (последние 24 часа)
        const age = Date.now() - stat.mtimeMs;
        if (age < 24 * 60 * 60 * 1000) {
          files.push({ path: fullPath, name: item, mtime: stat.mtime });
        }
      }
    }
  } catch (err) {
    log(`Ошибка чтения Downloads: ${err.message}`);
  }
  return files.sort((a, b) => b.mtime - a.mtime); // Сортируем по дате (новые первыми)
}

function extractZip(zipPath) {
  const tempDir = path.join(os.tmpdir(), `gsc-extract-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // Пробуем разные способы распаковки
    try {
      execSync(`unzip -q "${zipPath}" -d "${tempDir}"`, { stdio: "ignore" });
    } catch {
      // Если unzip не работает, пробуем через ditto (macOS)
      execSync(`ditto -x -k "${zipPath}" "${tempDir}"`, { stdio: "ignore" });
    }
    return tempDir;
  } catch (err) {
    log(`Ошибка распаковки: ${err.message}`);
    // Пробуем через ditto как fallback
    try {
      execSync(`ditto -x -k "${zipPath}" "${tempDir}"`, { stdio: "ignore" });
      return tempDir;
    } catch {
      return null;
    }
  }
}

function findCsvInDir(dir) {
  const files = [];
  function walk(current) {
    try {
      const items = fs.readdirSync(current);
      for (const item of items) {
        const fullPath = path.join(current, item);
        const stat = fs.statSync(fullPath);
        if (stat.isFile() && item.toLowerCase().endsWith(".csv")) {
          files.push(fullPath);
        } else if (stat.isDirectory()) {
          walk(fullPath);
        }
      }
    } catch (err) {
      // Игнорируем ошибки доступа
    }
  }
  walk(dir);
  return files;
}

function main() {
  log("Ищу ZIP файлы в Downloads...");
  const zipFiles = findZipFiles();

  if (zipFiles.length === 0) {
    log("❌ ZIP файлы не найдены в Downloads");
    log("");
    log("Инструкция:");
    log("1. Убедись, что ZIP файл скачан в Downloads");
    log("2. Или укажи путь к ZIP файлу вручную:");
    log("   node scripts/rl/extract-gsc-from-zip.js /путь/к/файлу.zip");
    process.exit(1);
  }

  log(`Найдено ZIP файлов: ${zipFiles.length}`);
  for (const zip of zipFiles) {
    log(`  - ${zip.name} (${new Date(zip.mtime).toLocaleString()})`);
  }

  // Берём самый новый
  const zipFile = zipFiles[0];
  log("");
  log(`Обрабатываю: ${zipFile.name}`);

  const tempDir = extractZip(zipFile.path);
  if (!tempDir) {
    log("❌ Не удалось распаковать ZIP");
    process.exit(1);
  }

  log("Ищу CSV файлы...");
  const csvFiles = findCsvInDir(tempDir);

  if (csvFiles.length === 0) {
    log("❌ CSV файлы не найдены в ZIP");
    log("");
    log("Содержимое ZIP:");
    try {
      const listing = execSync(`unzip -l "${zipFile.path}"`, {
        encoding: "utf8",
      });
      console.log(listing.split("\n").slice(0, 30).join("\n"));
    } catch {}
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.exit(1);
  }

  log(`Найдено CSV файлов: ${csvFiles.length}`);
  for (const csv of csvFiles) {
    log(`  - ${path.basename(csv)}`);
  }

  // Приоритет: ищем файл со страницами/URL
  let csvFile = null;
  
  // Сначала ищем файлы с ключевыми словами в названии
  const priorityKeywords = ["страницы", "pages", "url", "urls", "page"];
  for (const keyword of priorityKeywords) {
    const found = csvFiles.find(f => 
      path.basename(f, ".csv").toLowerCase().includes(keyword.toLowerCase())
    );
    if (found) {
      csvFile = found;
      break;
    }
  }
  
  // Если не нашли, берём самый большой
  if (!csvFile) {
    csvFile = csvFiles.sort((a, b) => {
      const sizeA = fs.statSync(a).size;
      const sizeB = fs.statSync(b).size;
      return sizeB - sizeA; // Самый большой первым
    })[0];
  }

  log("");
  log(`Копирую: ${path.basename(csvFile)} → gsc-raw.csv`);

  const targetDir = path.dirname(TARGET);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.copyFileSync(csvFile, TARGET);
  log("✅ Файл скопирован!");

  // Очистка
  fs.rmSync(tempDir, { recursive: true, force: true });

  log("");
  log("Теперь запусти: node scripts/rl/prepare-gsc-csv.js");
}

// Если передан путь к ZIP как аргумент
if (process.argv.length > 2) {
  const zipPath = process.argv[2];
  if (!fs.existsSync(zipPath)) {
    console.error(`❌ Файл не найден: ${zipPath}`);
    process.exit(1);
  }
  const tempDir = extractZip(zipPath);
  if (tempDir) {
    const csvFiles = findCsvInDir(tempDir);
    if (csvFiles.length > 0) {
      const csvFile = csvFiles.sort((a, b) => {
        const sizeA = fs.statSync(a).size;
        const sizeB = fs.statSync(b).size;
        return sizeB - sizeA;
      })[0];
      const targetDir = path.dirname(TARGET);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.copyFileSync(csvFile, TARGET);
      console.log(`✅ CSV скопирован из ${zipPath}`);
      console.log("Теперь запусти: node scripts/rl/prepare-gsc-csv.js");
      fs.rmSync(tempDir, { recursive: true, force: true });
    } else {
      console.error("❌ CSV файлы не найдены в ZIP");
      fs.rmSync(tempDir, { recursive: true, force: true });
      process.exit(1);
    }
  } else {
    console.error("❌ Не удалось распаковать ZIP");
    process.exit(1);
  }
} else {
  main();
}

