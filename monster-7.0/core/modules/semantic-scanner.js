/**
 * [A] SEMANTIC SCANNER
 * 
 * Сканирует нишу, строит Semantic Map.
 * Легкий, оптимизированный для M1.
 */

const fs = require('fs');
const path = require('path');

class SemanticScanner {
  constructor(config) {
    this.config = config;
    this.cachePath = path.join(process.cwd(), 'data/knowledge/semantic-map.json');
    this.cache = null;
  }

  /**
   * Выполнение сканирования
   */
  async execute(params = {}) {
    const { domain, forceRefresh = false } = params;

    // Проверка кэша
    if (!forceRefresh && this.loadCache()) {
      return {
        cached: true,
        semanticMap: this.cache
      };
    }

    // Сканирование
    const semanticMap = await this.scan(domain);

    // Сохранение в кэш
    this.saveCache(semanticMap);

    return {
      cached: false,
      semanticMap
    };
  }

  /**
   * Сканирование ниши
   */
  async scan(domain) {
    // M1 оптимизация: легкий парсинг
    const semanticMap = {
      domain,
      themes: [],
      clusters: [],
      gaps: [],
      competitors: [],
      keywords: [],
      intentMapping: {},
      timestamp: new Date().toISOString()
    };

    // Анализ текущих страниц (легкий)
    const pages = this.scanExistingPages();
    semanticMap.themes = this.extractThemes(pages);
    semanticMap.clusters = this.buildClusters(pages);
    semanticMap.keywords = this.extractKeywords(pages);
    semanticMap.intentMapping = this.mapIntents(pages);

    // Gap анализ
    semanticMap.gaps = this.findGaps(semanticMap.themes, semanticMap.clusters, semanticMap.keywords);

    // Конкурентный анализ (легкий)
    semanticMap.competitors = await this.analyzeCompetitors(domain);

    // Анализ покрытия
    semanticMap.coverage = this.analyzeCoverage(semanticMap);

    return semanticMap;
  }

  /**
   * Сканирование существующих страниц
   */
  scanExistingPages() {
    const pagesPath = path.join(process.cwd(), 'public/seo-pages');
    const pages = [];

    if (!fs.existsSync(pagesPath)) {
      return pages;
    }

    // Легкий обход (без загрузки всех файлов)
    const dirs = fs.readdirSync(pagesPath, { withFileTypes: true });
    
    for (const dir of dirs.slice(0, 100)) { // Ограничение для M1
      if (dir.isDirectory()) {
        const indexPath = path.join(pagesPath, dir.name, 'index.html');
        if (fs.existsSync(indexPath)) {
          const content = fs.readFileSync(indexPath, 'utf8');
          pages.push({
            path: dir.name,
            content: content.substring(0, 5000) // Только начало для анализа
          });
        }
      }
    }

    return pages;
  }

  /**
   * Извлечение тем
   */
  extractThemes(pages) {
    const themes = new Set();
    
    // Простой анализ ключевых слов
    pages.forEach(page => {
      const matches = page.content.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi);
      if (matches) {
        matches.forEach(match => {
          const text = match.replace(/<[^>]+>/g, '').toLowerCase();
          const words = text.split(/\s+/).filter(w => w.length > 4);
          words.forEach(word => themes.add(word));
        });
      }
    });

    return Array.from(themes).slice(0, 50); // Ограничение для M1
  }

  /**
   * Построение кластеров
   */
  buildClusters(pages) {
    const clusters = [];
    
    // Простая кластеризация по путям
    pages.forEach(page => {
      const parts = page.path.split('/');
      if (parts.length > 1) {
        const cluster = parts[0];
        if (!clusters.find(c => c.name === cluster)) {
          clusters.push({
            name: cluster,
            pages: []
          });
        }
        clusters.find(c => c.name === cluster).pages.push(page.path);
      }
    });

    return clusters;
  }

  /**
   * Извлечение ключевых слов
   */
  extractKeywords(pages) {
    const keywords = new Map();
    
    pages.forEach(page => {
      // Извлечение из title
      const titleMatch = page.content.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        const words = titleMatch[1].toLowerCase().split(/\s+/).filter(w => w.length > 3);
        words.forEach(word => {
          keywords.set(word, (keywords.get(word) || 0) + 1);
        });
      }

      // Извлечение из h1-h3
      const headingMatches = page.content.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi);
      if (headingMatches) {
        headingMatches.forEach(match => {
          const text = match.replace(/<[^>]+>/g, '').toLowerCase();
          const words = text.split(/\s+/).filter(w => w.length > 3);
          words.forEach(word => {
            keywords.set(word, (keywords.get(word) || 0) + 1);
          });
        });
      }
    });

    // Сортировка по частоте
    return Array.from(keywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100)
      .map(([word, count]) => ({ word, count }));
  }

  /**
   * Маппинг интентов
   */
  mapIntents(pages) {
    const intentMapping = {
      'vin_check': [],
      'accident_check': [],
      'ownership_history': [],
      'market_value': [],
      'dmv_records': [],
      'title_brand': [],
      'odometer_rollback': [],
      'theft_records': []
    };

    pages.forEach(page => {
      const path = page.path.toLowerCase();
      Object.keys(intentMapping).forEach(intent => {
        if (path.includes(intent.replace('_', '')) || path.includes(intent)) {
          intentMapping[intent].push(page.path);
        }
      });
    });

    return intentMapping;
  }

  /**
   * Поиск пробелов
   */
  findGaps(themes, clusters, keywords) {
    const gaps = [];
    
    // Проверка покрытия тем
    const expectedThemes = ['vin', 'history', 'report', 'accident', 'theft', 'ownership', 'dmv', 'title', 'odometer'];
    expectedThemes.forEach(theme => {
      if (!themes.some(t => t.includes(theme)) && 
          !keywords.some(k => k.word.includes(theme))) {
        gaps.push({
          type: 'missing-theme',
          theme,
          priority: 'high',
          suggestion: `Add content about ${theme}`
        });
      }
    });

    // Проверка кластеров
    if (clusters.length < 5) {
      gaps.push({
        type: 'insufficient-clusters',
        current: clusters.length,
        recommended: 10,
        priority: 'medium',
        suggestion: 'Expand to more topic clusters'
      });
    }

    // Проверка ключевых слов
    if (keywords.length < 50) {
      gaps.push({
        type: 'insufficient-keywords',
        current: keywords.length,
        recommended: 100,
        priority: 'medium',
        suggestion: 'Expand keyword coverage'
      });
    }

    return gaps;
  }

  /**
   * Анализ покрытия
   */
  analyzeCoverage(semanticMap) {
    const totalExpected = 10; // Ожидаемое количество кластеров
    const clusterCoverage = semanticMap.clusters.length / totalExpected;
    
    const totalExpectedThemes = 20;
    const themeCoverage = semanticMap.themes.length / totalExpectedThemes;

    return {
      clusters: {
        current: semanticMap.clusters.length,
        expected: totalExpected,
        coverage: Math.min(1, clusterCoverage),
        percent: Math.round(clusterCoverage * 100)
      },
      themes: {
        current: semanticMap.themes.length,
        expected: totalExpectedThemes,
        coverage: Math.min(1, themeCoverage),
        percent: Math.round(themeCoverage * 100)
      },
      overall: Math.round(((clusterCoverage + themeCoverage) / 2) * 100)
    };
  }

  /**
   * Анализ конкурентов (легкий)
   */
  async analyzeCompetitors(domain) {
    // Заглушка для легкого анализа
    return [
      {
        domain: 'carfax.com',
        strengths: ['brand', 'coverage'],
        weaknesses: ['pricing']
      }
    ];
  }

  /**
   * Загрузка кэша
   */
  loadCache() {
    try {
      if (fs.existsSync(this.cachePath)) {
        const data = fs.readFileSync(this.cachePath, 'utf8');
        this.cache = JSON.parse(data);
        
        // Проверка актуальности (24 часа)
        const age = Date.now() - new Date(this.cache.timestamp).getTime();
        if (age < 24 * 60 * 60 * 1000) {
          return true;
        }
      }
    } catch (error) {
      // Игнорируем ошибки кэша
    }
    return false;
  }

  /**
   * Сохранение кэша
   */
  saveCache(semanticMap) {
    try {
      const dir = path.dirname(this.cachePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.cachePath, JSON.stringify(semanticMap, null, 2));
    } catch (error) {
      // Игнорируем ошибки сохранения
    }
  }
}

module.exports = SemanticScanner;

