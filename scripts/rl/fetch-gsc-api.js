// Заготовка под GSC API:
// - Использует сервисный аккаунт (JWT).
// - Секреты берутся из ENV:
//   GSC_CLIENT_EMAIL
//   GSC_PRIVATE_KEY
//   GSC_PROPERTY_URL  (например, "sc-domain:vintrusted.com")
//   GSC_DAYS_BACK     (например, "14")
// - Сохраняет CSV/JSON в data/gsc/raw/data-from-api.json.
//
// ВНИМАНИЕ: тут stub без реального запроса к API, чтобы не ломать билды.
// Подключение реального клиента Google можно сделать позже.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const RAW_DIR = path.join(ROOT, "data", "gsc", "raw");

function main() {
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

  fs.mkdirSync(RAW_DIR, { recursive: true });

  const stub = {
    note:
      "GSC API fetch stub — подключи реальный Google API клиент при необходимости.",
    property,
    days,
    fetchedAt: new Date().toISOString(),
  };

  const out = path.join(RAW_DIR, "gsc-api-stub.json");
  fs.writeFileSync(out, JSON.stringify(stub, null, 2), "utf8");
  console.log("[GSC-API] Stub saved:", out);
}

if (require.main === module) {
  main();
}

module.exports = { main };

