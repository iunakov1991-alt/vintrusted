const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Crawl Budget Engine
 * Расширенный контроль crawl budget с приоритетами и стратегиями
 */
class CrawlBudgetEngine {
  constructor(config) {
    this.config = config;
    this.crawlBudget = config.crawlBudget || {
      highPriority: 0.4,
      mediumPriority: 0.4,
      lowPriority: 0.2
    };
  }

  /**
   * Расчет приоритета страницы для crawl budget
   */
  calculatePagePriority(page) {
    let priority = 0.5; // базовый приоритет

    // Приоритет на основе качества
    if (page.qualityScore) {
      priority += page.qualityScore * 0.3;
    }

    // Приоритет на основе кластера
    if (page.clusterId) {
      const clusterScore = this.getClusterPriority(page.clusterId);
      priority += clusterScore * 0.2;
    }

    // Приоритет на основе intent
    const intentPriority = this.getIntentPriority(page.intent);
    priority += intentPriority * 0.2;

    // Приоритет на основе языка
    const languagePriority = page.lang === 'en' ? 0.1 : 0.05;
    priority += languagePriority;

    // Приоритет на основе уникальности
    if (page.uniqueness && page.uniqueness.isUnique) {
      priority += 0.1;
    }

    // Нормализация к диапазону 0-1
    priority = Math.min(1.0, Math.max(0.0, priority));

    return priority;
  }

  /**
   * Получение приоритета кластера
   */
  getClusterPriority(clusterId) {
    // В реальной реализации здесь была бы логика на основе
    // исторических данных о производительности кластера
    return 0.5;
  }

  /**
   * Получение приоритета intent
   */
  getIntentPriority(intent) {
    const intentPriorities = {
      'vin_check': 0.9,
      'accident_check': 0.8,
      'ownership_history': 0.7,
      'market_value': 0.6,
      'dmv_records': 0.7,
      'title_brand': 0.8,
      'odometer_rollback': 0.7,
      'theft_records': 0.6
    };

    return intentPriorities[intent] || 0.5;
  }

  /**
   * Категоризация страниц по приоритетам
   */
  categorizePages(pages) {
    const categorized = {
      high: [],
      medium: [],
      low: []
    };

    for (const page of pages) {
      const priority = this.calculatePagePriority(page);
      page.crawlPriority = priority;

      if (priority >= 0.7) {
        categorized.high.push(page);
      } else if (priority >= 0.4) {
        categorized.medium.push(page);
      } else {
        categorized.low.push(page);
      }
    }

    return categorized;
  }

  /**
   * Распределение crawl budget
   */
  distributeCrawlBudget(pages, totalBudget = 10000) {
    const categorized = this.categorizePages(pages);

    const highBudget = Math.floor(totalBudget * this.crawlBudget.highPriority);
    const mediumBudget = Math.floor(totalBudget * this.crawlBudget.mediumPriority);
    const lowBudget = totalBudget - highBudget - mediumBudget;

    // Сортировка страниц внутри категорий по приоритету
    categorized.high.sort((a, b) => (b.crawlPriority || 0) - (a.crawlPriority || 0));
    categorized.medium.sort((a, b) => (b.crawlPriority || 0) - (a.crawlPriority || 0));
    categorized.low.sort((a, b) => (b.crawlPriority || 0) - (a.crawlPriority || 0));

    // Распределение страниц в соответствии с budget
    const selected = {
      high: categorized.high.slice(0, highBudget),
      medium: categorized.medium.slice(0, mediumBudget),
      low: categorized.low.slice(0, lowBudget)
    };

    const allSelected = [...selected.high, ...selected.medium, ...selected.low];

    log('CRAWL', `Crawl budget distributed: ${allSelected.length} pages (high: ${selected.high.length}, medium: ${selected.medium.length}, low: ${selected.low.length})`);

    return {
      selected: allSelected,
      categorized: selected,
      budget: {
        high: highBudget,
        medium: mediumBudget,
        low: lowBudget,
        total: totalBudget
      }
    };
  }

  /**
   * Расчет частоты обновления для страниц
   */
  calculateUpdateFrequency(page) {
    const priority = page.crawlPriority || this.calculatePagePriority(page);

    // Высокоприоритетные страницы обновляются чаще
    if (priority >= 0.7) {
      return 'daily';
    } else if (priority >= 0.4) {
      return 'weekly';
    } else {
      return 'monthly';
    }
  }

  /**
   * Генерация стратегии crawl для sitemap
   */
  generateCrawlStrategy(pages) {
    const distribution = this.distributeCrawlBudget(pages);
    
    const strategy = {
      totalPages: pages.length,
      selectedPages: distribution.selected.length,
      distribution: distribution.categorized,
      budget: distribution.budget,
      updateFrequencies: {
        daily: 0,
        weekly: 0,
        monthly: 0
      }
    };

    // Подсчет частот обновления
    for (const page of distribution.selected) {
      const frequency = this.calculateUpdateFrequency(page);
      strategy.updateFrequencies[frequency]++;
      page.updateFrequency = frequency;
    }

    return strategy;
  }
}

module.exports = { CrawlBudgetEngine };

