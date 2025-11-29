
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

  const lenScore = Math.max(0, Math.min(1, len / 4000));



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

