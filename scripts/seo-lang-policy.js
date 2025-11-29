const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const LANG_POLICY_FILE = path.join(ROOT, "data", "rl", "lang-policy.json");

/**
 * Загружает lang-policy.json, если есть.
 * Формат ожидания:
 * {
 *   "en": 0.7,
 *   "es": 0.3,
 *   "enAvgReward": ...,
 *   "esAvgReward": ...
 * }
 */
function loadLangPolicy() {
  try {
    if (!fs.existsSync(LANG_POLICY_FILE)) {
      return { en: 0.7, es: 0.3 };
    }
    const data = JSON.parse(fs.readFileSync(LANG_POLICY_FILE, "utf8"));
    let en = Number(data.en ?? 0.7);
    let es = Number(data.es ?? 0.3);
    if (en < 0) en = 0;
    if (es < 0) es = 0;
    if (en === 0 && es === 0) {
      en = 0.7;
      es = 0.3;
    }
    const sum = en + es;
    return { en: en / sum, es: es / sum };
  } catch {
    return { en: 0.7, es: 0.3 };
  }
}

/**
 * Возвращает "en" или "es" в зависимости от весов в lang-policy.
 */
function chooseLang() {
  const { en, es } = loadLangPolicy();
  const r = Math.random();
  return r < en ? "en" : "es";
}

module.exports = { loadLangPolicy, chooseLang };


