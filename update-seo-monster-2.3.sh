#!/bin/bash

set -e

########################################################################

# SEO-MONSTER 2.3 — VERCEL PRO EDITION

#

# ЗАДАЧА ДЛЯ CURSOR:

#

# 1) НИЧЕГО не трогать во фронте, Stripe, ClearVIN и API-ручках.

# 2) Работать ТОЛЬКО в:

#      - scripts/seo/*

#      - data/seo/*

#      - public/seo/*

#      - public/internal/*

# 3) Мы уже на Vercel Pro, SEO-монстр:

#      - генерит 10–20k статических страниц за билд (без serverless-функций),

#      - живёт как отдельный статики-двигатель,

#      - уважает лимиты по времени (конкурентность ограничена),

#      - даёт Гуглу нормальный контент (структура, семантика, internal links).

#

# ВЕРСИЯ 2.3 ДОКРУЧИВАЕТ ПО СРАВНЕНИЮ С 2.2:

#  - Конкурентная генерация страниц с лимитом (build-time ускорен под Pro).

#  - Quality-лог пишется ОДНИМ вызовом (без 10–20k append-ов).

#  - Шаблоны страниц стали богаче:

#      • Key facts / At a glance блок

#      • Local insights по штату

#      • Табличка "Check type / What you see / Why it matters"

#      • Сравнительный блок "Free VIN check vs paid report"

#      • Вариативные layout'ы (A/B/C) для снижения шаблонности DOM.

#  - `<link rel="canonical">` добавлен.

#  - Internal links: страницы внутри одного кластера перелинкованы (2–3 ссылки).

#  - RL обновляется по accepted-страницам (minQualityScore), а не по всему мусору.

#  - Пишется общий summary JSON для билда: public/internal/seo-run-summary.json

#

# ПРЕДПОСЫЛКИ:

#  - Уже есть:

#      scripts/seo/seo-url-factory.js

#      scripts/seo/seo-ai-client.js  (из 2.2)

#      scripts/seo/seo-graph-engine.js

#      scripts/seo/seo-dashboard.js

#      scripts/seo/seo-rl-engine.js

#      data/seo/config.json          (targetPagesPerBuild ~15000, Pro)

#  - package.json:

#      "scripts": {

#        "vercel-build": "node scripts/seo/seo-master-build.js",

#        ...

#      }

#

# ЦЕЛЬ ЭТОГО БЭША:

#  - Переписать:

#      scripts/seo/seo-master-build.js

#      scripts/seo/seo-template-engine.js

#      scripts/seo/seo-content-engine.js

#      scripts/seo/seo-quality-engine.js

#  - НЕ трогать ничего вне SEO-монстра.

########################################################################

echo "[SEO-MONSTER 2.3] Applying Pro+SEO patch..."

mkdir -p scripts/seo

mkdir -p data/seo

mkdir -p public/seo/pages

mkdir -p public/seo/sitemaps

mkdir -p public/internal

########################################################################

# 1) seo-template-engine.js — многовариантные шаблоны + canonical

########################################################################

cat > scripts/seo/seo-template-engine.js << 'EOF'

const escapeHtml = (str = '') =>

  str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function renderSchema({ url, title, description }) {

  const schema = {

    "@context": "https://schema.org",

    "@type": "WebPage",

    "url": `https://vintrusted.com${url}`,

    "name": title,

    "description": description

  };

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;

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

      and whether it ever appeared at auctions or insurance events in ${escapeHtml(stateLabel)}.

    </p>

  </section>`;

}

function renderComparisonBlock(ctx) {

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

function renderFeatureTable(ctx) {

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

  // Три варианта раскладки блоков

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

  const schema = renderSchema({ url, title, description });

  const body = renderBody(layout, ctx);

  return `<!doctype html>

<html lang="${lang}">

<head>

  <meta charset="utf-8" />

  <title>${escapeHtml(title)}</title>

  <meta name="description" content="${escapeHtml(description)}" />

  <meta name="viewport" content="width=device-width,initial-scale=1" />

  <link rel="canonical" href="https://vintrusted.com${canonicalUrl}" />

  ${schema}

</head>

<body>

  ${body}

</body>

</html>`;

}

module.exports = { renderPage };

EOF

echo "[SEO-MONSTER 2.3] seo-template-engine.js updated."

########################################################################

# 2) seo-content-engine.js — богатый контент + layout A/B/C + internal links

########################################################################

cat > scripts/seo/seo-content-engine.js << 'EOF'

const path = require('path');

const fs = require('fs');

const { generateText } = require('./seo-ai-client');

const { renderPage } = require('./seo-template-engine');

const { log } = require('./logger');

function buildTitle(item) {

  const state = (item.stateSlug || '').replace(/-/g, ' ');

  const make = (item.make || '').toUpperCase();

  return `VIN Check for ${item.year} ${make} in ${state} – Full Report`;

}

function buildDescription(item) {

  const state = (item.stateSlug || '').replace(/-/g, ' ');

  const make = (item.make || '').toUpperCase();

  return `Instant VIN check for ${item.year} ${make} in ${state}. Get ownership, accident and title history before you buy.`;

}

function buildStateLabel(item) {

  const state = (item.stateSlug || '').replace(/-/g, ' ');

  return state ? state[0].toUpperCase() + state.slice(1) : 'your state';

}

function getOutputPath(item) {

  const root = path.join(process.cwd(), 'public/seo/pages');

  const vinDir = path.join(root, 'vin', item.vin, item.stateSlug || 'state');

  return path.join(vinDir, 'index.html');

}

function chooseLayout(item) {

  const layouts = ['A', 'B', 'C'];

  const hashBase = `${item.vin}|${item.stateSlug}|${item.intent}`;

  let h = 0;

  for (let i = 0; i < hashBase.length; i++) {

    h = (h * 31 + hashBase.charCodeAt(i)) >>> 0;

  }

  return layouts[h % layouts.length];

}

async function buildPageContent(item, config) {

  const title = buildTitle(item);

  const description = buildDescription(item);

  const h1 = `VIN report for ${item.year} ${(item.make || '').toUpperCase()} in ${(item.stateSlug || '')}`;

  const stateLabel = buildStateLabel(item);

  const intro = `This page explains how to read a VIN report for a ${item.year} ${(item.make || '').toUpperCase()} registered in ${stateLabel}, and why a detailed history check is important before you commit to a purchase.`;

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

echo "[SEO-MONSTER 2.3] seo-content-engine.js updated."

########################################################################

# 3) seo-quality-engine.js — score в памяти + один writeFile

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

  const hasKeyFacts = /class="key-facts"/i.test(html);

  const structureScore =

    (hasFaq ? 0.25 : 0) +

    (hasCta ? 0.25 : 0) +

    (hasKeyFacts ? 0.5 : 0);

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

    const lines = records.map((r) => JSON.stringify(r)).join('\n') + (records.length ? '\n' : '');

    fs.writeFileSync(QUALITY_PATH, lines, 'utf8');

    log('QUALITY', `quality-index.jsonl written, records=${records.length}`);

  } catch (e) {

    log('QUALITY', `write error: ${e.message}`);

  }

}

module.exports = { scorePage, resetQualityIndex, writeQualityIndex };

EOF

echo "[SEO-MONSTER 2.3] seo-quality-engine.js updated."

########################################################################

# 4) seo-master-build.js — concurrency + internal links + RL по accepted

########################################################################

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

function loadJson(p) {

  return JSON.parse(fs.readFileSync(p, 'utf8'));

}

function attachInternalLinks(plan) {

  const byCluster = {};

  plan.forEach((item, index) => {

    if (!byCluster[item.clusterId]) byCluster[item.clusterId] = [];

    byCluster[item.clusterId].push({ index, item });

  });

  for (const clusterId of Object.keys(byCluster)) {

    const arr = byCluster[clusterId];

    // arr уже в порядке приоритета (buildUrlPlan так сортирует)

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

        const label = `${neighbor.year} ${neighbor.make.toUpperCase()} VIN check in ${neighbor.stateSlug.replace(/-/g, ' ')}`;

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

  async function next() {

    const i = index++;

    if (i >= items.length) return;

    const item = items[i];

    try {

      results[i] = await worker(item, i);

    } catch (e) {

      console.error(e);

      results[i] = null;

    }

    await next();

  }

  const runners = [];

  const actualLimit = Math.max(1, Math.min(limit, items.length));

  for (let i = 0; i < actualLimit; i++) {

    runners.push(next());

  }

  await Promise.all(runners);

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

  log('MASTER', `URL plan size: ${plan.length}`);

  // Вешаем internalLinks до генерации контента

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

  log('MASTER', 'Building graph (analysis only)...');

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

  // Dashboard + summary

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

echo "[SEO-MONSTER 2.3] seo-master-build.js updated."

echo "[SEO-MONSTER 2.3] Patch complete. 

Запускать билд как обычно: npm run vercel-build или vercel --prod (Vercel Pro)."

