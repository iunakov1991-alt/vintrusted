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
