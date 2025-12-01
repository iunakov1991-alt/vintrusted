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

  /**
   * Обновление seeds из Seed Expansion Engine
   * Используется для интеграции с AI Seed Expansion
   */
  updateSeeds(expandedSeeds) {
    if (!expandedSeeds || typeof expandedSeeds !== 'object') {
      log('URL', 'Invalid expanded seeds, using current seeds');
      return;
    }
    
    // Сохраняем расширенные seeds для этого билда
    this.currentSeeds = expandedSeeds;
    log('URL', `Seeds updated: ${expandedSeeds.states?.length || 0} states, ${expandedSeeds.makes?.length || 0} makes, ${expandedSeeds.years?.length || 0} years`);
  }

  /**
   * Получение текущих seeds (с учетом обновлений от Seed Expansion)
   */
  getCurrentSeeds() {
    return this.currentSeeds || this.loadSeeds();
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
   * Простая хеш-функция для генерации уникальных VIN
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Построить план URL с учетом приоритетов
   */
  buildUrlPlan() {
    const seeds = this.getCurrentSeeds();
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
      // Защита от undefined state
      const stateSlug = (typeof state === 'string' ? state : state?.slug) || 'california';
      const stateCode = (typeof state === 'object' ? state?.code : null) || 'CA';
      
      for (const make of makes) {
        // Защита от undefined make
        const makeSlug = (typeof make === 'string' ? make : make?.slug) || 'toyota';
        
        for (const year of years) {
          for (const intent of intents) {
            for (const lang of languages) {
              // Генерируем уникальный VIN на основе комбинации параметров
              // Это позволяет создавать больше уникальных страниц
              let vin;
              if (vins.length > 0) {
                // Используем существующий VIN как базу и модифицируем последние символы
                const baseVin = vins[vinIndex % vins.length];
                // Создаем уникальный идентификатор из комбинации параметров
                const uniqueId = `${makeSlug}-${year}-${stateSlug}-${intent}-${lang}`;
                const hash = this.simpleHash(uniqueId);
                // Заменяем последние 4 символа VIN на хеш (сохраняя формат VIN)
                const hashStr = hash.toString(16).toUpperCase().padStart(4, '0').substring(0, 4);
                // Используем только допустимые символы VIN (A-HJ-NPR-Z0-9)
                const vinChars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
                let vinSuffix = '';
                for (let i = 0; i < 4; i++) {
                  const charCode = hashStr.charCodeAt(i) || 0;
                  vinSuffix += vinChars[charCode % vinChars.length];
                }
                vin = baseVin.substring(0, 13) + vinSuffix;
              } else {
                // Генерируем новый VIN на основе параметров
                const baseVin = '1HGCM82633A004352';
                const uniqueId = `${makeSlug}-${year}-${stateSlug}-${intent}-${lang}`;
                const hash = this.simpleHash(uniqueId);
                const hashStr = hash.toString(16).toUpperCase().padStart(4, '0').substring(0, 4);
                const vinChars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
                let vinSuffix = '';
                for (let i = 0; i < 4; i++) {
                  const charCode = hashStr.charCodeAt(i) || 0;
                  vinSuffix += vinChars[charCode % vinChars.length];
                }
                vin = baseVin.substring(0, 13) + vinSuffix;
              }
              vinIndex++;

              const clusterId = this.buildClusterId({
                type: 'vin',
                stateSlug: stateSlug,
                makeSlug: makeSlug,
                intent
              });

              let basePriority = 1.0;
              const iWeight = intentWeights[intent] ?? 0.2;
              const lWeight = langWeights[lang] ?? 0.5;
              const cWeight = clusterScores[clusterId] ?? 1.0;

              const priority = basePriority * (0.5 + iWeight) * (0.5 + lWeight) * (0.5 + cWeight);

              const url = `/vin/${vin}/${stateSlug}/`;

              pages.push({
                url,
                lang,
                intent,
                clusterId,
                template: 'vin-report',
                stateSlug: stateSlug,
                stateCode: stateCode,
                make: makeSlug,
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
    // Одна страница на VIN+state, контент учитывает intent и lang через AI
    // Для увеличения количества страниц генерируем больше VIN динамически
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

