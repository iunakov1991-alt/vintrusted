const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const REWARDS_FILE = path.join(ROOT, "data", "rl", "url-rewards.json");
const AB_POLICY = path.join(ROOT, "data", "a-b-tests", "policy.json");
const LINK_BOOST = path.join(ROOT, "data", "internal-link-graphs", "boosted.json");
const SITEMAP_POL = path.join(ROOT, "data", "rl", "sitemap-policy.json");
const LANG_POL = path.join(ROOT, "data", "rl", "lang-policy.json");

function loadRewards() {
  if (!fs.existsSync(REWARDS_FILE)) return {};
  return JSON.parse(fs.readFileSync(REWARDS_FILE, "utf8"));
}

function deriveABPolicy(rewards) {
  // Примитив: если средняя награда выше у /vin/ страниц -> больше Template A,
  // если у /dmv/ и fraud -> больше Template B
  let vinSum = 0,
    vinCnt = 0,
    infoSum = 0,
    infoCnt = 0;
  for (const r of Object.values(rewards)) {
    if (!r || typeof r.reward !== "number") continue;
    if (r.url.includes("/vin/") || r.url.includes("/vin-check/")) {
      vinSum += r.reward;
      vinCnt++;
    } else if (
      r.url.includes("/dmv/") ||
      r.url.includes("/fraud/") ||
      r.url.includes("/auctions/")
    ) {
      infoSum += r.reward;
      infoCnt++;
    }
  }
  const vinAvg = vinCnt ? vinSum / vinCnt : 0.5;
  const infoAvg = infoCnt ? infoSum / infoCnt : 0.5;

  let weightA = 0.5;
  let weightB = 0.5;

  if (vinAvg > infoAvg + 0.05) {
    weightA = 0.7;
    weightB = 0.3;
  } else if (infoAvg > vinAvg + 0.05) {
    weightA = 0.3;
    weightB = 0.7;
  }

  return { A: weightA, B: weightB };
}

function deriveLinkBoost(rewards) {
  const arr = Object.values(rewards)
    .filter((r) => r && typeof r.reward === "number")
    .sort((a, b) => b.reward - a.reward);

  const top = arr.slice(0, 200).map((r) => r.url);
  return { boosted: top };
}

function deriveSitemapPolicy(rewards) {
  const total = Object.keys(rewards).length || 100000;
  // Чем выше средняя награда, тем агрессивнее даём скорость
  const rewardsArray = Object.values(rewards).filter(
    (r) => r && typeof r.reward === "number"
  );
  const avg =
    rewardsArray.length > 0
      ? rewardsArray.reduce((s, r) => s + (r.reward || 0), 0) /
        rewardsArray.length
      : 0.4;

  // targetFullExposureDays: при хорошем качестве уменьшаем срок
  let days = 180;
  if (avg > 0.8) days = 90;
  else if (avg > 0.6) days = 120;
  else if (avg < 0.3) days = 240;

  // min/max sitemaps per day
  let minPerDay = 1;
  let maxPerDay = 40;
  if (avg > 0.8) {
    minPerDay = 3;
    maxPerDay = 60;
  } else if (avg > 0.6) {
    minPerDay = 2;
    maxPerDay = 50;
  } else if (avg < 0.3) {
    minPerDay = 1;
    maxPerDay = 20;
  }

  return {
    totalUrlsEstimate: total,
    targetFullExposureDays: days,
    minSitemapsPerDay: minPerDay,
    maxSitemapsPerDay: maxPerDay,
  };
}

function deriveLangPolicy(rewards) {
  let enReward = 0,
    enCnt = 0,
    esReward = 0,
    esCnt = 0;
  for (const r of Object.values(rewards)) {
    if (!r || typeof r.reward !== "number" || !r.url) continue;
    if (r.url.includes("/es/")) {
      esReward += r.reward;
      esCnt++;
    } else {
      enReward += r.reward;
      enCnt++;
    }
  }
  const enAvg = enCnt ? enReward / enCnt : 0.5;
  const esAvg = esCnt ? esReward / esCnt : 0.5;

  let enShare = 0.7; // базовый целевой 70/30
  let esShare = 0.3;

  if (esAvg > enAvg + 0.05) {
    enShare = 0.6;
    esShare = 0.4;
  } else if (enAvg > esAvg + 0.05) {
    enShare = 0.75;
    esShare = 0.25;
  }

  return {
    en: enShare,
    es: esShare,
    enAvgReward: enAvg,
    esAvgReward: esAvg,
  };
}

function ensureDir(p) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function main() {
  const rewards = loadRewards();

  const ab = deriveABPolicy(rewards);
  ensureDir(AB_POLICY);
  fs.writeFileSync(AB_POLICY, JSON.stringify(ab, null, 2), "utf8");
  console.log("[RL] A/B policy updated:", ab);

  const linkBoost = deriveLinkBoost(rewards);
  ensureDir(LINK_BOOST);
  fs.writeFileSync(LINK_BOOST, JSON.stringify(linkBoost, null, 2), "utf8");
  console.log(
    "[RL] Link boost list updated, URLs:",
    linkBoost.boosted.length
  );

  const sitemapPolicy = deriveSitemapPolicy(rewards);
  ensureDir(SITEMAP_POL);
  fs.writeFileSync(
    SITEMAP_POL,
    JSON.stringify(sitemapPolicy, null, 2),
    "utf8"
  );
  console.log("[RL] Sitemap policy updated:", sitemapPolicy);

  const langPolicy = deriveLangPolicy(rewards);
  ensureDir(LANG_POL);
  fs.writeFileSync(LANG_POL, JSON.stringify(langPolicy, null, 2), "utf8");
  console.log("[RL] Lang mix policy updated:", langPolicy);
}

if (require.main === module) {
  main();
}

module.exports = {
  deriveABPolicy,
  deriveLinkBoost,
  deriveSitemapPolicy,
  deriveLangPolicy,
};






















