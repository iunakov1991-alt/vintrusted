const fs = require('fs');
const path = require('path');
const { log } = require('../logger');

/**
 * Seed Analyzer - анализирует существующие данные для определения "дыр" в покрытии
 */
class SeedAnalyzer {
  constructor(config) {
    this.config = config;
    this.seedsPath = path.join(process.cwd(), 'data/seo/url-seeds.json');
    this.pagesPath = path.join(process.cwd(), 'public/vin');
    this.gscPath = path.join(process.cwd(), 'data/seo/gsc-cache.json');
    this.buildHistoryPath = path.join(process.cwd(), 'data/seo/build-history.jsonl');
  }

  /**
   * Загрузка текущего seed-list
   */
  loadCurrentSeeds() {
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
   * Анализ существующих страниц
   */
  analyzeExistingPages() {
    const pages = [];
    const states = new Set();
    const makes = new Set();
    const years = new Set();
    const vins = new Set();
    const intents = new Set();
    const languages = new Set();

    try {
      if (fs.existsSync(this.pagesPath)) {
        // Ограничиваем анализ для предотвращения зависаний
        const files = this.getAllHtmlFiles(this.pagesPath);
        const maxFilesToProcess = 5000; // Ограничиваем обработку
        const filesToProcess = files.slice(0, maxFilesToProcess);
        
        log('SEED-ANALYZER', `Analyzing ${filesToProcess.length} of ${files.length} pages`);
        
        for (const file of filesToProcess) {
          const pageData = this.extractPageDataFromPath(file);
          if (pageData) {
            pages.push(pageData);
            if (pageData.state) states.add(pageData.state);
            if (pageData.make) makes.add(pageData.make);
            if (pageData.year) years.add(pageData.year);
            if (pageData.vin) vins.add(pageData.vin);
            if (pageData.intent) intents.add(pageData.intent);
            if (pageData.lang) languages.add(pageData.lang);
          }
        }
        
        // Если файлов больше чем обработали, используем статистику из build-history
        if (files.length > maxFilesToProcess) {
          log('SEED-ANALYZER', `Using build history for total page count (${files.length} files found, ${maxFilesToProcess} processed)`);
        }
      }
    } catch (e) {
      log('SEED-ANALYZER', `Error analyzing pages: ${e.message}`);
    }

    return {
      totalPages: pages.length,
      states: Array.from(states),
      makes: Array.from(makes),
      years: Array.from(years).sort((a, b) => a - b),
      vins: Array.from(vins),
      intents: Array.from(intents),
      languages: Array.from(languages),
      pages
    };
  }

  /**
   * Рекурсивный поиск всех HTML файлов
   * Ограничиваем глубину и количество для предотвращения зависаний
   */
  getAllHtmlFiles(dir, depth = 0, maxDepth = 10, maxFiles = 10000) {
    const files = [];
    if (depth > maxDepth || files.length >= maxFiles) {
      log('SEED-ANALYZER', `Stopping file scan: depth=${depth}, files=${files.length}`);
      return files;
    }
    
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (files.length >= maxFiles) break;
        
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          files.push(...this.getAllHtmlFiles(fullPath, depth + 1, maxDepth, maxFiles));
        } else if (item.isFile() && item.name === 'index.html') {
          files.push(fullPath);
        }
      }
    } catch (e) {
      // Ignore errors
    }
    return files;
  }

  /**
   * Извлечение данных страницы из пути
   * Формат: public/vin/{vin}/{state}/index.html
   */
  extractPageDataFromPath(filePath) {
    try {
      const relativePath = path.relative(this.pagesPath, filePath);
      const parts = relativePath.split(path.sep);
      if (parts.length >= 2) {
        return {
          vin: parts[0],
          state: parts[1],
          make: this.extractMakeFromVin(parts[0]),
          year: this.extractYearFromVin(parts[0]),
          intent: 'vin_check', // Default
          lang: 'en' // Default
        };
      }
    } catch (e) {
      // Ignore
    }
    return null;
  }

  /**
   * Базовое извлечение марки из VIN (можно улучшить)
   */
  extractMakeFromVin(vin) {
    if (!vin || vin.length < 3) return null;
    // Простая эвристика - первые символы VIN могут указывать на производителя
    // В реальности нужна более сложная логика
    return null; // Пока возвращаем null, будет определяться из других источников
  }

  /**
   * Базовое извлечение года из VIN (можно улучшить)
   */
  extractYearFromVin(vin) {
    if (!vin || vin.length < 10) return null;
    // 10-й символ VIN указывает на год (но это сложная логика)
    return null; // Пока возвращаем null
  }

  /**
   * Анализ GSC данных (если доступны)
   */
  analyzeGSCData() {
    try {
      if (fs.existsSync(this.gscPath)) {
        const gscData = JSON.parse(fs.readFileSync(this.gscPath, 'utf8'));
        const urls = gscData.urls || [];
        
        const indexed = urls.filter(u => u.indexed === true);
        const notIndexed = urls.filter(u => u.indexed === false);
        const withImpressions = urls.filter(u => (u.impressions || 0) > 0);
        const withClicks = urls.filter(u => (u.clicks || 0) > 0);
        
        // Анализ роста/падения
        const growing = urls.filter(u => {
          const trend = u.trend || 0;
          return trend > 0.1; // Рост > 10%
        });
        
        const declining = urls.filter(u => {
          const trend = u.trend || 0;
          return trend < -0.1; // Падение > 10%
        });

        // Извлечение паттернов из URL
        const patterns = this.extractPatternsFromUrls(urls);

        return {
          totalUrls: urls.length,
          indexed: indexed.length,
          notIndexed: notIndexed.length,
          withImpressions: withImpressions.length,
          withClicks: withClicks.length,
          growing: growing.length,
          declining: declining.length,
          patterns,
          topPerforming: urls
            .filter(u => (u.clicks || 0) > 0)
            .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
            .slice(0, 50)
        };
      }
    } catch (e) {
      log('SEED-ANALYZER', `Error analyzing GSC data: ${e.message}`);
    }

    return null; // GSC данные недоступны
  }

  /**
   * Извлечение паттернов из URL
   */
  extractPatternsFromUrls(urls) {
    const states = new Set();
    const makes = new Set();
    const years = new Set();
    const vins = new Set();

    for (const url of urls) {
      const urlPath = url.url || '';
      // Формат: /vin/{vin}/{state}/
      const match = urlPath.match(/\/vin\/([^\/]+)\/([^\/]+)/);
      if (match) {
        const vin = match[1];
        const state = match[2];
        vins.add(vin);
        states.add(state);
        // Можно попытаться извлечь make/year из VIN или из других источников
      }
    }

    return {
      states: Array.from(states),
      makes: Array.from(makes),
      years: Array.from(years),
      vins: Array.from(vins)
    };
  }

  /**
   * Анализ истории билдов
   */
  analyzeBuildHistory() {
    const history = [];
    try {
      if (fs.existsSync(this.buildHistoryPath)) {
        const lines = fs.readFileSync(this.buildHistoryPath, 'utf8').split('\n').filter(Boolean);
        for (const line of lines.slice(-10)) { // Последние 10 билдов
          try {
            history.push(JSON.parse(line));
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    } catch (e) {
      log('SEED-ANALYZER', `Error analyzing build history: ${e.message}`);
    }

    return {
      recentBuilds: history,
      avgPagesGenerated: history.length > 0 
        ? history.reduce((sum, b) => sum + (b.pagesGenerated || 0), 0) / history.length 
        : 0,
      avgQuality: history.length > 0
        ? history.reduce((sum, b) => sum + (b.avgQuality || 0), 0) / history.length
        : 0
    };
  }

  /**
   * Определение "дыр" в покрытии
   */
  identifyCoverageGaps(currentSeeds, existingPages, gscData) {
    const gaps = {
      missingStates: [],
      missingMakes: [],
      missingYears: [],
      missingIntents: [],
      missingLanguages: [],
      missingVinPatterns: [],
      uncoveredCombinations: []
    };

    // Все штаты США
    const allStates = [
      'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
      'connecticut', 'delaware', 'district-of-columbia', 'florida', 'georgia',
      'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky',
      'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota',
      'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new-hampshire',
      'new-jersey', 'new-mexico', 'new-york', 'north-carolina', 'north-dakota',
      'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode-island',
      'south-carolina', 'south-dakota', 'tennessee', 'texas', 'utah', 'vermont',
      'virginia', 'washington', 'washington-dc', 'west-virginia', 'wisconsin', 'wyoming'
    ];

    // Проверка штатов
    const existingStates = new Set(existingPages.states.map(s => s.toLowerCase()));
    gaps.missingStates = allStates.filter(s => !existingStates.has(s));

    // Популярные марки (можно расширить)
    const popularMakes = [
      'toyota', 'honda', 'ford', 'chevrolet', 'nissan', 'hyundai', 'kia',
      'subaru', 'mazda', 'volkswagen', 'bmw', 'mercedes-benz', 'audi',
      'lexus', 'acura', 'infiniti', 'jeep', 'dodge', 'chrysler', 'ram',
      'gmc', 'cadillac', 'buick', 'tesla', 'volvo', 'porsche', 'land-rover',
      'jaguar', 'mini', 'mitsubishi', 'genesis'
    ];

    const existingMakes = new Set(existingPages.makes.map(m => m.toLowerCase()));
    gaps.missingMakes = popularMakes.filter(m => !existingMakes.has(m));

    // Годы (2010-2025)
    const allYears = Array.from({ length: 16 }, (_, i) => 2010 + i);
    const existingYears = new Set(existingPages.years);
    gaps.missingYears = allYears.filter(y => !existingYears.has(y));

    // Intents
    const allIntents = this.config.intents || [
      'vin_check', 'accident_check', 'ownership_history', 'market_value',
      'dmv_records', 'title_brand', 'odometer_rollback', 'theft_records'
    ];
    const existingIntents = new Set(existingPages.intents);
    gaps.missingIntents = allIntents.filter(i => !existingIntents.has(i));

    // Языки
    const allLanguages = this.config.languages || ['en', 'es'];
    const existingLanguages = new Set(existingPages.languages);
    gaps.missingLanguages = allLanguages.filter(l => !existingLanguages.has(l));

    // VIN паттерны (error cases)
    gaps.missingVinPatterns = [
      'short-vin', // Короткие VIN
      'invalid-vin', // Невалидные VIN
      'zero-vin', // VIN с нулями
      'repeated-vin' // Повторяющиеся символы
    ];

    return gaps;
  }

  /**
   * Полный анализ для AI
   */
  performFullAnalysis() {
    log('SEED-ANALYZER', 'Starting full analysis...');

    const currentSeeds = this.loadCurrentSeeds();
    const existingPages = this.analyzeExistingPages();
    const gscData = this.analyzeGSCData();
    const buildHistory = this.analyzeBuildHistory();
    const coverageGaps = this.identifyCoverageGaps(currentSeeds, existingPages, gscData);

    log('SEED-ANALYZER', `Analysis complete: ${existingPages.totalPages} pages, ${coverageGaps.missingStates.length} missing states`);

    return {
      currentSeeds,
      existingPages,
      gscData,
      buildHistory,
      coverageGaps
    };
  }
}

module.exports = { SeedAnalyzer };

