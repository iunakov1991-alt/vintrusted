const { computeRewards } = require("./reward-model");
const {
  deriveABPolicy,
  deriveLinkBoost,
  deriveSitemapPolicy,
  deriveLangPolicy,
} = require("./policy-updater");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const AB_POLICY = path.join(ROOT, "data", "a-b-tests", "policy.json");
const LINK_BOOST = path.join(ROOT, "data", "internal-link-graphs", "boosted.json");
const SITEMAP_POL = path.join(ROOT, "data", "rl", "sitemap-policy.json");
const LANG_POL = path.join(ROOT, "data", "rl", "lang-policy.json");

function ensureDir(p) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function main() {
  console.log("[RL] Training RL policy from behavior + GSC...");
  const rewards = computeRewards();

  const ab = deriveABPolicy(rewards);
  const linkBoost = deriveLinkBoost(rewards);
  const sitemapPolicy = deriveSitemapPolicy(rewards);
  const langPolicy = deriveLangPolicy(rewards);

  ensureDir(AB_POLICY);
  ensureDir(LINK_BOOST);
  ensureDir(SITEMAP_POL);
  ensureDir(LANG_POL);

  fs.writeFileSync(AB_POLICY, JSON.stringify(ab, null, 2), "utf8");
  fs.writeFileSync(LINK_BOOST, JSON.stringify(linkBoost, null, 2), "utf8");
  fs.writeFileSync(
    SITEMAP_POL,
    JSON.stringify(sitemapPolicy, null, 2),
    "utf8"
  );
  fs.writeFileSync(LANG_POL, JSON.stringify(langPolicy, null, 2), "utf8");

  console.log("[RL] RL policies written.");
  console.log(`  A/B: A=${ab.A.toFixed(2)}, B=${ab.B.toFixed(2)}`);
  console.log(`  Sitemap: ${sitemapPolicy.targetFullExposureDays} days, ${sitemapPolicy.minSitemapsPerDay}-${sitemapPolicy.maxSitemapsPerDay} per day`);
  console.log(`  Lang: EN=${langPolicy.en.toFixed(2)}, ES=${langPolicy.es.toFixed(2)}`);
  console.log(`  Boosted links: ${linkBoost.boosted.length}`);
}

if (require.main === module) {
  main();
}

module.exports = { main };






