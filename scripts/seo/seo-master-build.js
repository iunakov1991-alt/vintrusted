
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

