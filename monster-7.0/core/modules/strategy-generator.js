/**
 * [B] SEO STRATEGY GENERATOR
 * 
 * Строит стратегию до 1,000,000 страниц.
 * Потоковая обработка для M1.
 * Использует AI Knowledge Core для оптимизации.
 */

const fs = require('fs');
const path = require('path');

class StrategyGenerator {
  constructor(config) {
    this.config = config;
    this.strategiesPath = path.join(process.cwd(), 'data/strategies');
    this.maxPages = config.modules?.strategyGenerator?.maxPages || 1000000;
  }

  async execute(params = {}) {
    const { semanticMap } = params;

    // Генерация стратегии на основе Semantic Map
    const strategy = await this.generateStrategy(semanticMap);

    // Оптимизация стратегии через AI Knowledge Core
    const optimizedStrategy = await this.optimizeStrategy(strategy, semanticMap);

    // Сохранение
    this.saveStrategy(optimizedStrategy);

    return optimizedStrategy;
  }

  async generateStrategy(semanticMap) {
    const strategy = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      targetPages: this.calculateTargetPages(semanticMap),
      priorities: [],
      clusters: [],
      keywords: [],
      intents: [],
      constraints: {
        memory: 6144, // 6GB
        concurrency: 4,
        batchSize: 100,
        streaming: true,
        cacheEnabled: true
      },
      distribution: {
        highPriority: 0.4,  // 40% высокоприоритетных
        mediumPriority: 0.4, // 40% средних
        lowPriority: 0.2     // 20% низких
      }
    };

    // Приоритеты на основе Semantic Map
    strategy.priorities = this.buildPriorities(semanticMap);
    
    // Кластеры
    strategy.clusters = this.buildClusterStrategy(semanticMap);
    
    // Ключевые слова
    strategy.keywords = this.buildKeywordStrategy(semanticMap);
    
    // Интенты
    strategy.intents = this.buildIntentStrategy(semanticMap);
    
    // Распределение страниц
    strategy.pageDistribution = this.calculatePageDistribution(strategy);

    return strategy;
  }

  /**
   * Расчет целевого количества страниц
   */
  calculateTargetPages(semanticMap) {
    // Базовое количество на основе покрытия
    const basePages = 100000;
    
    // Увеличение на основе пробелов
    const gapMultiplier = semanticMap.gaps?.length || 0;
    const gapPages = gapMultiplier * 10000;
    
    // Увеличение на основе кластеров
    const clusterPages = (semanticMap.clusters?.length || 0) * 5000;
    
    // Увеличение на основе ключевых слов
    const keywordPages = Math.min((semanticMap.keywords?.length || 0) * 100, 50000);
    
    const total = basePages + gapPages + clusterPages + keywordPages;
    
    // Ограничение максимумом
    return Math.min(total, this.maxPages);
  }

  /**
   * Построение приоритетов
   */
  buildPriorities(semanticMap) {
    const priorities = [];

    // Высокий приоритет: пробелы
    if (semanticMap.gaps) {
      semanticMap.gaps.forEach(gap => {
        priorities.push({
          type: gap.type,
          theme: gap.theme,
          priority: 'high',
          pages: this.calculatePagesForGap(gap),
          reason: gap.suggestion || `Fill gap: ${gap.type}`,
          urgency: gap.priority === 'high' ? 1.0 : 0.7
        });
      });
    }

    // Средний приоритет: расширение существующих кластеров
    if (semanticMap.clusters) {
      semanticMap.clusters.forEach(cluster => {
        priorities.push({
          type: 'cluster-expansion',
          cluster: cluster.name,
          priority: 'medium',
          pages: this.calculatePagesForCluster(cluster),
          reason: `Expand cluster: ${cluster.name}`,
          urgency: 0.5
        });
      });
    }

    // Низкий приоритет: новые темы
    if (semanticMap.themes) {
      const uncoveredThemes = semanticMap.themes.filter(theme => 
        !priorities.some(p => p.theme === theme)
      );
      
      uncoveredThemes.slice(0, 10).forEach(theme => {
        priorities.push({
          type: 'new-theme',
          theme,
          priority: 'low',
          pages: 1000,
          reason: `Cover new theme: ${theme}`,
          urgency: 0.3
        });
      });
    }

    // Сортировка по приоритету и срочности
    return priorities.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.urgency - a.urgency;
    });
  }

  /**
   * Построение кластерной стратегии
   */
  buildClusterStrategy(semanticMap) {
    const clusters = [];
    
    if (!semanticMap.clusters) return clusters;

    semanticMap.clusters.forEach(cluster => {
      const clusterStrategy = {
        name: cluster.name,
        targetPages: this.calculatePagesForCluster(cluster),
        currentPages: cluster.pages?.length || 0,
        strategy: 'expand',
        layout: 'varied',
        priority: this.calculateClusterPriority(cluster),
        keywords: this.extractClusterKeywords(cluster),
        intents: this.extractClusterIntents(cluster, semanticMap)
      };

      clusters.push(clusterStrategy);
    });

    // Добавление новых кластеров на основе пробелов
    if (semanticMap.gaps) {
      semanticMap.gaps.forEach(gap => {
        if (gap.type === 'insufficient-clusters') {
          const newClusters = this.generateNewClusters(gap);
          clusters.push(...newClusters);
        }
      });
    }

    return clusters;
  }

  /**
   * Построение стратегии ключевых слов
   */
  buildKeywordStrategy(semanticMap) {
    const keywords = semanticMap.keywords || [];
    
    return keywords.slice(0, 500).map(kw => ({
      keyword: kw.word || kw,
      count: kw.count || 1,
      priority: this.calculateKeywordPriority(kw),
      targetPages: Math.ceil((kw.count || 1) / 10), // 10 страниц на каждое упоминание
      intent: this.mapKeywordToIntent(kw)
    }));
  }

  /**
   * Построение стратегии интентов
   */
  buildIntentStrategy(semanticMap) {
    const intents = [
      'vin_check',
      'accident_check',
      'ownership_history',
      'market_value',
      'dmv_records',
      'title_brand',
      'odometer_rollback',
      'theft_records'
    ];

    const intentMapping = semanticMap.intentMapping || {};
    
    return intents.map(intent => ({
      intent,
      currentPages: intentMapping[intent]?.length || 0,
      targetPages: this.calculatePagesForIntent(intent, intentMapping[intent]),
      priority: this.calculateIntentPriority(intent, intentMapping[intent]),
      keywords: this.getIntentKeywords(intent)
    }));
  }

  /**
   * Расчет распределения страниц
   */
  calculatePageDistribution(strategy) {
    const total = strategy.targetPages;
    const distribution = {
      high: Math.floor(total * strategy.distribution.highPriority),
      medium: Math.floor(total * strategy.distribution.mediumPriority),
      low: Math.floor(total * strategy.distribution.lowPriority)
    };

    // Распределение по кластерам
    distribution.clusters = {};
    strategy.clusters.forEach(cluster => {
      distribution.clusters[cluster.name] = cluster.targetPages;
    });

    // Распределение по интентам
    distribution.intents = {};
    strategy.intents.forEach(intent => {
      distribution.intents[intent.intent] = intent.targetPages;
    });

    return distribution;
  }

  /**
   * Оптимизация стратегии через AI Knowledge Core
   */
  async optimizeStrategy(strategy, semanticMap) {
    // Заглушка: в реальности здесь будет использование AI Knowledge Core
    // для оптимизации стратегии на основе best practices
    
    const optimized = { ...strategy };
    
    // Оптимизация на основе SEO best practices
    optimized.seoOptimizations = {
      contentDepth: 'high',
      eEAT: true,
      structuredData: true,
      internalLinking: true,
      mobileFirst: true
    };

    // Оптимизация на основе TRIZ
    optimized.trizOptimizations = {
      separation: 'Separate high/medium/low priority pages',
      mediator: 'Use AI Knowledge Core as mediator',
      preliminaryAction: 'Pre-generate templates',
      selfService: 'Automated optimization'
    };

    return optimized;
  }

  // Вспомогательные методы

  calculatePagesForGap(gap) {
    if (gap.type === 'missing-theme') return 5000;
    if (gap.type === 'insufficient-clusters') return gap.recommended * 1000;
    if (gap.type === 'insufficient-keywords') return gap.recommended * 50;
    return 2000;
  }

  calculatePagesForCluster(cluster) {
    const current = cluster.pages?.length || 0;
    return Math.max(1000, current * 2); // Удвоить текущее количество
  }

  calculateClusterPriority(cluster) {
    const size = cluster.pages?.length || 0;
    if (size > 100) return 'high';
    if (size > 50) return 'medium';
    return 'low';
  }

  extractClusterKeywords(cluster) {
    // Заглушка: извлечение ключевых слов из кластера
    return [];
  }

  extractClusterIntents(cluster, semanticMap) {
    // Заглушка: извлечение интентов из кластера
    return [];
  }

  generateNewClusters(gap) {
    // Генерация новых кластеров на основе пробелов
    return [];
  }

  calculateKeywordPriority(keyword) {
    const count = keyword.count || 1;
    if (count > 50) return 'high';
    if (count > 20) return 'medium';
    return 'low';
  }

  mapKeywordToIntent(keyword) {
    // Маппинг ключевого слова к интенту
    const word = (keyword.word || keyword).toLowerCase();
    if (word.includes('vin')) return 'vin_check';
    if (word.includes('accident')) return 'accident_check';
    if (word.includes('ownership')) return 'ownership_history';
    if (word.includes('value')) return 'market_value';
    if (word.includes('dmv')) return 'dmv_records';
    if (word.includes('title')) return 'title_brand';
    if (word.includes('odometer')) return 'odometer_rollback';
    if (word.includes('theft')) return 'theft_records';
    return 'generic';
  }

  calculatePagesForIntent(intent, currentPages) {
    const current = currentPages?.length || 0;
    const base = 10000; // Базовое количество для каждого интента
    return Math.max(base, current * 1.5);
  }

  calculateIntentPriority(intent, currentPages) {
    const current = currentPages?.length || 0;
    if (current < 100) return 'high'; // Нужно больше страниц
    if (current < 500) return 'medium';
    return 'low';
  }

  getIntentKeywords(intent) {
    // Ключевые слова для интента
    const keywordMap = {
      'vin_check': ['vin', 'vehicle identification', 'vin number'],
      'accident_check': ['accident', 'crash', 'collision', 'damage'],
      'ownership_history': ['owner', 'ownership', 'previous owner'],
      'market_value': ['value', 'price', 'worth', 'valuation'],
      'dmv_records': ['dmv', 'registration', 'title'],
      'title_brand': ['title', 'branded title', 'salvage'],
      'odometer_rollback': ['odometer', 'mileage', 'rollback'],
      'theft_records': ['theft', 'stolen', 'recovery']
    };
    return keywordMap[intent] || [];
  }

  saveStrategy(strategy) {
    try {
      if (!fs.existsSync(this.strategiesPath)) {
        fs.mkdirSync(this.strategiesPath, { recursive: true });
      }
      const filePath = path.join(this.strategiesPath, `strategy_${Date.now()}.json`);
      fs.writeFileSync(filePath, JSON.stringify(strategy, null, 2));
      
      // Сохранение последней стратегии
      const latestPath = path.join(this.strategiesPath, 'latest.json');
      fs.writeFileSync(latestPath, JSON.stringify(strategy, null, 2));
    } catch (error) {
      console.error('Error saving strategy:', error);
    }
  }
}

module.exports = StrategyGenerator;
