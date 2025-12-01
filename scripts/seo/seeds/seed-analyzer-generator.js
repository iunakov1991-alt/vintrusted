const fs = require('fs');
const path = require('path');
const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Unified Seed Analyzer & Generator
 * Объединенный модуль для анализа и генерации seeds (ТРИЗ оптимизация)
 */
class SeedAnalyzerGenerator {
  constructor(config) {
    this.config = config;
    this.seedsPath = path.join(process.cwd(), 'data/seo/url-seeds.json');
    this.pagesPath = path.join(process.cwd(), 'public/vin');
    this.gscCachePath = path.join(process.cwd(), 'data/seo/gsc-cache.json');
  }

  /**
   * Полный анализ и генерация расширенного seed-list
   */
  async analyzeAndGenerate() {
    log('SEED-ANALYZER-GEN', 'Starting unified analysis and generation');

    try {
      // 1. Анализ текущего состояния
      const existingCoverage = await this.analyzeExistingCoverage();
      
      // 2. Выявление пробелов
      const gaps = await this.identifyGaps(existingCoverage);
      
      // 3. Загрузка GSC данных (если доступно)
      const gscData = await this.loadGSCData();
      
      // 4. Генерация расширенного seed-list
      const expanded = this.generateExpandedSeeds(existingCoverage, gaps);
      
      const analysis = {
        existingCoverage,
        gaps,
        gscData: gscData ? {
          urlsWithData: gscData.urlsWithData || 0,
          totalClicks: gscData.totalClicks || 0,
          avgCTR: gscData.avgCTR || 0,
          avgPosition: gscData.avgPosition || 0
        } : null,
        expandedSeeds: expanded.expandedSeeds,
        additions: expanded.additions,
        analyzedAt: new Date().toISOString()
      };

      log('SEED-ANALYZER-GEN', `Analysis complete: ${existingCoverage.states.length} states, ${existingCoverage.makes.length} makes, ${gaps.missingStates.length} missing states`);
      log('SEED-ANALYZER-GEN', `Expanded: +${expanded.additions.states.length} states, +${expanded.additions.makes.length} makes, +${expanded.additions.years.length} years`);
      
      return analysis;
    } catch (e) {
      log('SEED-ANALYZER-GEN', `Error during analysis: ${e.message}`);
      return this.getFallbackAnalysis();
    }
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
   * Генерация расширенного seed-list
   */
  generateExpandedSeeds(existingCoverage, gaps) {
    const expanded = {
      states: [...existingCoverage.states],
      makes: [...existingCoverage.makes],
      years: [...existingCoverage.years],
      vinExamples: [...existingCoverage.vins],
      intents: [...existingCoverage.intents],
      languages: [...existingCoverage.languages]
    };

    const additions = {
      states: [],
      makes: [],
      years: [],
      vinExamples: [],
      intents: [],
      languages: []
    };

    // Добавляем отсутствующие штаты (топ-10 по приоритету)
    const priorityStates = this.getPriorityStates(gaps.missingStates);
    priorityStates.slice(0, 10).forEach(state => {
      if (!expanded.states.includes(state)) {
        expanded.states.push(state);
        additions.states.push(state);
      }
    });

    // Добавляем отсутствующие бренды (топ-15)
    gaps.missingMakes.slice(0, 15).forEach(make => {
      if (!expanded.makes.includes(make)) {
        expanded.makes.push({ slug: make });
        additions.makes.push(make);
      }
    });

    // Добавляем отсутствующие годы (последние 5 лет + популярные)
    const recentYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
    const popularYears = [2015, 2018, 2020, 2022, 2023, 2024];
    const yearsToAdd = [...new Set([...recentYears, ...popularYears])];
    
    yearsToAdd.forEach(year => {
      if (!expanded.years.includes(year)) {
        expanded.years.push(year);
        additions.years.push(year);
      }
    });

    // Генерируем error-VIN вариации
    const errorVINs = this.generateErrorVINs();
    errorVINs.forEach(vin => {
      if (!expanded.vinExamples.includes(vin)) {
        expanded.vinExamples.push(vin);
        additions.vinExamples.push(vin);
      }
    });

    // Добавляем отсутствующие intents
    gaps.missingIntents.forEach(intent => {
      if (!expanded.intents.includes(intent)) {
        expanded.intents.push(intent);
        additions.intents.push(intent);
      }
    });

    // Добавляем отсутствующие языки
    gaps.missingLanguages.forEach(lang => {
      if (!expanded.languages.includes(lang)) {
        expanded.languages.push(lang);
        additions.languages.push(lang);
      }
    });

    // Сортируем
    expanded.states.sort();
    expanded.years.sort((a, b) => b - a);

    return {
      expandedSeeds: expanded,
      additions
    };
  }

  /**
   * Приоритетные штаты (по населению и автомобильному рынку)
   */
  getPriorityStates(missingStates) {
    const priority = [
      'california', 'texas', 'florida', 'new-york', 'pennsylvania',
      'illinois', 'ohio', 'georgia', 'north-carolina', 'michigan',
      'new-jersey', 'virginia', 'washington', 'arizona', 'massachusetts',
      'tennessee', 'indiana', 'missouri', 'maryland', 'wisconsin'
    ];

    return missingStates.sort((a, b) => {
      const aIndex = priority.indexOf(a);
      const bIndex = priority.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }

  /**
   * Генерация error-VIN вариаций
   */
  generateErrorVINs() {
    const errorVINs = [];

    // VI (I вместо 1)
    errorVINs.push('1HGCM82633A00435I');
    errorVINs.push('4T1BF1FK3FU12345I');

    // O0 (O вместо 0)
    errorVINs.push('1HGCM82633A00435O');
    errorVINs.push('4T1BF1FK3FU12345O');

    // Короткие VIN (15 символов)
    errorVINs.push('1HGCM82633A0043');
    errorVINs.push('4T1BF1FK3FU1234');

    // Неправильный формат
    errorVINs.push('1HGCM82633A004352X'); // 18 символов
    errorVINs.push('1HGCM82633A0043'); // 15 символов

    return errorVINs;
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
      log('SEED-ANALYZER-GEN', `Error loading seeds: ${e.message}`);
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
      log('SEED-ANALYZER-GEN', `Error loading GSC data: ${e.message}`);
    }
    return null;
  }

  /**
   * Fallback анализ
   */
  getFallbackAnalysis() {
    const seeds = this.loadSeeds();
    return {
      existingCoverage: {
        states: seeds.states || [],
        makes: seeds.makes || [],
        years: seeds.years || [],
        vins: seeds.vinExamples || [],
        intents: [],
        languages: [],
        combinations: []
      },
      gaps: {
        missingStates: [],
        missingMakes: [],
        missingYears: [],
        missingCombinations: [],
        missingIntents: [],
        missingLanguages: []
      },
      expandedSeeds: seeds,
      additions: {
        states: [],
        makes: [],
        years: [],
        vinExamples: [],
        intents: [],
        languages: []
      },
      analyzedAt: new Date().toISOString()
    };
  }
}

// Экспортируем для обратной совместимости
module.exports = { SeedAnalyzerGenerator };

// Также экспортируем старые классы для совместимости (deprecated)
module.exports.SeedAnalyzer = SeedAnalyzerGenerator;
module.exports.SeedGenerator = SeedAnalyzerGenerator;


