const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const BEHAVIOR_LOG = path.join(ROOT, "data", "behavior-logs", "behavior.log");
const GSC_CSV = path.join(ROOT, "data", "gsc", "gsc-latest.csv");
const OUT_REWARDS = path.join(ROOT, "data", "rl", "url-rewards.json");

// Нормализация в [0..1]
function norm(x, max) {
  if (!max || max <= 0) return 0;
  return Math.min(1, x / max);
}

function loadBehavior() {
  const map = {};
  if (!fs.existsSync(BEHAVIOR_LOG)) return map;
  const lines = fs.readFileSync(BEHAVIOR_LOG, "utf8").trim().split("\n");
  for (const raw of lines) {
    if (!raw.trim()) continue;
    let e;
    try {
      e = JSON.parse(raw);
    } catch {
      continue;
    }
    const url = e.url || e.path || "/";
    if (!map[url]) {
      map[url] = { visits: 0, clicks: 0, scroll: 0, cta: 0, bounce: 0 };
    }
    const m = map[url];
    if (e.type === "visit") m.visits++;
    if (e.type === "click") m.clicks++;
    if (e.type === "scroll") m.scroll++;
    if (e.type === "cta") m.cta++;
    if (e.type === "bounce") m.bounce++;
  }
  return map;
}

// Ожидается CSV вида: url,clicks,impressions,ctr,position
function loadGSC() {
  const map = {};
  if (!fs.existsSync(GSC_CSV)) return map;
  const lines = fs.readFileSync(GSC_CSV, "utf8").trim().split("\n");
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(",");
    if (row.length < 5) continue;
    const url = row[0].trim();
    const clicks = parseFloat(row[1] || "0");
    const impr = parseFloat(row[2] || "0");
    const ctr = parseFloat(row[3] || "0");
    const pos = parseFloat(row[4] || "0");
    map[url] = { clicks, impressions: impr, ctr, position: pos };
  }
  return map;
}

function computeRewards() {
  const behavior = loadBehavior();
  const gsc = loadGSC();

  // Определяем максимумы для нормализации
  let maxVisits = 0,
    maxClicks = 0,
    maxCTA = 0,
    maxScroll = 0,
    maxImpr = 0;
  Object.values(behavior).forEach((m) => {
    if (m.visits > maxVisits) maxVisits = m.visits;
    if (m.clicks > maxClicks) maxClicks = m.clicks;
    if (m.cta > maxCTA) maxCTA = m.cta;
    if (m.scroll > maxScroll) maxScroll = m.scroll;
  });
  Object.values(gsc).forEach((m) => {
    if (m.impressions > maxImpr) maxImpr = m.impressions;
  });

  const result = {};

  const urls = new Set([...Object.keys(behavior), ...Object.keys(gsc)]);

  for (const url of urls) {
    const b = behavior[url] || {
      visits: 0,
      clicks: 0,
      scroll: 0,
      cta: 0,
      bounce: 0,
    };
    const s = gsc[url] || {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    };

    const nVisits = norm(b.visits, maxVisits || 1);
    const nClicks = norm(b.clicks, maxClicks || 1);
    const nCTA = norm(b.cta, maxCTA || 1);
    const nScroll = norm(b.scroll, maxScroll || 1);
    const nImpr = norm(s.impressions, maxImpr || 1);
    const ctr = s.ctr || 0;
    const posScore = s.position
      ? 1 / (1 + Math.max(0, s.position - 1))
      : 0;

    // Поведенческий показатель
    const engagement =
      (nScroll * 0.6 + nClicks * 0.8 + nCTA * 1.5) * (1 + nVisits * 0.3);

    // SEO-показатель
    const seo = (ctr * 0.6 + posScore * 0.4) * (1 + nImpr * 0.2);

    const bouncePenalty =
      b.bounce && b.visits
        ? Math.min(0.5, b.bounce / (b.visits + 1))
        : 0;

    let reward = engagement * 0.55 + seo * 0.55 - bouncePenalty * 0.4;

    if (reward < 0) reward = 0;
    if (reward > 1.5) reward = 1.5;

    result[url] = {
      url,
      reward,
      engagement,
      seo,
      bouncePenalty,
      behavior: b,
      search: s,
    };
  }

  return result;
}

function main() {
  const rewards = computeRewards();
  if (!fs.existsSync(path.dirname(OUT_REWARDS))) {
    fs.mkdirSync(path.dirname(OUT_REWARDS), { recursive: true });
  }
  fs.writeFileSync(OUT_REWARDS, JSON.stringify(rewards, null, 2), "utf8");
  console.log(
    `[RL] url-rewards.json updated. URLs: ${Object.keys(rewards).length}`
  );
}

if (require.main === module) {
  main();
}

module.exports = { computeRewards };























