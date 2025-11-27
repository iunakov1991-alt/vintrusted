// scripts/rl/prepare-gsc-csv.js
// Помогает подготовить GSC CSV к использованию в RL системе
// 
// Использование:
//   1. Скачай CSV из Google Search Console
//   2. Положи его в data/gsc/gsc-raw.csv
//   3. Запусти: node scripts/rl/prepare-gsc-csv.js
//   4. Получится data/gsc/gsc-latest.csv в правильном формате

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const RAW_CSV = path.join(ROOT, "data", "gsc", "gsc-raw.csv");
const OUTPUT_CSV = path.join(ROOT, "data", "gsc", "gsc-latest.csv");

function log(msg) {
  console.log(`[PREPARE GSC] ${msg}`);
}

function normalizeUrl(url) {
  // Убираем параметры запроса
  url = url.split("?")[0];
  // Убираем якоря
  url = url.split("#")[0];
  // Нормализуем слэши
  url = url.replace(/\/+/g, "/");
  // Убираем trailing slash (кроме корня)
  if (url.length > 1 && url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  return url;
}

function main() {
  if (!fs.existsSync(RAW_CSV)) {
    log("❌ Файл data/gsc/gsc-raw.csv не найден!");
    log("");
    log("Инструкция:");
    log("1. Скачай CSV из Google Search Console");
    log("2. Положи его в data/gsc/gsc-raw.csv");
    log("3. Запусти этот скрипт снова");
    process.exit(1);
  }

  log("Читаю data/gsc/gsc-raw.csv...");
  const content = fs.readFileSync(RAW_CSV, "utf8");
  const lines = content.split("\n").filter((l) => l.trim());

  if (lines.length < 2) {
    log("❌ CSV файл слишком короткий (нужен заголовок + данные)");
    process.exit(1);
  }

  // Парсим заголовок
  const header = lines[0].toLowerCase();
  const headerCols = header.split(",").map((c) => c.trim().replace(/"/g, ""));

  // Ищем нужные колонки (поддерживаем русский и английский)
  const urlIdx = headerCols.findIndex(
    (c) =>
      c.includes("url") ||
      c.includes("page") ||
      c.includes("страница") ||
      c.includes("популярные страницы") ||
      c.includes("pages")
  );
  const clicksIdx = headerCols.findIndex(
    (c) => {
      const lower = c.toLowerCase();
      // Ищем "лики" (может быть "Клики" или "Kлики" - латинская K)
      return (
        lower.includes("click") ||
        lower.includes("клик") ||
        lower.includes("лики") || // Найдёт и "Клики" и "Kлики"
        lower === "clicks"
      );
    }
  );
  const imprIdx = headerCols.findIndex(
    (c) =>
      c.includes("impression") ||
      c.includes("показ") ||
      c.includes("показы") ||
      c === "impressions"
  );
  const ctrIdx = headerCols.findIndex(
    (c) =>
      c.includes("ctr") ||
      c.includes("кликабельность") ||
      c.toLowerCase() === "ctr"
  );
  const posIdx = headerCols.findIndex(
    (c) =>
      c.includes("position") ||
      c.includes("позиция") ||
      c.includes("average position") ||
      c.includes("средняя позиция")
  );

  log(`Найдены колонки:`);
  log(`  URL: ${urlIdx >= 0 ? headerCols[urlIdx] : "НЕ НАЙДЕНА"}`);
  log(`  Clicks: ${clicksIdx >= 0 ? headerCols[clicksIdx] : "НЕ НАЙДЕНА"}`);
  log(`  Impressions: ${imprIdx >= 0 ? headerCols[imprIdx] : "НЕ НАЙДЕНА"}`);
  log(`  CTR: ${ctrIdx >= 0 ? headerCols[ctrIdx] : "НЕ НАЙДЕНА"}`);
  log(`  Position: ${posIdx >= 0 ? headerCols[posIdx] : "НЕ НАЙДЕНА"}`);

  if (urlIdx < 0 || clicksIdx < 0 || imprIdx < 0) {
    log("❌ Не найдены обязательные колонки!");
    log("Проверь, что CSV содержит: URL, Clicks, Impressions");
    process.exit(1);
  }

  // Парсим данные
  const output = ["url,clicks,impressions,ctr,position"];
  let processed = 0;
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));

    if (cols.length < Math.max(urlIdx, clicksIdx, imprIdx) + 1) {
      skipped++;
      continue;
    }

    let url = normalizeUrl(cols[urlIdx] || "");
    // Исправляем URL если пропал слэш после https:
    if (url.startsWith("https:/") && !url.startsWith("https://")) {
      url = url.replace("https:/", "https://");
    }
    const clicks = parseFloat(cols[clicksIdx] || "0") || 0;
    const impressions = parseFloat(cols[imprIdx] || "0") || 0;
    // Убираем % из CTR если есть
    let ctrStr = ctrIdx >= 0 ? (cols[ctrIdx] || "0") : "0";
    ctrStr = ctrStr.toString().replace(/%/g, "").replace(",", ".");
    const ctr = parseFloat(ctrStr) || 0;
    const position =
      posIdx >= 0 ? parseFloat(cols[posIdx] || "0") || 0 : 0;

    if (!url || url === "/" || clicks === 0) {
      skipped++;
      continue;
    }

    output.push(`${url},${clicks},${impressions},${ctr},${position}`);
    processed++;
  }

  // Сохраняем
  const outputDir = path.dirname(OUTPUT_CSV);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_CSV, output.join("\n"), "utf8");

  log("");
  log("✅ Готово!");
  log(`  Обработано строк: ${processed}`);
  log(`  Пропущено строк: ${skipped}`);
  log(`  Результат: data/gsc/gsc-latest.csv`);
  log("");
  log("Теперь можно запустить: npm run rl:train");
}

if (require.main === module) {
  main();
}

module.exports = { main };

