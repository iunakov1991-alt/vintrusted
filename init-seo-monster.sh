#!/bin/bash

set -e



########################################################################

# SEO-MONSTER 2.0 — ТЗ + РЕАЛИЗАЦИЯ В ОДНОМ БЭШЕ

#

# ЦЕЛЬ:

#   Построить автономную SEO-машину для vintrusted.com, которая:

#   - Не трогает существующий фронт и API (главная, Stripe, ClearVIN и т.д.).

#   - Живёт отдельно в scripts/seo, data/seo и public/seo.

#   - Работает на Vercel (Hobby/Pro), переживает повторные билды.

#   - Может генерировать тысячи+ страниц за билд (VIN / штат / марка / год).

#   - Имеет AI-контент (если есть ключ), но не ломается без него.

#   - Имеет RL-политику (intent / кластеры) и quality-оценку.

#   - Генерит sitemaps и простой dashboard.

#

# СТРУКТУРА:

#   data/seo/

#     - config.json         — базовая конфигурация SEO-монстра

#     - url-seeds.json      — семена (штаты, марки, годы, примеры VIN)

#     - rl-state.json       — состояние RL-политики

#     - quality-index.jsonl — построчный quality-лог

#     - ai-cache.jsonl      — кеш AI-текстов

#

#   scripts/seo/

#     - logger.js           — общий логгер

#     - seo-ai-client.js    — клиент AI (fallback, кеш, без падений)

#     - seo-url-factory.js  — планировщик URL на билд

#     - seo-template-engine.js — шаблонизатор HTML

#     - seo-content-engine.js  — сборщик контента и запись HTML

#     - seo-quality-engine.js  — скоринг качества + сброс файла

#     - seo-rl-engine.js       — RL-политика intents/кластеров

#     - seo-graph-engine.js    — построение графа перелинковки (для анализа)

#     - seo-sitemap-engine.js  — генерация sitemap-ов

#     - seo-dashboard.js       — дашборд (JSON + HTML)

#     - seo-master-build.js    — ОДНА точка входа для Vercel

#     - setup-seo-config.js    — патчит package.json и vercel.json

#

#   public/seo/pages/      — здесь лежат сгенерированные HTML (статические)

#   public/seo/sitemaps/   — sitemap-ы SEO-монстра

#   public/internal/       — build-meta.json и seo-dashboard.*

#

# VERCEL:

#   - В package.json: "vercel-build": "node scripts/seo/seo-master-build.js"

#   - В vercel.json добавляются rewrites:

#       /vin/:vin/:state -> /seo/pages/vin/:vin/:state/index.html

#       /vin/:vin        -> /seo/pages/vin/:vin/index.html

#       /articles/...    -> /seo/pages/articles/.../index.html (на будущее)

#

# ПОВЕДЕНИЕ:

#   - При первом проходе Vercel:

#       seo-master-build:

#         1) проверяет build-meta.json; если нет — создаёт и запускает полный пайплайн

#         2) генерит страницы, quality-index, RL-обновление, sitemap-ы, дашборд

#   - При последующих проходах (Vercel делает второй/третий build):

#       если build-meta.json уже есть — SEO-билд сразу SKIP, чтобы не ловить ENOENT

#

# AI:

#   - Включение через env: SEO_ENABLE_AI=1 и SEO_AI_API_KEY=...

#   - Если нет ключа — генерится безопасный шаблонный текст, билд не падает.

########################################################################



echo "[SEO-MONSTER] Init started..."



# 1. Директории

mkdir -p scripts/seo

mkdir -p data/seo

mkdir -p public/seo/pages

mkdir -p public/seo/sitemaps

mkdir -p public/internal



########################################################################

# 2. Базовые data-файлы

########################################################################



cat > data/seo/config.json << 'EOF'

{

  "targetPagesPerBuild": 5000,

  "maxPagesPerCluster": 300,

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



cat > data/seo/url-seeds.json << 'EOF'

{

  "states": [

    { "code": "ca", "slug": "california" },

    { "code": "tx", "slug": "texas" }

  ],

  "makes": [

    { "slug": "toyota" },

    { "slug": "honda" },

    { "slug": "ford" }

  ],

  "years": [2005, 2008, 2012, 2015, 2018, 2020],

  "vinExamples": [

    "1HGCM82633A004352",

    "4T1BF1FK3FU123456"

  ]

}

EOF



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



# quality-index и ai-cache сбросим/создадим пустыми

: > data/seo/quality-index.jsonl

: > data/seo/ai-cache.jsonl



########################################################################

# 3. logger.js — общий лог

########################################################################



cat > scripts/seo/logger.js << 'EOF'

const prefix = (tag) => `[SEO ${tag}]`;



function log(tag, msg) {

  const ts = new Date().toISOString();

  console.log(`${prefix(tag)} ${ts} - ${msg}`);

}



module.exports = { log };

EOF



########################################################################

# 4. seo-ai-client.js — AI с кешем и fallback

########################################################################



cat > scripts/seo/seo-ai-client.js << 'EOF'

const fs = require('fs');

const path = require('path');

const crypto = require('crypto');

const { log } = require('./logger');



const CACHE_PATH = path.join(process.cwd(), 'data/seo/ai-cache.jsonl');



function hashKey(str) {

  return crypto.createHash('sha1').update(str).digest('hex');

}



function readCache() {

  if (!fs.existsSync(CACHE_PATH)) return new Map();

  const map = new Map();

  const lines = fs.readFileSync(CACHE_PATH, 'utf8').split('\n').filter(Boolean);

  for (const line of lines) {

    try {

      const obj = JSON.parse(line);

      if (obj.key && obj.text) map.set(obj.key, obj.text);

    } catch (_e) {}

  }

  return map;

}



function appendCache(key, text) {

  try {

    fs.appendFileSync(CACHE_PATH, JSON.stringify({ key, text }) + '\n');

  } catch (e) {

    log('AI', `Cache write error: ${e.message}`);

  }

}



async function generateText(prompt, { lang = 'en', intent = 'generic', maxTokens = 600 } = {}) {

  const enableAI = process.env.SEO_ENABLE_AI === '1' || process.env.SEO_ENABLE_AI === 'true';

  const key = hashKey(`${lang}|${intent}|${prompt}`);

  const cache = readCache();

  if (cache.has(key)) {

    return cache.get(key);

  }



  if (!enableAI || !process.env.SEO_AI_API_KEY) {

    const fallback = `This section provides general, non-personalized information about ${intent} in the context of vehicle history reports. It explains why this check matters, what is usually included, and how drivers can use this information to make safer decisions when buying or owning a vehicle in the ${lang.toUpperCase()} locale. No specific VIN data is inferred or fabricated.`;

    appendCache(key, fallback);

    return fallback;

  }



  // TODO: здесь Cursor подключит реального AI-провайдера (DeepSeek/Grok).

  const text = `AI-generated content placeholder for intent "${intent}" (lang=${lang}). Replace this with real provider integration.`;

  appendCache(key, text);

  return text;

}



module.exports = { generateText };

EOF



########################################################################

# 5. seo-url-factory.js — генерация плана URL

########################################################################



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

    if (count >= (config.maxPagesPerCluster || 300)) continue;

    perCluster[p.clusterId] = count + 1;

    result.push(p);

    if (result.length >= (config.targetPagesPerBuild || 5000)) break;

  }



  log('URL', `Planned pages: ${result.length}`);

  return result;

}



module.exports = { buildUrlPlan };

EOF



########################################################################

# 6. seo-template-engine.js — HTML-шаблон

########################################################################



cat > scripts/seo/seo-template-engine.js << 'EOF'

const escapeHtml = (str = '') =>

  str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');



function renderSchema({ url, title, description }) {

  const schema = {

    "@context": "https://schema.org",

    "@type": "WebPage",

    "url": url,

    "name": title,

    "description": description

  };

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;

}



function renderPage(templateName, ctx) {

  const lang = ctx.lang || 'en';

  const title = ctx.title || 'VIN report';

  const description = ctx.description || '';

  const h1 = ctx.h1 || title;

  const bodyBlocks = ctx.bodyBlocks || [];

  const faq = ctx.faq || [];

  const internalLinks = ctx.internalLinks || [];



  const faqHtml = faq.length

    ? `<section class="faq"><h2>FAQ</h2>${faq

        .map(

          (q) =>

            `<div class="faq-item"><h3>${escapeHtml(

              q.q

            )}</h3><p>${escapeHtml(q.a)}</p></div>`

        )

        .join('')}</section>`

    : '';



  const linksHtml = internalLinks.length

    ? `<nav class="internal-links"><h2>Related pages</h2><ul>${internalLinks

        .map((l) => `<li><a href="${l.href}">${escapeHtml(l.label)}</a></li>`)

        .join('')}</ul></nav>`

    : '';



  const schema = renderSchema({ url: ctx.url, title, description });



  const body = `

  <main>

    <header>

      <h1>${escapeHtml(h1)}</h1>

      <p class="intro">${escapeHtml(ctx.intro || '')}</p>

    </header>

    ${bodyBlocks.join('\n')}

    ${faqHtml}

    ${linksHtml}

    <section class="cta">

      <a href="/checkout" class="btn-primary">Check this VIN now</a>

    </section>

  </main>

  `;



  return `<!doctype html>

<html lang="${lang}">

<head>

  <meta charset="utf-8" />

  <title>${escapeHtml(title)}</title>

  <meta name="description" content="${escapeHtml(description)}" />

  <meta name="viewport" content="width=device-width,initial-scale=1" />

  ${schema}

</head>

<body>

  ${body}

</body>

</html>`;

}



module.exports = { renderPage };

EOF



########################################################################

# 7. seo-content-engine.js — генерация и запись страниц

########################################################################



cat > scripts/seo/seo-content-engine.js << 'EOF'

const path = require('path');

const fs = require('fs');

const { generateText } = require('./seo-ai-client');

const { renderPage } = require('./seo-template-engine');

const { log } = require('./logger');



function buildTitle(item) {

  const state = item.stateSlug.replace(/-/g, ' ');

  const make = item.make.toUpperCase();

  return `VIN Check for ${item.year} ${make} in ${state} – Full Report`;

}



function buildDescription(item) {

  const state = item.stateSlug.replace(/-/g, ' ');

  return `Instant VIN check for ${item.year} ${item.make.toUpperCase()} in ${state}. Get ownership, accident and title history before you buy.`;

}



function getOutputPath(item) {

  const root = path.join(process.cwd(), 'public/seo/pages');

  const vinDir = path.join(root, 'vin', item.vin, item.stateSlug);

  return path.join(vinDir, 'index.html');

}



async function buildPageContent(item, config) {

  const title = buildTitle(item);

  const description = buildDescription(item);

  const h1 = `VIN report for ${item.year} ${item.make.toUpperCase()} in ${item.stateSlug}`;



  const intro = `This page explains how to read a VIN report for a ${item.year} ${item.make.toUpperCase()} registered in ${item.stateSlug}.`;



  const aiText = await generateText(

    `Write a detailed but generic explanation (no specific accidents, no fabricated records) about "${item.intent}" for a vehicle VIN report in ${item.stateSlug}. Focus on why the check matters and what buyers should pay attention to.`,

    { lang: item.lang, intent: item.intent, maxTokens: config.aiMaxTokens || 600 }

  );



  const bodyBlocks = [

    `<section><h2>Why this VIN check matters</h2><p>${aiText}</p></section>`,

    `<section><h2>What is usually included</h2><ul><li>Title and ownership history</li><li>Recorded accidents and damage</li><li>Odometer readings</li><li>Salvage or junk titles</li></ul></section>`

  ];



  const faq = [

    {

      q: 'What is a VIN check?',

      a: 'A VIN check is a report built from multiple data sources that helps you understand the history of a specific vehicle before you buy or insure it.'

    },

    {

      q: 'Does this report show exact accidents?',

      a: 'Reports usually show records reported to insurance, DMVs or auctions, but not every minor incident is guaranteed to appear.'

    }

  ];



  const pageCtx = {

    url: item.url,

    lang: item.lang,

    title,

    description,

    h1,

    intro,

    bodyBlocks,

    faq,

    internalLinks: item.internalLinks || []

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



########################################################################

# 8. seo-quality-engine.js — оценка качества + сброс файла

########################################################################



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

  const structureScore = (hasFaq ? 0.6 : 0) + (hasCta ? 0.4 : 0);



  const score =

    0.25 * lenScore +

    0.25 * headingScore +

    0.25 * keywordScore +

    0.25 * structureScore;



  const rec = {

    url: pageDoc.url,

    score,

    cluster: pageDoc.clusterId,

    lang: pageDoc.lang,

    intent: pageDoc.intent

  };



  fs.appendFileSync(QUALITY_PATH, JSON.stringify(rec) + '\n');

  return { ...pageDoc, qualityScore: score };

}



module.exports = { scorePage, resetQualityIndex };

EOF



########################################################################

# 9. seo-rl-engine.js — RL-политика

########################################################################



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



########################################################################

# 10. seo-graph-engine.js — граф (для анализа, без перезаписи HTML)

########################################################################



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



########################################################################

# 11. seo-sitemap-engine.js — sitemap-ы

########################################################################



cat > scripts/seo/seo-sitemap-engine.js << 'EOF'

const fs = require('fs');

const path = require('path');

const { log } = require('./logger');



const SITEMAP_ROOT = path.join(process.cwd(), 'public/seo/sitemaps');



function chunk(arr, n) {

  const res = [];

  for (let i = 0; i < arr.length; i += n) res.push(arr.slice(i, i + n));

  return res;

}



function writeSitemaps(pages, config) {

  if (!fs.existsSync(SITEMAP_ROOT)) fs.mkdirSync(SITEMAP_ROOT, { recursive: true });



  // Чистим старые XML

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

  const maxPerFile = 20000;



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



  const globalIndexXml = `<?xml version="1.0" encoding="UTF-8"?>

<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${indexEntries

  .map(

    (e) =>

      `<sitemap><loc>https://vintrusted.com/seo/sitemaps/${e.fileName}</loc></sitemap>`

  )

  .join('')}

</sitemapindex>`;

  fs.writeFileSync(path.join(SITEMAP_ROOT, 'sitemap-seo.xml'), globalIndexXml, 'utf8');



  log('SITEMAP', `Sitemaps written for ${Object.keys(byLang).length} languages`);

}



module.exports = { writeSitemaps };

EOF



########################################################################

# 12. seo-dashboard.js — простой дашборд

########################################################################



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

# 13. seo-master-build.js — главный вход для Vercel

########################################################################



cat > scripts/seo/seo-master-build.js << 'EOF'

const fs = require('fs');

const path = require('path');

const { log } = require('./logger');

const { buildUrlPlan } = require('./seo-url-factory');

const { buildPageContent } = require('./seo-content-engine');

const { scorePage, resetQualityIndex } = require('./seo-quality-engine');

const { loadRlState, saveRlState, updateRlState } = require('./seo-rl-engine');

const { buildGraph } = require('./seo-graph-engine');

const { writeSitemaps } = require('./seo-sitemap-engine');

const { writeDashboard } = require('./seo-dashboard');



const isVercel = !!(process.env.VERCEL || process.env.VERCEL_ENV);

const BUILD_META_PATH = path.join(process.cwd(), 'public/internal/build-meta.json');



function loadJson(p) {

  return JSON.parse(fs.readFileSync(p, 'utf8'));

}



async function main() {

  const startedAt = new Date().toISOString();

  let buildMeta = {

    buildId: startedAt.replace(/[:.]/g, '-'),

    startedAt,

    finishedAt: null

  };



  if (isVercel && fs.existsSync(BUILD_META_PATH)) {

    log('MASTER', 'Second Vercel pass detected, skipping SEO build.');

    process.exit(0);

  }



  fs.mkdirSync(path.dirname(BUILD_META_PATH), { recursive: true });

  fs.writeFileSync(BUILD_META_PATH, JSON.stringify(buildMeta, null, 2));



  const configPath = path.join(process.cwd(), 'data/seo/config.json');

  const config = loadJson(configPath);



  const rlState = loadRlState();



  log('MASTER', 'Building URL plan...');

  const plan = buildUrlPlan(config, rlState);



  const pages = [];

  for (const item of plan) {

    const page = await buildPageContent(item, config);

    pages.push(page);

  }



  log('MASTER', 'Resetting quality index...');

  resetQualityIndex();



  log('MASTER', 'Scoring pages...');

  const scored = pages.map((p) => scorePage(p, config));



  const accepted = scored.filter(

    (p) => (p.qualityScore || 0) >= (config.minQualityScore || 0.7)

  );



  log('MASTER', `Accepted pages: ${accepted.length}/${scored.length}`);



  log('MASTER', 'Building graph (analysis only)...');

  buildGraph(accepted);



  log('MASTER', 'Writing sitemaps...');

  writeSitemaps(accepted, config);



  log('MASTER', 'Updating RL state...');

  const newRl = updateRlState(rlState, scored);

  saveRlState(newRl);



  const finishedAt = new Date().toISOString();

  buildMeta.finishedAt = finishedAt;

  fs.writeFileSync(BUILD_META_PATH, JSON.stringify(buildMeta, null, 2));



  writeDashboard(buildMeta, scored, accepted);



  log('MASTER', 'SEO build finished.');

}



main().catch((e) => {

  console.error(e);

  process.exit(1);

});

EOF



########################################################################

# 14. setup-seo-config.js — патч package.json и vercel.json

########################################################################



cat > scripts/seo/setup-seo-config.js << 'EOF'

const fs = require('fs');

const path = require('path');

const { log } = require('./logger');



function patchPackageJson() {

  const pkgPath = path.join(process.cwd(), 'package.json');

  if (!fs.existsSync(pkgPath)) {

    log('SETUP', 'package.json not found, skipping.');

    return;

  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  pkg.scripts = pkg.scripts || {};

  pkg.scripts['vercel-build'] = 'node scripts/seo/seo-master-build.js';

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

  log('SETUP', 'package.json updated: vercel-build script set.');

}



function patchVercelJson() {

  const vercelPath = path.join(process.cwd(), 'vercel.json');

  let cfg = {};

  if (fs.existsSync(vercelPath)) {

    cfg = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));

  }

  cfg.rewrites = cfg.rewrites || [];



  const needed = [

    { source: '/articles/:slug*', destination: '/seo/pages/articles/:slug*/index.html' },

    { source: '/vin/:vin([A-HJ-NPR-Z0-9]{17})/:state([a-zA-Z-]+)', destination: '/seo/pages/vin/:vin/:state/index.html' },

    { source: '/vin/:vin([A-HJ-NPR-Z0-9]{17})', destination: '/seo/pages/vin/:vin/index.html' }

  ];



  const existingSources = new Set(cfg.rewrites.map((r) => r.source));

  for (const r of needed) {

    if (!existingSources.has(r.source)) {

      cfg.rewrites.push(r);

    }

  }



  fs.writeFileSync(vercelPath, JSON.stringify(cfg, null, 2));

  log('SETUP', 'vercel.json updated with SEO rewrites (existing rules preserved).');

}



patchPackageJson();

patchVercelJson();

EOF



########################################################################

# 15. Запуск setup (патчим package.json и vercel.json)

########################################################################



node scripts/seo/setup-seo-config.js



echo "[SEO-MONSTER] Init finished. Now you can run: npm run vercel-build"

