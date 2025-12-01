const fs = require('fs');
const path = require('path');
const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Seed Analyzer
 * Анализирует источники данных для выявления пробелов в покрытии
 */
class SeedAnalyzer {
  constructor(config) {
    this.config = config;
    this.seedsPath = path.join(process.cwd(), 'data/seo/url-seeds.json');
    this.pagesPath = path.join(process.cwd(), 'public/vin');
    this.gscCachePath = path.join(process.cwd(), 'data/seo/gsc-cache.json');
  }

  /**
   * Анализ текущего состояния
   */
  async analyze() {
    log('SEED-ANALYZER', 'Starting analysis');

    const existingCoverage = await this.analyzeExistingCoverage();
    const gaps = await this.identifyGaps(existingCoverage);
    const gscData = await this.loadGSCData();

    const analysis = {
      existingCoverage,
      gaps,
      gscData: gscData ? {
        urlsWithData: gscData.urlsWithData || 0,
        totalClicks: gscData.totalClicks || 0,
        avgCTR: gscData.avgCTR || 0,
        avgPosition: gscData.avgPosition || 0
      } : null,
      analyzedAt: new Date().toISOString()
    };

    log('SEED-ANALYZER', `Analysis complete: ${existingCoverage.states.length} states, ${existingCoverage.makes.length} makes, ${gaps.missingStates.length} missing states`);
    
    return analysis;
  }

  /**
   * Анализ существующего покрытия
   */
  async analyzeExistingCoverage() {
    const coverage = {
      states: new Set(),
      makes: new Set(),
      years: new Set(),
      vins: new Set(),
      intents: new Set(),
      languages: new Set(),
      combinations: new Set()
    };

    // Анализ текущего seed-list
    const seeds = this.loadSeeds();
    if (seeds.states) {
      seeds.states.forEach(s => coverage.states.add(s.slug || s));
    }
    if (seeds.makes) {
      seeds.makes.forEach(m => coverage.makes.add(m.slug || m));
    }
    if (seeds.years) {
      seeds.years.forEach(y => coverage.years.add(y));
    }
    if (seeds.vinExamples) {
      seeds.vinExamples.forEach(v => coverage.vins.add(v));
    }

    // Анализ созданных страниц
    if (fs.existsSync(this.pagesPath)) {
      const pages = this.scanPages(this.pagesPath);
      pages.forEach(page => {
        if (page.stateSlug) coverage.states.add(page.stateSlug);
        if (page.make) coverage.makes.add(page.make);
        if (page.year) coverage.years.add(page.year);
        if (page.vin) coverage.vins.add(page.vin);
        if (page.intent) coverage.intents.add(page.intent);
        if (page.lang) coverage.languages.add(page.lang);
        
        const combo = `${page.make}|${page.year}|${page.stateSlug}`;
        coverage.combinations.add(combo);
      });
    }

    return {
      states: Array.from(coverage.states),
      makes: Array.from(coverage.makes),
      years: Array.from(coverage.years).sort((a, b) => b - a),
      vins: Array.from(coverage.vins),
      intents: Array.from(coverage.intents),
      languages: Array.from(coverage.languages),
      combinations: Array.from(coverage.combinations)
    };
  }

  /**
   * Выявление пробелов в покрытии
   */
  async identifyGaps(existingCoverage) {
    const gaps = {
      missingStates: [],
      missingMakes: [],
      missingYears: [],
      missingCombinations: [],
      missingIntents: [],
      missingLanguages: []
    };

    // Все возможные штаты США
    const allStates = [
      'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
      'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho',
      'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana',
      'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota',
      'mississippi', 'missouri', 'montana', 'nebraska', 'nevada',
      'new-hampshire', 'new-jersey', 'new-mexico', 'new-york',
      'north-carolina', 'north-dakota', 'ohio', 'oklahoma', 'oregon',
      'pennsylvania', 'rhode-island', 'south-carolina', 'south-dakota',
      'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington',
      'west-virginia', 'wisconsin', 'wyoming', 'district-of-columbia'
    ];

    // Популярные бренды
    const popularMakes = [
      'toyota', 'honda', 'ford', 'chevrolet', 'nissan', 'bmw', 'mercedes-benz',
      'audi', 'volkswagen', 'hyundai', 'kia', 'mazda', 'subaru', 'lexus',
      'acura', 'infiniti', 'cadillac', 'jeep', 'ram', 'gmc', 'dodge',
      'chrysler', 'buick', 'lincoln', 'tesla', 'volvo', 'porsche', 'jaguar',
      'land-rover', 'mini', 'mitsubishi', 'genesis'
    ];

    // Годы (2000-2025)
    const allYears = Array.from({ length: 26 }, (_, i) => 2000 + i);

    // Находим отсутствующие штаты
    gaps.missingStates = allStates.filter(s => !existingCoverage.states.includes(s));

    // Находим отсутствующие бренды
    gaps.missingMakes = popularMakes.filter(m => !existingCoverage.makes.includes(m));

    // Находим отсутствующие годы
    gaps.missingYears = allYears.filter(y => !existingCoverage.years.includes(y));

    // Находим отсутствующие комбинации (топ-10)
    const topMakes = existingCoverage.makes.slice(0, 10);
    const topYears = existingCoverage.years.slice(0, 5);
    const topStates = existingCoverage.states.slice(0, 10);
    
    topMakes.forEach(make => {
      topYears.forEach(year => {
        topStates.forEach(state => {
          const combo = `${make}|${year}|${state}`;
          if (!existingCoverage.combinations.has(combo)) {
            gaps.missingCombinations.push({ make, year, state });
          }
        });
      });
    });

    // Проверяем intents
    const allIntents = this.config.intents || [];
    gaps.missingIntents = allIntents.filter(i => !existingCoverage.intents.includes(i));

    // Проверяем языки
    const allLanguages = this.config.languages || ['en'];
    gaps.missingLanguages = allLanguages.filter(l => !existingCoverage.languages.includes(l));

    return gaps;
  }

  /**
   * Загрузка текущего seed-list
   */
  loadSeeds() {
    try {
      if (fs.existsSync(this.seedsPath)) {
        return JSON.parse(fs.readFileSync(this.seedsPath, 'utf8'));
      }
    } catch (e) {
      log('SEED-ANALYZER', `Error loading seeds: ${e.message}`);
    }
    return {
      states: [],
      makes: [],
      years: [],
      vinExamples: []
    };
  }

  /**
   * Сканирование созданных страниц
   */
  scanPages(pagesPath, maxDepth = 3, maxFiles = 1000) {
    const pages = [];
    let fileCount = 0;

    const scanDir = (dir, depth = 0) => {
      if (depth > maxDepth || fileCount >= maxFiles) return;
      
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (fileCount >= maxFiles) break;
          
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            scanDir(fullPath, depth + 1);
          } else if (entry.isFile() && entry.name === 'index.html') {
            // Парсим путь: public/vin/{vin}/{state}/index.html
            const parts = fullPath.split(path.sep);
            const vinIndex = parts.indexOf('vin');
            if (vinIndex >= 0 && vinIndex + 2 < parts.length) {
              pages.push({
                vin: parts[vinIndex + 1],
                stateSlug: parts[vinIndex + 2],
                path: fullPath
              });
              fileCount++;
            }
          }
        }
      } catch (e) {
        // Ignore errors
      }
    };

    scanDir(pagesPath);
    return pages;
  }

  /**
   * Загрузка GSC данных (если доступно)
   */
  async loadGSCData() {
    try {
      if (fs.existsSync(this.gscCachePath)) {
        return JSON.parse(fs.readFileSync(this.gscCachePath, 'utf8'));
      }
    } catch (e) {
      log('SEED-ANALYZER', `Error loading GSC data: ${e.message}`);
    }
    return null;
  }
}

module.exports = { SeedAnalyzer };


