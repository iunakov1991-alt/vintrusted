#!/bin/bash

set -e

########################################################################
# SEO-MONSTER 4.0 — STATIC VIN PAGES FOR VERCEL PRO (БЕЗ REWRITES, БЕЗ API)
#
# ВАЖНО:
#   - НИЧЕГО не трогать во фронтовых страницах, Stripe, ClearVIN и API.
#   - Работать ТОЛЬКО в:
#       scripts/seo/*
#       data/seo/*
#       public/vin/*
#       public/seo/sitemaps/*
#       public/internal/*
#
#   - Проект уже на Vercel Pro.
#   - Лимиты Vercel Pro:
#       • build time:   <= 45 минут
#       • RAM:          8 GB
#       • Project size: 100 GB
#
#   - Практические ограничения по SEO-билду:
#       •  5k страниц  → 2–4 мин,   ~0.5 GB, риск низкий
#       • 10k страниц  → 5–10 мин,  ~1 GB,   риск средний
#       • 15k страниц  → 10–20 мин, ~1.5–2 GB, средне-высокий
#       • 20k+         → 20–45 мин, ~2–3 GB, не рекомендуется
#
#   - Рекомендуемая конфигурация:
#       • targetPagesPerBuild: 8000–10000
#       • maxPagesPerCluster:  400–500
#       • concurrency:         8–10 (через ENV SEO_BUILD_CONCURRENCY)
#
#   - Мониторинг:
#       • смотреть public/internal/seo-run-summary.json после билда
#
#   - Точки отказа:
#       • build >45 мин  → уменьшить targetPagesPerBuild
#       • RAM >6 GB      → уменьшить concurrency
#       • AI rate limit  → включить кеш (он уже есть), при необходимости снизить concurrency
#
# ДВА ЭТАПА В ОДНОМ СКРИПТЕ:
#
#   STAGE 1 — CORE-МОНСТР 2.x:
#     - logger.js
#     - базовый config + RL + seeds
#     - ai-cache + quality-index (файлы)
#     - seo-ai-client (оптимизированный, без fetch, один read, далее append)
#     - seo-url-factory (план URL с RL-весами)
#     - seo-graph-engine
#     - seo-sitemap-engine (Pro-ready, root integration + JSON metadata)
#     - seo-dashboard
#
#   STAGE 2 — SEO-HARDENED 3.0:
#     - seo-template-engine: layouts A/B/C + canonical + OG/Twitter + FAQ schema
#     - seo-content-engine: богатый контент, AI-блок, internal links, layouts
#     - seo-quality-engine: in-memory scoring + единый writeFile
#     - seo-master-build: конкурентная генерация, RL по accepted, run-summary
#
# ПРЕДПОСЫЛКА (ОБЯЗАТЕЛЬНО):
#   - В package.json будет прописан:
#       "scripts": {
#         "vercel-build": "node scripts/seo/seo-master-build.js && next build"
#       }
#
#   - БОЛЬШЕ НЕТ НИКАКИХ REWRITES:
#       /vin/:vin/:state/ → обслуживается как статика из:
#       public/vin/:vin/:state/index.html
#
#   SEO-MONSTER → пишет HTML в public/vin/...
#   Next build  → поднимает всё из public/* в .vercel/output/static/*
#   Vercel      → отдаёт /vin/... как чистый static HTML, без API и FS в рантайме.
########################################################################

echo "[SEO-MONSTER 4.0] Init (core + SEO-hardening, static /vin) ..."

mkdir -p scripts/seo
mkdir -p data/seo
mkdir -p public/vin
mkdir -p public/seo/sitemaps
mkdir -p public/internal

########################################################################
# 0. Патч package.json: vercel-build = SEO build + next build
########################################################################

if [ -f package.json ]; then
  node << 'EOF'
const fs = require('fs');
const path = require('path');
const pkgPath = path.join(process.cwd(), 'package.json');

let pkg;
try {
  pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
} catch (e) {
  console.error('[SEO PKG] Failed to read package.json:', e.message);
  process.exit(1);
}

if (!pkg.scripts) pkg.scripts = {};

// НЕ трогаем остальные скрипты, только vercel-build
// ВАЖНО: статический сайт, не Next.js, поэтому без next build
pkg.scripts['vercel-build'] = 'node scripts/seo/seo-master-build.js';

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log('[SEO PKG] package.json patched: scripts.vercel-build set.');
EOF
else
  echo "[SEO PKG] WARNING: package.json not found, skip vercel-build patch."
fi

########################################################################
# STAGE 1 — CORE-МОНСТР 2.x (ОСНОВА)
########################################################################

########################################
# 1. logger.js
########################################

cat > scripts/seo/logger.js << 'EOF'
const prefix = (tag) => `[SEO ${tag}]`;

function log(tag, msg) {
  const ts = new Date().toISOString();
  console.log(`${prefix(tag)} ${ts} - ${msg}`);
}

module.exports = { log };
EOF

########################################
# 2. data/seo/config.json — безопасные значения под Vercel Pro
########################################

cat > data/seo/config.json << 'EOF'
{
  "targetPagesPerBuild": 10000,
  "maxPagesPerCluster": 450,
  "minQualityScore": 0.7,
  "enableAI": true,
  "aiMaxTokens": 600,
  "languages": ["en", "es"],
  "defaultLanguage": "en",
  "intents": [
    "vin_check",
    "accident_check",
    "ownership_history",
    "market_value",
    "dmv_records"
  ]
}
EOF

########################################
# 3. data/seo/url-seeds.json — базовые семена
########################################

cat > data/seo/url-seeds.json << 'EOF'
{
  "states": [
    { "code": "ca", "slug": "california" },
    { "code": "tx", "slug": "texas" },
    { "code": "fl", "slug": "florida" },
    { "code": "ny", "slug": "new-york" }
  ],
  "makes": [
    { "slug": "toyota" },
    { "slug": "honda" },
    { "slug": "ford" },
    { "slug": "chevrolet" }
  ],
  "years": [2008, 2012, 2015, 2018, 2020, 2022],
  "vinExamples": [
    "1HGCM82633A004352",
    "4T1BF1FK3FU123456",
    "1FTFW1ET1EFA12345",
    "3FA6P0H73ER123456"
  ]
}
EOF

########################################
# 4. data/seo/rl-state.json — начальное RL-состояние
########################################

cat > data/seo/rl-state.json << 'EOF'
{
  "version": 1,
  "lastUpdated": "1970-01-01T00:00:00.000Z",
  "intentWeights": {
    "vin_check": 0.4,
    "accident_check": 0.25,
    "ownership_history": 0.15,
    "market_value": 0.15,
    "dmv_records": 0.05
  },
  "languageWeights": {
    "en": 0.8,
    "es": 0.2
  },
  "clusterScores": {}
}
EOF

########################################
# 5. Пустые файлы кеша и качества
########################################

: > data/seo/ai-cache.jsonl
: > data/seo/quality-index.jsonl

########################################
# 6. seo-ai-client.js — оптимизированный AI-клиент с Groq и DeepSeek
########################################

cat > scripts/seo/seo-ai-client.js << 'EOF'
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { log } = require('./logger');

const CACHE_PATH = path.join(process.cwd(), 'data/seo/ai-cache.jsonl');
const CONFIG_PATH = path.join(process.cwd(), 'data/seo/config.json');

let inMemoryCache = null;
let configEnableAI = true;

function loadConfigEnableAI() {
  if (!fs.existsSync(CONFIG_PATH)) {
    return true;
  }
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return cfg.enableAI !== false;
  } catch (e) {
    log('AI', `config read error: ${e.message}`);
    return true;
  }
}

function loadCacheOnce() {
  if (inMemoryCache !== null) return inMemoryCache;

  const map = new Map();
  if (!fs.existsSync(CACHE_PATH)) {
    inMemoryCache = map;
    return inMemoryCache;
  }

  try {
    const raw = fs.readFileSync(CACHE_PATH, 'utf8');
    if (!raw) {
      inMemoryCache = map;
      return inMemoryCache;
    }
    const lines = raw.split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (obj.key && obj.text) {
          map.set(obj.key, obj.text);
        }
      } catch (_e) {}
    }
  } catch (e) {
    log('AI', `Cache read error: ${e.message}`);
  }

  inMemoryCache = map;
  return inMemoryCache;
}

function appendCache(key, text) {
  try {
    if (inMemoryCache === null) {
      loadCacheOnce();
    }
    inMemoryCache.set(key, text);
    fs.appendFileSync(CACHE_PATH, JSON.stringify({ key, text }) + '\n');
  } catch (e) {
    log('AI', `Cache write error: ${e.message}`);
  }
}

function hashKey(str) {
  return crypto.createHash('sha1').update(str).digest('hex');
}

async function callGroqAPI(prompt, { lang, intent, maxTokens }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an SEO content generator for a VIN history report website. You must NOT fabricate specific accident dates, owners, odometer values or any personal data. Write safe, generic, non-personalized explanations only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens || 600,
        temperature: 0.4
      })
    });

    if (!response.ok) {
      log('AI', `Groq API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || null;
    if (!text) {
      log('AI', 'No text in Groq response');
      return null;
    }
    return text.trim();
  } catch (e) {
    log('AI', `Groq request error: ${e.message}`);
    return null;
  }
}

async function callDeepSeekAPI(prompt, { lang, intent, maxTokens }) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  const url = 'https://api.deepseek.com/v1/chat/completions';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an SEO content generator for a VIN history report website. You must NOT fabricate specific accident dates, owners, odometer values or any personal data. Write safe, generic, non-personalized explanations only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens || 600,
        temperature: 0.4
      })
    });

    if (!response.ok) {
      log('AI', `DeepSeek API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || null;
    if (!text) {
      log('AI', 'No text in DeepSeek response');
      return null;
    }
    return text.trim();
  } catch (e) {
    log('AI', `DeepSeek request error: ${e.message}`);
    return null;
  }
}

async function callAiProvider(prompt, { lang, intent, maxTokens }) {
  // Сначала пробуем Groq (быстрый)
  let text = await callGroqAPI(prompt, { lang, intent, maxTokens });
  if (!text) {
    // Если Groq не сработал, пробуем DeepSeek (fallback)
    log('AI', 'Groq failed, trying DeepSeek...');
    text = await callDeepSeekAPI(prompt, { lang, intent, maxTokens });
  }
  return text;
}

async function generateText(prompt, { lang = 'en', intent = 'generic', maxTokens = 600 } = {}) {
  if (inMemoryCache === null) {
    loadCacheOnce();
    configEnableAI = loadConfigEnableAI();
  }

  const key = hashKey(`${lang}|${intent}|${prompt}`);
  if (inMemoryCache.has(key)) {
    return inMemoryCache.get(key);
  }

  const envEnable =
    process.env.SEO_ENABLE_AI === '1' ||
    process.env.SEO_ENABLE_AI === 'true' ||
    process.env.SEO_ENABLE_AI === 'on';
  const hasApiKeys = !!(process.env.GROQ_API_KEY || process.env.DEEPSEEK_API_KEY);
  const effectiveAI = configEnableAI && envEnable && hasApiKeys;

  if (!effectiveAI) {
    const fallback = `This section provides general, non-personalized information about ${intent} in the context of vehicle history reports. It explains why this check matters, what is usually included, and how drivers can use this information to make safer decisions when buying or owning a vehicle in the ${lang.toUpperCase()} locale. No specific VIN data is inferred or fabricated.`;
    appendCache(key, fallback);
    return fallback;
  }

  let text = await callAiProvider(prompt, { lang, intent, maxTokens });
  if (!text) {
    const fallback = `This section provides general, non-personalized information about ${intent} in the context of vehicle history reports. It explains why this check matters, what is usually included, and how drivers can use this information to make safer decisions when buying or owning a vehicle in the ${lang.toUpperCase()} locale. No specific VIN data is inferred or fabricated.`;
    text = fallback;
  }
  appendCache(key, text);
  return text;
}

module.exports = { generateText };
EOF

########################################
# 7. seo-url-factory.js — планировщик URL с RL-весами
########################################

cat > scripts/seo/seo-url-factory.js << 'EOF'
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function buildClusterId({ type, stateSlug, makeSlug }) {
  return `${type}_${stateSlug}_${makeSlug}`;
}

function normalizeWeights(obj) {
  const entries = Object.entries(obj || {});
  const sum = entries.reduce((acc, [, v]) => acc + v, 0);
  if (!sum) return obj;
  const res = {};
  for (const [k, v] of entries) res[k] = v / sum;
  return res;
}

function buildUrlPlan(config, rlState) {
  const seedsPath = path.join(process.cwd(), 'data/seo/url-seeds.json');
  const seeds = loadJson(seedsPath);

  const intents = config.intents || [];
  const states = seeds.states || [];
  const makes = seeds.makes || [];
  const years = seeds.years || [];
  const vins = seeds.vinExamples || [];

  const intentWeights = normalizeWeights(rlState.intentWeights || {});
  const langWeights = normalizeWeights(rlState.languageWeights || {});

  const clusterScores = rlState.clusterScores || {};

  const pages = [];
  let vinIndex = 0;

  for (const state of states) {
    for (const make of makes) {
      for (const year of years) {
        for (const intent of intents) {
          for (const lang of config.languages || ['en']) {
            const vin = vins.length ? vins[vinIndex % vins.length] : '1HGCM82633A004352';
            vinIndex++;

            const clusterId = buildClusterId({ type: 'vin', stateSlug: state.slug, makeSlug: make.slug });

            let basePriority = 1.0;
            const iWeight = intentWeights[intent] ?? 0.2;
            const lWeight = langWeights[lang] ?? 0.2;
            const cWeight = clusterScores[clusterId] ?? 1.0;

            const priority = basePriority * (0.5 + iWeight) * (0.5 + lWeight) * (0.5 + cWeight);

            const url = `/vin/${vin}/${state.slug}/`;

            pages.push({
              url,
              lang,
              intent,
              clusterId,
              template: 'vin-report',
              stateSlug: state.slug,
              stateCode: state.code,
              make: make.slug,
              year,
              vin,
              priority
            });
          }
        }
      }
    }
  }

  pages.sort((a, b) => b.priority - a.priority);

  const perCluster = {};
  const result = [];
  for (const p of pages) {
    const count = perCluster[p.clusterId] || 0;
    if (count >= (config.maxPagesPerCluster || 450)) continue;
    perCluster[p.clusterId] = count + 1;
    result.push(p);
    if (result.length >= (config.targetPagesPerBuild || 10000)) break;
  }

  log('URL', `Planned pages: ${result.length}`);
  return result;
}

module.exports = { buildUrlPlan };
EOF

########################################
# 8. seo-rl-engine.js — RL-политика
########################################

cat > scripts/seo/seo-rl-engine.js << 'EOF'
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');

const RL_PATH = path.join(process.cwd(), 'data/seo/rl-state.json');

function loadRlState() {
  if (!fs.existsSync(RL_PATH)) {
    return {
      version: 1,
      lastUpdated: new Date().toISOString(),
      intentWeights: {},
      languageWeights: {},
      clusterScores: {}
    };
  }
  return JSON.parse(fs.readFileSync(RL_PATH, 'utf8'));
}

function saveRlState(state) {
  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(RL_PATH, JSON.stringify(state, null, 2));
  log('RL', 'RL state updated');
}

function updateRlState(prevState, scoredPages) {
  const state = { ...prevState };
  const byIntent = {};
  const byCluster = {};

  for (const p of scoredPages) {
    if (!byIntent[p.intent]) byIntent[p.intent] = { scoreSum: 0, count: 0 };
    byIntent[p.intent].scoreSum += p.qualityScore || 0;
    byIntent[p.intent].count++;

    if (!byCluster[p.clusterId]) byCluster[p.clusterId] = { scoreSum: 0, count: 0 };
    byCluster[p.clusterId].scoreSum += p.qualityScore || 0;
    byCluster[p.clusterId].count++;
  }

  const iw = { ...(state.intentWeights || {}) };
  for (const intent of Object.keys(byIntent)) {
    const avg = byIntent[intent].scoreSum / byIntent[intent].count;
    const curr = iw[intent] ?? 0.2;
    let next = curr;
    if (avg > 0.8) next = curr + 0.02;
    else if (avg < 0.6) next = curr - 0.02;
    iw[intent] = Math.min(0.6, Math.max(0.1, next));
  }
  state.intentWeights = iw;

  const cs = { ...(state.clusterScores || {}) };
  for (const clusterId of Object.keys(byCluster)) {
    const avg = byCluster[clusterId].scoreSum / byCluster[clusterId].count;
    const curr = cs[clusterId] ?? 1.0;
    let next = curr;
    if (avg > 0.85) next = curr + 0.05;
    else if (avg < 0.55) next = curr - 0.05;
    cs[clusterId] = Math.min(2.0, Math.max(0.2, next));
  }
  state.clusterScores = cs;

  return state;
}

module.exports = { loadRlState, saveRlState, updateRlState };
EOF

########################################
# 9. seo-graph-engine.js — граф для анализа
########################################

cat > scripts/seo/seo-graph-engine.js << 'EOF'
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');

const GRAPH_PATH = path.join(process.cwd(), 'data/seo/graph.json');

function buildGraph(pages) {
  const nodes = pages.map((p) => ({ url: p.url, cluster: p.clusterId }));
  const edges = [];

  const byCluster = {};
  for (const p of pages) {
    if (!byCluster[p.clusterId]) byCluster[p.clusterId] = [];
    byCluster[p.clusterId].push(p);
  }

  for (const clusterId of Object.keys(byCluster)) {
    const arr = byCluster[clusterId];
    for (let i = 0; i < arr.length - 1; i++) {
      edges.push({ from: arr[i].url, to: arr[i + 1].url });
    }
  }

  const graph = { nodes, edges };
  fs.writeFileSync(GRAPH_PATH, JSON.stringify(graph, null, 2));
  log('GRAPH', `Graph saved: nodes=${nodes.length}, edges=${edges.length}`);
}

module.exports = { buildGraph };
EOF

########################################
# 10. seo-sitemap-engine.js — Pro-версия + root sitemap + JSON metadata
########################################

cat > scripts/seo/seo-sitemap-engine.js << 'EOF'
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');

const SITEMAP_ROOT = path.join(process.cwd(), 'public/seo/sitemaps');
const PUBLIC_ROOT = path.join(process.cwd(), 'public');
const INTERNAL_ROOT = path.join(process.cwd(), 'public/internal');

function chunk(arr, n) {
  const res = [];
  for (let i = 0; i < arr.length; i += n) res.push(arr.slice(i, i + n));
  return res;
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function writeSitemaps(pages, config) {
  ensureDir(SITEMAP_ROOT);

  // Чистим только свои XML
  const existing = fs.readdirSync(SITEMAP_ROOT);
  for (const f of existing) {
    if (f.endsWith('.xml')) {
      fs.unlinkSync(path.join(SITEMAP_ROOT, f));
    }
  }

  const byLang = {};
  for (const p of pages) {
    if (!byLang[p.lang]) byLang[p.lang] = [];
    byLang[p.lang].push(p);
  }

  const indexEntries = [];
  const maxPerFile = 20000; // безопасно под Pro

  for (const lang of Object.keys(byLang)) {
    const list = byLang[lang];
    const chunksArr = chunk(list, maxPerFile);

    chunksArr.forEach((chunkPages, idx) => {
      const part = idx + 1;
      const fileName = `sitemap-${lang}-${part}.xml`;
      const locs = chunkPages
        .map((p) => `<url><loc>https://vintrusted.com${p.url}</loc></url>`)
        .join('');
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${locs}
</urlset>`;
      fs.writeFileSync(path.join(SITEMAP_ROOT, fileName), xml, 'utf8');
      indexEntries.push({ lang, fileName });
    });

    const indexName = `sitemap-${lang}-index.xml`;
    const entries = indexEntries
      .filter((e) => e.lang === lang)
      .map(
        (e) =>
          `<sitemap><loc>https://vintrusted.com/seo/sitemaps/${e.fileName}</loc></sitemap>`
      )
      .join('');
    const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;
    fs.writeFileSync(path.join(SITEMAP_ROOT, indexName), indexXml, 'utf8');
  }

  // Глобальный индекс внутри public/seo/sitemaps
  const globalIndexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexEntries
  .map(
    (e) =>
      `<sitemap><loc>https://vintrusted.com/seo/sitemaps/${e.fileName}</loc></sitemap>`
  )
  .join('')}
</sitemapindex>`;
  const seoIndexPath = path.join(SITEMAP_ROOT, 'sitemap-seo.xml');
  fs.writeFileSync(seoIndexPath, globalIndexXml, 'utf8');

  log(
    'SITEMAP',
    `Sitemaps written for ${Object.keys(byLang).length} languages. Total files (incl. index): ${
      indexEntries.length + 1
    }`
  );

  integrateWithRootSitemap(seoIndexPath);

  // JSON метаданные для /sitemaps
  writeSitemapMetadata(indexEntries, byLang, pages.length);
}

function integrateWithRootSitemap(seoIndexPath) {
  ensureDir(PUBLIC_ROOT);

  const monsterPath = path.join(PUBLIC_ROOT, 'sitemap-seo-monster.xml');
  try {
    fs.copyFileSync(seoIndexPath, monsterPath);
    log('SITEMAP', 'Root sitemap-seo-monster.xml updated.');
  } catch (e) {
    log('SITEMAP', `copy monster sitemap error: ${e.message}`);
  }

  const rootSitemapPath = path.join(PUBLIC_ROOT, 'sitemap.xml');
  if (!fs.existsSync(rootSitemapPath)) {
    return;
  }

  try {
    let content = fs.readFileSync(rootSitemapPath, 'utf8');

    if (!content.includes('<sitemapindex')) {
      return;
    }

    const targetLoc = 'https://vintrusted.com/seo/sitemaps/sitemap-seo.xml';

    if (content.includes(targetLoc)) {
      return;
    }

    const insert = `<sitemap><loc>${targetLoc}</loc></sitemap>`;
    if (content.includes('</sitemapindex>')) {
      content = content.replace('</sitemapindex>', `${insert}\n</sitemapindex>`);
      fs.writeFileSync(rootSitemapPath, content, 'utf8');
      log('SITEMAP', 'Root sitemap.xml patched with SEO index link.');
    }
  } catch (e) {
    log('SITEMAP', `root sitemap integration error: ${e.message}`);
  }
}

function writeSitemapMetadata(indexEntries, byLang, totalPages) {
  try {
    ensureDir(INTERNAL_ROOT);

    const languages = Object.keys(byLang);
    const totalSitemapFiles = indexEntries.length + 1; // +1 за sitemap-seo.xml

    const byLanguage = {};
    for (const lang of languages) {
      const langEntries = indexEntries.filter((e) => e.lang === lang);
      const sitemapFiles = langEntries.map((e) => ({
        fileName: e.fileName,
        url: `/seo/sitemaps/${e.fileName}`
      }));
      const indexFileName = `sitemap-${lang}-index.xml`;
      byLanguage[lang] = {
        sitemapFiles,
        indexFile: {
          fileName: indexFileName,
          url: `/seo/sitemaps/${indexFileName}`
        },
        pagesCount: (byLang[lang] || []).length
      };
    }

    const allSitemapFiles = indexEntries.map((e) => ({
      lang: e.lang,
      fileName: e.fileName,
      url: `/seo/sitemaps/${e.fileName}`
    }));

    const payload = {
      lastUpdated: new Date().toISOString(),
      totalPages,
      totalSitemapFiles,
      languages,
      mainIndex: {
        fileName: 'sitemap-seo.xml',
        url: '/seo/sitemaps/sitemap-seo.xml'
      },
      alternativeIndex: {
        fileName: 'sitemap-seo-monster.xml',
        url: '/sitemap-seo-monster.xml'
      },
      byLanguage,
      allSitemapFiles
    };

    const outPath = path.join(INTERNAL_ROOT, 'sitemaps-metadata.json');
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
    log('SITEMAP', 'sitemaps-metadata.json updated.');
  } catch (e) {
    log('SITEMAP', `sitemaps-metadata write error: ${e.message}`);
  }
}

module.exports = { writeSitemaps };
EOF

########################################
# 11. seo-dashboard.js — простой дашборд
########################################

cat > scripts/seo/seo-dashboard.js << 'EOF'
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');

function writeDashboard(buildMeta, pages, acceptedPages) {
  const dataPath = path.join(process.cwd(), 'public/internal/seo-dashboard-data.json');
  const htmlPath = path.join(process.cwd(), 'public/internal/seo-dashboard.html');

  const avgQuality =
    acceptedPages.reduce((acc, p) => acc + (p.qualityScore || 0), 0) /
      Math.max(acceptedPages.length, 1) || 0;

  const byIntent = {};
  for (const p of acceptedPages) {
    if (!byIntent[p.intent]) byIntent[p.intent] = { scoreSum: 0, count: 0 };
    byIntent[p.intent].scoreSum += p.qualityScore || 0;
    byIntent[p.intent].count++;
  }
  const intentStats = {};
  for (const k of Object.keys(byIntent)) {
    intentStats[k] = {
      count: byIntent[k].count,
      avgQuality: byIntent[k].scoreSum / byIntent[k].count
    };
  }

  const payload = {
    buildId: buildMeta.buildId,
    startedAt: buildMeta.startedAt,
    finishedAt: buildMeta.finishedAt,
    pagesPlanned: pages.length,
    pagesAccepted: acceptedPages.length,
    avgQuality,
    intentStats
  };

  fs.writeFileSync(dataPath, JSON.stringify(payload, null, 2));

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>SEO Dashboard</title></head>
<body>
<h1>SEO Dashboard</h1>
<pre id="data"></pre>
<script>
fetch('./seo-dashboard-data.json').then(r => r.json()).then(d => {
  document.getElementById('data').textContent = JSON.stringify(d, null, 2);
});
</script>
</body></html>`;
  fs.writeFileSync(htmlPath, html, 'utf8');
  log('DASH', 'Dashboard updated');
}

module.exports = { writeDashboard };
EOF

########################################################################
# STAGE 2 — SEO-HARDENED 3.0 (LAYOUTS, QUALITY, MASTER BUILD)
########################################################################

########################################
# 12. seo-template-engine.js — layouts A/B/C + canonical + OG/Twitter + FAQ schema
########################################

cat > scripts/seo/seo-template-engine.js << 'EOF'
const escapeHtml = (str = '') =>
  str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

function buildFaqSchema(url, faq) {
  if (!faq || !faq.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faq.map(q => ({
      "@type": "Question",
      "name": q.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": q.a
      }
    })),
    "url": `https://vintrusted.com${url}`
  };
}

function buildBaseSchema({ url, title, description }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "url": `https://vintrusted.com${url}`,
    "name": title,
    "description": description
  };
}

function renderSchema({ url, title, description, faq }) {
  const base = buildBaseSchema({ url, title, description });
  const faqSchema = buildFaqSchema(url, faq);
  const payload = faqSchema ? [base, faqSchema] : base;
  return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`;
}

function renderKeyFacts(ctx) {
  const items = ctx.keyFacts || [
    `Covers title, ownership, odometer and basic accident history for this VIN.`,
    `Uses multiple data sources (DMV, auctions, insurance records where available).`,
    `Helps you avoid overpaying for vehicles with hidden issues in ${ctx.stateLabel || 'your state'}.`
  ];
  return `
  <section class="key-facts">
    <h2>Key facts at a glance</h2>
    <ul>
      ${items.map(i => `<li>${escapeHtml(i)}</li>`).join('')}
    </ul>
  </section>`;
}

function renderLocalInsights(ctx) {
  const stateLabel = ctx.stateLabel || 'your state';
  return `
  <section class="local-insights">
    <h2>Why VIN checks matter in ${escapeHtml(stateLabel)}</h2>
    <p>
      Vehicle title and registration rules in ${escapeHtml(stateLabel)} can affect
      how salvage, rebuilt and branded titles are recorded. A detailed VIN report
      helps you understand how many owners the vehicle had, how often it was registered,
      and whether it ever appeared at auctions or insurance events in ${escapeHtml(
        stateLabel
      )}.
    </p>
  </section>`;
}

function renderComparisonBlock() {
  return `
  <section class="free-vs-paid">
    <h2>Free VIN check vs full paid report</h2>
    <ul>
      <li><strong>Free VIN check:</strong> basic format validation and limited open data; often no detailed history.</li>
      <li><strong>Full report:</strong> aggregated data from DMVs, insurance and auctions where available, with clearer risk signals.</li>
      <li><strong>Best practice:</strong> use a full report before paying a deposit or signing a bill of sale.</li>
    </ul>
  </section>`;
}

function renderFeatureTable() {
  return `
  <section class="feature-table">
    <h2>What this VIN report can show</h2>
    <table>
      <thead>
        <tr>
          <th>Check type</th>
          <th>What you see</th>
          <th>Why it matters</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Title &amp; ownership</td>
          <td>Number of owners, title transfers, possible title brands.</td>
          <td>Helps detect frequently flipped or branded vehicles.</td>
        </tr>
        <tr>
          <td>Accident &amp; damage</td>
          <td>Reported collisions, total loss events, auction announcements.</td>
          <td>Shows history of serious incidents that may affect safety.</td>
        </tr>
        <tr>
          <td>Odometer readings</td>
          <td>Mileage recorded at inspections, registrations and sales.</td>
          <td>Helps reveal unrealistic jumps or rollbacks.</td>
        </tr>
        <tr>
          <td>Usage patterns</td>
          <td>Private, commercial or fleet use where available.</td>
          <td>Explains why some vehicles have higher wear.</td>
        </tr>
      </tbody>
    </table>
  </section>`;
}

function renderFaq(faq) {
  if (!faq || !faq.length) return '';
  return `
  <section class="faq">
    <h2>FAQ</h2>
    ${faq
      .map(
        (q) =>
          `<div class="faq-item"><h3>${escapeHtml(q.q)}</h3><p>${escapeHtml(
            q.a
          )}</p></div>`
      )
      .join('')}
  </section>`;
}

function renderInternalLinks(links) {
  if (!links || !links.length) return '';
  return `
  <nav class="internal-links">
    <h2>Related VIN checks</h2>
    <ul>
      ${links
        .map((l) => `<li><a href="${l.href}">${escapeHtml(l.label)}</a></li>`)
        .join('')}
    </ul>
  </nav>`;
}

function renderBody(layout, ctx) {
  const keyFacts = renderKeyFacts(ctx);
  const localInsights = renderLocalInsights(ctx);
  const comparison = renderComparisonBlock(ctx);
  const table = renderFeatureTable(ctx);
  const faqHtml = renderFaq(ctx.faq);
  const linksHtml = renderInternalLinks(ctx.internalLinks);
  const aiBlock = ctx.aiSectionHtml || '';

  if (layout === 'B') {
    return `
    <main>
      <header>
        <h1>${escapeHtml(ctx.h1 || ctx.title)}</h1>
        <p class="intro">${escapeHtml(ctx.intro || '')}</p>
      </header>
      ${keyFacts}
      ${aiBlock}
      ${comparison}
      ${table}
      ${localInsights}
      ${faqHtml}
      ${linksHtml}
      <section class="cta">
        <a href="/checkout" class="btn-primary">Check this VIN now</a>
      </section>
    </main>`;
  }

  if (layout === 'C') {
    return `
    <main>
      <header>
        <h1>${escapeHtml(ctx.h1 || ctx.title)}</h1>
        <p class="intro">${escapeHtml(ctx.intro || '')}</p>
      </header>
      ${localInsights}
      ${keyFacts}
      ${table}
      ${aiBlock}
      ${faqHtml}
      ${comparison}
      ${linksHtml}
      <section class="cta">
        <a href="/checkout" class="btn-primary">Run full VIN report</a>
      </section>
    </main>`;
  }

  // Layout A — базовый
  return `
  <main>
    <header>
      <h1>${escapeHtml(ctx.h1 || ctx.title)}</h1>
      <p class="intro">${escapeHtml(ctx.intro || '')}</p>
    </header>
    ${keyFacts}
    ${localInsights}
    ${aiBlock}
    ${table}
    ${comparison}
    ${faqHtml}
    ${linksHtml}
    <section class="cta">
      <a href="/checkout" class="btn-primary">Check this VIN now</a>
    </section>
  </main>`;
}

function renderPage(templateName, ctx) {
  const lang = ctx.lang || 'en';
  const title = ctx.title || 'VIN report';
  const description = ctx.description || '';
  const url = ctx.url || '/';
  const canonicalUrl = ctx.canonicalUrl || url;
  const layout = ctx.layout || 'A';

  const schema = renderSchema({ url, title, description, faq: ctx.faq || [] });
  const body = renderBody(layout, ctx);

  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <link rel="canonical" href="https://vintrusted.com${canonicalUrl}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="https://vintrusted.com${url}" />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  ${schema}
</head>
<body>
  ${body}
</body>
</html>`;
}

module.exports = { renderPage };
EOF

########################################
# 13. seo-content-engine.js — богатый контент + layouts + internal links
########################################

cat > scripts/seo/seo-content-engine.js << 'EOF'
const path = require('path');
const fs = require('fs');
const { generateText } = require('./seo-ai-client');
const { renderPage } = require('./seo-template-engine');
const { log } = require('./logger');

function safeUpper(str) {
  return (str || '').toString().toUpperCase();
}

function humanizeStateSlug(slug) {
  if (!slug) return 'your state';
  const s = slug.replace(/-/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildTitle(item) {
  const state = humanizeStateSlug(item.stateSlug);
  const make = safeUpper(item.make);
  return `VIN Check for ${item.year} ${make} in ${state} – Full Report`;
}

function buildDescription(item) {
  const state = humanizeStateSlug(item.stateSlug);
  const make = safeUpper(item.make);
  return `Instant VIN check for ${item.year} ${make} in ${state}. Review ownership, accident and title history before you buy.`;
}

// ВАЖНО: пишем прямо в public/vin/:vin/:state/index.html,
// чтобы /vin/... обслуживалось как статика без rewrite.
function getOutputPath(item) {
  const root = path.join(process.cwd(), 'public');
  const vinDir = path.join(root, 'vin', item.vin || 'vin', item.stateSlug || 'state');
  return path.join(vinDir, 'index.html');
}

function chooseLayout(item) {
  const layouts = ['A', 'B', 'C'];
  const base = `${item.vin || ''}|${item.stateSlug || ''}|${item.intent || ''}|${item.lang || ''}`;
  let h = 0;
  for (let i = 0; i < base.length; i++) {
    h = (h * 31 + base.charCodeAt(i)) >>> 0;
  }
  return layouts[h % layouts.length];
}

async function buildPageContent(item, config) {
  const title = buildTitle(item);
  const description = buildDescription(item);
  const stateLabel = humanizeStateSlug(item.stateSlug);
  const h1 = `VIN report for ${item.year} ${safeUpper(item.make)} in ${stateLabel}`;

  const intro = `This page explains how to read a VIN report for a ${item.year} ${safeUpper(
    item.make
  )} registered in ${stateLabel}, and why a detailed history check is important before you commit to a purchase.`;

  const aiText = await generateText(
    `Write a detailed but generic explanation (no fabricated records, no specific accidents) about "${item.intent}" for a vehicle VIN report in ${stateLabel}. Focus on why this check matters, what buyers should pay attention to, and how it fits into a full history report.`,
    { lang: item.lang, intent: item.intent, maxTokens: config.aiMaxTokens || 600 }
  );

  const aiSectionHtml = `
  <section class="ai-section">
    <h2>How this ${item.intent.replace('_', ' ')} check fits into the full report</h2>
    <p>${aiText}</p>
  </section>`;

  const faq = [
    {
      q: 'What is a VIN check?',
      a: 'A VIN check is a report built from multiple data sources that helps you understand the history of a specific vehicle before you buy or insure it.'
    },
    {
      q: 'Does this report show every accident?',
      a: 'Reports usually show incidents reported to insurance, DMVs or auctions, but not every minor event is guaranteed to appear.'
    },
    {
      q: 'Can I use a VIN report to negotiate price?',
      a: 'Yes. A clear report often supports the asking price, while issues like prior accidents, salvage history or odometer concerns are strong arguments for a discount.'
    }
  ];

  const layout = chooseLayout(item);

  const pageCtx = {
    url: item.url,
    canonicalUrl: item.url,
    lang: item.lang,
    title,
    description,
    h1,
    intro,
    aiSectionHtml,
    faq,
    internalLinks: item.internalLinks || [],
    stateLabel,
    layout
  };

  const html = renderPage(item.template, pageCtx);
  const outputPath = getOutputPath(item);

  const dir = path.dirname(outputPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, html, 'utf8');

  log('CONTENT', `Written page: ${outputPath}`);

  return {
    ...item,
    outputPath,
    html,
    meta: { title, description, h1 }
  };
}

module.exports = { buildPageContent };
EOF

########################################
# 14. seo-quality-engine.js — in-memory scoring + единый writeFile
########################################

cat > scripts/seo/seo-quality-engine.js << 'EOF'
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');

const QUALITY_PATH = path.join(process.cwd(), 'data/seo/quality-index.jsonl');

function resetQualityIndex() {
  try {
    if (fs.existsSync(QUALITY_PATH)) {
      fs.unlinkSync(QUALITY_PATH);
    }
    fs.writeFileSync(QUALITY_PATH, '');
    log('QUALITY', 'quality-index.jsonl reset');
  } catch (e) {
    log('QUALITY', `reset error: ${e.message}`);
  }
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function scorePage(pageDoc, config) {
  const html = pageDoc.html || '';
  const text = stripHtml(html);
  const len = text.length;
  const lenScore = Math.max(0, Math.min(1, len / 4000)); // ~4k символов = 1.0

  const hasH2 = /<h2[^>]*>/i.test(html);
  const hasH3 = /<h3[^>]*>/i.test(html);
  const headingScore = (hasH2 ? 0.6 : 0) + (hasH3 ? 0.4 : 0);

  const keyWords = [];
  if (pageDoc.vin) keyWords.push(pageDoc.vin);
  if (pageDoc.stateSlug) keyWords.push(pageDoc.stateSlug);
  if (pageDoc.make) keyWords.push(pageDoc.make);

  let kwHits = 0;
  for (const k of keyWords) {
    if (k && text.toLowerCase().includes(k.toLowerCase())) kwHits++;
  }
  const keywordScore = Math.min(1, kwHits / Math.max(keyWords.length, 1));

  const hasFaq = /class="faq"/i.test(html);
  const hasCta = /class="cta"/i.test(html);
  const hasKeyFacts = /class="key-facts"/i.test(html);
  const hasLocal = /class="local-insights"/i.test(html);
  const structureScore =
    (hasFaq ? 0.2 : 0) +
    (hasCta ? 0.2 : 0) +
    (hasKeyFacts ? 0.3 : 0) +
    (hasLocal ? 0.3 : 0);

  const score =
    0.25 * lenScore +
    0.25 * headingScore +
    0.25 * keywordScore +
    0.25 * structureScore;

  const scored = {
    ...pageDoc,
    qualityScore: score
  };

  const rec = {
    url: pageDoc.url,
    score,
    cluster: pageDoc.clusterId,
    lang: pageDoc.lang,
    intent: pageDoc.intent
  };

  return { scored, rec };
}

function writeQualityIndex(records) {
  try {
    const lines =
      records.map((r) => JSON.stringify(r)).join('\n') +
      (records.length ? '\n' : '');
    fs.writeFileSync(QUALITY_PATH, lines, 'utf8');
    log('QUALITY', `quality-index.jsonl written, records=${records.length}`);
  } catch (e) {
    log('QUALITY', `write error: ${e.message}`);
  }
}

module.exports = { scorePage, resetQualityIndex, writeQualityIndex };
EOF

########################################
# 15. seo-master-build.js — конкурентный билд + RL по accepted + run summary
########################################

cat > scripts/seo/seo-master-build.js << 'EOF'
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');
const { buildUrlPlan } = require('./seo-url-factory');
const { buildPageContent } = require('./seo-content-engine');
const { scorePage, resetQualityIndex, writeQualityIndex } = require('./seo-quality-engine');
const { loadRlState, saveRlState, updateRlState } = require('./seo-rl-engine');
const { buildGraph } = require('./seo-graph-engine');
const { writeSitemaps } = require('./seo-sitemap-engine');
const { writeDashboard } = require('./seo-dashboard');

const isVercel = !!(process.env.VERCEL || process.env.VERCEL_ENV);
const BUILD_META_PATH = path.join(process.cwd(), 'public/internal/build-meta.json');
const RUN_SUMMARY_PATH = path.join(process.cwd(), 'public/internal/seo-run-summary.json');

const DEFAULT_CONCURRENCY = parseInt(process.env.SEO_BUILD_CONCURRENCY || '8', 10);

function safeLoadJson(p, fallback) {
  try {
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    log('MASTER', `JSON load error at ${p}: ${e.message}`);
    return fallback;
  }
}

function attachInternalLinks(plan) {
  const byCluster = {};
  plan.forEach((item, index) => {
    if (!byCluster[item.clusterId]) byCluster[item.clusterId] = [];
    byCluster[item.clusterId].push({ index, item });
  });

  for (const clusterId of Object.keys(byCluster)) {
    const arr = byCluster[clusterId];
    for (let i = 0; i < arr.length; i++) {
      const current = arr[i].item;
      const neighborsIdx = [i - 1, i + 1, i + 2].filter(
        (j) => j >= 0 && j < arr.length
      );
      const links = [];
      const used = new Set();
      for (const ni of neighborsIdx) {
        const neighbor = arr[ni].item;
        if (!neighbor || neighbor.url === current.url) continue;
        if (used.has(neighbor.url)) continue;
        used.add(neighbor.url);
        const stateSlug = neighbor.stateSlug || '';
        const stateLabel = stateSlug
          ? stateSlug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())
          : 'your state';
        const label = `${neighbor.year} ${String(neighbor.make || '').toUpperCase()} VIN check in ${stateLabel}`;
        links.push({ href: neighbor.url, label });
        if (links.length >= 3) break;
      }
      current.internalLinks = links;
    }
  }
}

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;
  const actualLimit = Math.max(1, Math.min(limit, items.length || 1));

  async function workerLoop() {
    while (true) {
      const i = index++;
      if (i >= items.length) break;
      const item = items[i];
      try {
        results[i] = await worker(item, i);
      } catch (e) {
        console.error(e);
        results[i] = null;
      }
    }
  }

  const workers = [];
  for (let i = 0; i < actualLimit; i++) {
    workers.push(workerLoop());
  }
  await Promise.all(workers);
  return results.filter(Boolean);
}

async function main() {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  let buildMeta = {
    buildId: startedAt.replace(/[:.]/g, '-'),
    startedAt,
    finishedAt: null
  };

  // На Vercel удаляем старый build-meta.json, чтобы гарантировать выполнение build
  if (isVercel && fs.existsSync(BUILD_META_PATH)) {
    try {
      const existingMeta = safeLoadJson(BUILD_META_PATH, {});
      const existingBuildId = existingMeta.buildId;
      const currentBuildId = buildMeta.buildId;
      
      // Если buildId совпадает и build завершен - это тот же деплой, пропускаем
      if (existingBuildId === currentBuildId && existingMeta.finishedAt) {
        log('MASTER', 'SEO build already completed in this deployment, skipping.');
        process.exit(0);
      }
      
      // Иначе - новый деплой, удаляем старый файл и продолжаем
      log('MASTER', 'New deployment detected, removing old build meta and continuing...');
      fs.unlinkSync(BUILD_META_PATH);
    } catch (e) {
      log('MASTER', `Error reading build meta: ${e.message}, removing and continuing...`);
      if (fs.existsSync(BUILD_META_PATH)) {
        fs.unlinkSync(BUILD_META_PATH);
      }
    }
  }

  fs.mkdirSync(path.dirname(BUILD_META_PATH), { recursive: true });
  fs.writeFileSync(BUILD_META_PATH, JSON.stringify(buildMeta, null, 2));

  const configPath = path.join(process.cwd(), 'data/seo/config.json');
  const config = safeLoadJson(configPath, {
    targetPagesPerBuild: 10000,
    maxPagesPerCluster: 450,
    minQualityScore: 0.7,
    languages: ['en', 'es']
  });

  const rlState = loadRlState();

  log('MASTER', 'Building URL plan...');
  const plan = buildUrlPlan(config, rlState);
  log('MASTER', `URL plan size: ${plan.length}`);

  if (!plan.length) {
    log('MASTER', 'No pages planned, finishing early.');
    const finishedAt = new Date().toISOString();
    buildMeta.finishedAt = finishedAt;
    fs.writeFileSync(BUILD_META_PATH, JSON.stringify(buildMeta, null, 2));
    fs.writeFileSync(
      RUN_SUMMARY_PATH,
      JSON.stringify(
        {
          buildId: buildMeta.buildId,
          startedAt,
          finishedAt,
          durationMs: Date.now() - startMs,
          pagesPlanned: 0,
          pagesGenerated: 0,
          pagesAccepted: 0,
          avgQuality: 0,
          concurrency: 0
        },
        null,
        2
      )
    );
    process.exit(0);
  }

  attachInternalLinks(plan);

  const concurrency = DEFAULT_CONCURRENCY;
  log('MASTER', `Generating pages with concurrency=${concurrency}...`);

  const pages = await runWithConcurrency(plan, concurrency, async (item) => {
    return await buildPageContent(item, config);
  });

  log('MASTER', `Pages generated: ${pages.length}`);

  log('MASTER', 'Resetting quality index...');
  resetQualityIndex();

  log('MASTER', 'Scoring pages (in memory)...');
  const qualityRecords = [];
  const scored = pages.map((p) => {
    const { scored, rec } = scorePage(p, config);
    qualityRecords.push(rec);
    return scored;
  });

  writeQualityIndex(qualityRecords);

  const minScore = config.minQualityScore || 0.7;
  const accepted = scored.filter(
    (p) => (p.qualityScore || 0) >= minScore
  );

  log(
    'MASTER',
    `Accepted pages (score >= ${minScore}): ${accepted.length}/${scored.length}`
  );

  log('MASTER', 'Building graph (analysis only, accepted pages)...');
  buildGraph(accepted);

  log('MASTER', 'Writing sitemaps (accepted pages only)...');
  writeSitemaps(accepted, config);

  log('MASTER', 'Updating RL state from accepted pages...');
  const newRl = updateRlState(rlState, accepted);
  saveRlState(newRl);

  const finishedAt = new Date().toISOString();
  const durationMs = Date.now() - startMs;
  buildMeta.finishedAt = finishedAt;
  fs.writeFileSync(BUILD_META_PATH, JSON.stringify(buildMeta, null, 2));

  log('MASTER', 'Writing dashboard and run summary...');
  writeDashboard(buildMeta, scored, accepted);

  const avgQuality =
    accepted.reduce((acc, p) => acc + (p.qualityScore || 0), 0) /
      Math.max(accepted.length, 1) || 0;

  const summary = {
    buildId: buildMeta.buildId,
    startedAt,
    finishedAt,
    durationMs,
    pagesPlanned: plan.length,
    pagesGenerated: pages.length,
    pagesAccepted: accepted.length,
    avgQuality,
    concurrency
  };

  fs.writeFileSync(RUN_SUMMARY_PATH, JSON.stringify(summary, null, 2));

  log('MASTER', `SEO build finished in ${durationMs}ms.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
EOF

echo "[SEO-MONSTER 4.0] Done. Vercel will run: npm run vercel-build (SEO build + next build, static /vin/*)."
