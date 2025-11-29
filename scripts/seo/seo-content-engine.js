
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

