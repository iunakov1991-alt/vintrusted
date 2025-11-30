const fs = require('fs');
const path = require('path');
const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: URL Factory
 * Планирование URL с учетом кластеризации и приоритетов
 */
class URLFactory {
  constructor(config, rlState) {
    this.config = config;
    this.rlState = rlState || {};
    this.seedsPath = path.join(process.cwd(), 'data/seo/url-seeds.json');
  }

  loadSeeds() {
    try {
      if (fs.existsSync(this.seedsPath)) {
        return JSON.parse(fs.readFileSync(this.seedsPath, 'utf8'));
      }
    } catch (e) {
      log('URL', 'Seeds load error, using defaults');
    }
    return {
      states: [
        { code: 'ca', slug: 'california' },
        { code: 'tx', slug: 'texas' },
        { code: 'fl', slug: 'florida' },
        { code: 'ny', slug: 'new-york' }
      ],
      makes: [{ slug: 'toyota' }, { slug: 'honda' }, { slug: 'ford' }],
      years: [2015, 2018, 2020, 2022],
      vinExamples: ['1HGCM82633A004352', '4T1BF1FK3FU123456']
    };
  }

  buildClusterId({ type, stateSlug, makeSlug, intent }) {
    return `${type}_${stateSlug}_${makeSlug}_${intent}`;
  }

  normalizeWeights(obj) {
    const entries = Object.entries(obj || {});
    const sum = entries.reduce((acc, [, v]) => acc + v, 0);
    if (!sum) return obj;
    const res = {};
    for (const [k, v] of entries) res[k] = v / sum;
    return res;
  }

  /**
   * Построить план URL с учетом приоритетов
   */
  buildUrlPlan() {
    const seeds = this.loadSeeds();
    const intents = this.config.intents || [];
    const states = seeds.states || [];
    const makes = seeds.makes || [];
    const years = seeds.years || [];
    const vins = seeds.vinExamples || [];
    const languages = this.config.languages || ['en'];

    const intentWeights = this.normalizeWeights(this.rlState.intentWeights || {});
    const langWeights = this.normalizeWeights(this.rlState.languageWeights || {});
    const clusterScores = this.rlState.clusterScores || {};

    const pages = [];
    let vinIndex = 0;

    for (const state of states) {
      for (const make of makes) {
        for (const year of years) {
          for (const intent of intents) {
            for (const lang of languages) {
              const vin = vins.length ? vins[vinIndex % vins.length] : '1HGCM82633A004352';
              vinIndex++;

              const clusterId = this.buildClusterId({
                type: 'vin',
                stateSlug: state.slug,
                makeSlug: make.slug,
                intent
              });

              let basePriority = 1.0;
              const iWeight = intentWeights[intent] ?? 0.2;
              const lWeight = langWeights[lang] ?? 0.5;
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

    // Дедупликация по vin+stateSlug
    const seen = new Set();
    const deduplicated = [];
    for (const p of pages) {
      const key = `${p.vin}|${p.stateSlug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduplicated.push(p);
    }

    // Сортировка по приоритету
    deduplicated.sort((a, b) => b.priority - a.priority);

    // Ограничение по кластерам и общему бюджету
    const perCluster = {};
    const result = [];
    for (const p of deduplicated) {
      const count = perCluster[p.clusterId] || 0;
      if (count >= (this.config.maxPagesPerCluster || 500)) continue;
      perCluster[p.clusterId] = count + 1;
      result.push(p);
      if (result.length >= (this.config.targetPagesPerBuild || 10000)) break;
    }

    log('URL', `Planned pages: ${result.length}`, {
      clusters: Object.keys(perCluster).length,
      afterDeduplication: deduplicated.length
    });

    return result;
  }
}

module.exports = { URLFactory };

