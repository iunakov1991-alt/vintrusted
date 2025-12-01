const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Search Intent Classification
 * AI классифицирует search intent и оптимизирует контент под него
 */
class SearchIntentClassifier {
  constructor(config) {
    this.config = config;
    this.intentPatterns = {
      informational: [
        'what', 'how', 'why', 'when', 'where', 'who',
        'guide', 'tutorial', 'explain', 'learn', 'understand'
      ],
      navigational: [
        'login', 'sign in', 'account', 'profile',
        'official', 'website', 'site'
      ],
      transactional: [
        'buy', 'purchase', 'order', 'price', 'cost',
        'cheap', 'discount', 'deal', 'sale'
      ],
      commercial: [
        'best', 'top', 'review', 'compare', 'vs',
        'alternative', 'recommendation'
      ]
    };
  }

  /**
   * Классификация intent для ключевого слова
   */
  classifyIntent(keyword) {
    const lower = keyword.toLowerCase();
    const scores = {
      informational: 0,
      navigational: 0,
      transactional: 0,
      commercial: 0
    };

    // Подсчет совпадений с паттернами
    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (lower.includes(pattern)) {
          scores[intent] += 1;
        }
      }
    }

    // Определение доминирующего intent
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) {
      return 'informational'; // По умолчанию
    }

    const dominantIntent = Object.keys(scores).find(intent => scores[intent] === maxScore);
    return dominantIntent;
  }

  /**
   * Оптимизация контента под intent
   */
  optimizeContentForIntent(page, intent) {
    const optimizations = {
      informational: {
        contentStructure: 'How-to guide format',
        cta: 'Learn more',
        focus: 'Education and explanation'
      },
      navigational: {
        contentStructure: 'Direct navigation',
        cta: 'Go to page',
        focus: 'Quick access'
      },
      transactional: {
        contentStructure: 'Product/service focused',
        cta: 'Buy now / Get started',
        focus: 'Conversion'
      },
      commercial: {
        contentStructure: 'Comparison format',
        cta: 'Compare options',
        focus: 'Decision making'
      }
    };

    const optimization = optimizations[intent] || optimizations.informational;

    return {
      ...page,
      intent,
      intentOptimization: optimization,
      contentStructure: optimization.contentStructure,
      recommendedCTA: optimization.cta
    };
  }

  /**
   * Классификация и оптимизация страницы
   */
  classifyAndOptimize(page) {
    const keyword = page.primaryKeyword || page.url;
    const intent = this.classifyIntent(keyword);
    
    log('SEARCH-INTENT', `Classified "${keyword}" as ${intent} intent`);
    
    return this.optimizeContentForIntent(page, intent);
  }

  /**
   * Обработка батча страниц
   */
  processBatch(pages) {
    // Безопасная проверка на массив
    if (!pages || !Array.isArray(pages)) {
      log('SEARCH-INTENT', 'No pages provided for processing');
      return [];
    }
    
    const processed = [];

    for (const page of pages) {
      processed.push(this.classifyAndOptimize(page));
    }

    const intentDistribution = {};
    for (const page of processed) {
      intentDistribution[page.intent] = (intentDistribution[page.intent] || 0) + 1;
    }

    log('SEARCH-INTENT', `Intent distribution: ${JSON.stringify(intentDistribution)}`);
    return processed;
  }
}

module.exports = { SearchIntentClassifier };


