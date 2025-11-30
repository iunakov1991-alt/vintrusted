// GSC API клиент:
// - Использует сервисный аккаунт (JWT).
// - Секреты берутся из ENV:
//   GSC_CLIENT_EMAIL
//   GSC_PRIVATE_KEY
//   GSC_PROPERTY_URL  (например, "sc-domain:vintrusted.com")
//   GSC_DAYS_BACK     (например, "14")
// - Сохраняет данные в data/gsc/raw/gsc-raw.csv (совместимо с prepare-gsc-csv.js)

const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const ROOT = path.resolve(__dirname, "..", "..");
const RAW_DIR = path.join(ROOT, "data", "gsc", "raw");
const OUT_CSV = path.join(ROOT, "data", "gsc", "gsc-raw.csv");

async function fetchGSCData() {
  const email = process.env.GSC_CLIENT_EMAIL;
  const key = process.env.GSC_PRIVATE_KEY;
  const property = process.env.GSC_PROPERTY_URL;
  const days = parseInt(process.env.GSC_DAYS_BACK || "14", 10);

  if (!email || !key || !property) {
    console.log(
      "[GSC-API] ENV не настроены (GSC_CLIENT_EMAIL / GSC_PRIVATE_KEY / GSC_PROPERTY_URL). Пропуск."
    );
    return;
  }

  try {
    // Парсим приватный ключ (может быть с \n или без)
    // GitHub Secrets могут хранить ключ с экранированными \n
    let privateKey = key;
    if (privateKey.includes("\\n")) {
      privateKey = privateKey.replace(/\\n/g, "\n");
    }
    // Убеждаемся, что ключ начинается правильно
    if (!privateKey.includes("BEGIN PRIVATE KEY")) {
      console.error("[GSC-API] Invalid private key format");
      throw new Error("Invalid private key format");
    }

    // Создаём JWT клиент
    const jwtClient = new google.auth.JWT(
      email,
      null,
      privateKey,
      ["https://www.googleapis.com/auth/webmasters.readonly"]
    );

    // Авторизуемся
    await jwtClient.authorize();
    console.log("[GSC-API] Authenticated successfully");

    // Создаём клиент Search Console API
    const searchConsole = google.searchconsole({
      version: "v1",
      auth: jwtClient,
    });

    // Вычисляем даты (последние N дней)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    console.log(
      `[GSC-API] Fetching data for ${property} from ${startDateStr} to ${endDateStr}`
    );

    // Запрашиваем данные
    const response = await searchConsole.searchanalytics.query({
      siteUrl: property,
      requestBody: {
        startDate: startDateStr,
        endDate: endDateStr,
        dimensions: ["page"],
        rowLimit: 25000, // Максимум для одного запроса
      },
    });

    const rows = response.data.rows || [];
    console.log(`[GSC-API] Fetched ${rows.length} rows`);

    if (rows.length === 0) {
      console.log("[GSC-API] No data found");
      return;
    }

    // Создаём CSV (совместимо с prepare-gsc-csv.js)
    // Формат: url,clicks,impressions,ctr,position
    fs.mkdirSync(path.dirname(OUT_CSV), { recursive: true });

    const csvLines = ["url,clicks,impressions,ctr,position"];

    for (const row of rows) {
      const url = row.keys[0] || "";
      const clicks = row.clicks || 0;
      const impressions = row.impressions || 0;
      const ctr = row.ctr || 0;
      const position = row.position || 0;

      csvLines.push(
        `"${url}",${clicks},${impressions},${(ctr * 100).toFixed(2)},${position.toFixed(1)}`
      );
    }

    fs.writeFileSync(OUT_CSV, csvLines.join("\n"), "utf8");
    console.log(`[GSC-API] Saved ${rows.length} rows to ${OUT_CSV}`);

    // Также сохраняем JSON для отладки
    const jsonOut = path.join(RAW_DIR, "gsc-api-data.json");
    fs.writeFileSync(
      jsonOut,
      JSON.stringify(
        {
          property,
          startDate: startDateStr,
          endDate: endDateStr,
          rowsCount: rows.length,
          fetchedAt: new Date().toISOString(),
          sample: rows.slice(0, 10), // Первые 10 для отладки
        },
        null,
        2
      ),
      "utf8"
    );
    console.log(`[GSC-API] Saved JSON summary to ${jsonOut}`);
  } catch (err) {
    console.error("[GSC-API] Error:", err.message);
    if (err.response) {
      console.error("[GSC-API] Response:", err.response.data);
    }
    throw err;
  }
}

function main() {
  fetchGSCData().catch((err) => {
    console.error("[GSC-API] Fatal error:", err);
    process.exit(1);
  });
}

if (require.main === module) {
  main();
}

module.exports = { fetchGSCData };
