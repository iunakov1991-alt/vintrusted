const fs = require("fs");
const path = require("path");
const { log } = require("../utils/autonomy-logger");

const ROOT = path.resolve(__dirname, "..", "..");
const LANG_POLICY = path.join(ROOT, "config", "lang-policy.json");

function safeReadPolicy() {
  try {
    return JSON.parse(fs.readFileSync(LANG_POLICY, "utf8"));
  } catch {
    return {
      global: { enShare: 0.7, esShare: 0.3 },
      perStateOverrides: {},
    };
  }
}

function pickLanguageForSeed(seed) {
  // seed: { stateCode, make, model, cluster, ... }
  const policy = safeReadPolicy();
  const global = policy.global || { enShare: 0.7, esShare: 0.3 };
  const overrides = policy.perStateOverrides || {};
  const stateKey = (seed.stateCode || "").toUpperCase();
  const stateOverride = overrides[stateKey];

  let enShare = global.enShare ?? 0.7;
  let esShare = global.esShare ?? 0.3;

  if (stateOverride && typeof stateOverride.enShare === "number") {
    enShare = stateOverride.enShare;
    esShare = 1 - enShare;
  }

  const r = Math.random();
  const lang = r < esShare ? "es" : "en";

  log("LANG-PICK", "info", "Language picked for seed", {
    state: seed.stateCode,
    cluster: seed.cluster,
    make: seed.make,
    model: seed.model,
    lang,
  });

  return lang;
}

module.exports = { pickLanguageForSeed };
























