
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

  const vinDir = path.join(root, 'vin', item.vin, item.stateSlug || 'state', item.intent || 'vin_check', item.lang || 'en');

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

