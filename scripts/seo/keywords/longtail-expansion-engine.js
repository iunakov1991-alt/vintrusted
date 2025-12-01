const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Long-tail Keyword Expansion
 * Автоматическое расширение long-tail ключевых слов на основе GSC
 */
class LongtailExpansionEngine {
  constructor(config) {
    this.config = config;
    this.longtailKeywords = new Map(); // keyword -> data
  }

  /**
   * Извлечение long-tail ключевых слов из GSC данных
   */
  extractLongtailFromGSC(gscQueries) {
    const longtail = [];

    for (const query of gscQueries) {
      const keyword = query.query || '';
      const wordCount = keyword.split(/\s+/).length;

      // Long-tail = 4+ слова
      if (wordCount >= 4) {
        longtail.push({
          keyword,
          impressions: query.impressions || 0,
          clicks: query.clicks || 0,
          ctr: query.ctr || 0,
          position: query.position || 0,
          wordCount
        });
      }
    }

    // Сортируем по потенциалу (clicks * CTR)
    longtail.sort((a, b) => {
      const potentialA = a.clicks * (a.ctr || 0);
      const potentialB = b.clicks * (b.ctr || 0);
      return potentialB - potentialA;
    });

    log('LONGTAIL-EXPANSION', `Extracted ${longtail.length} long-tail keywords from GSC`);
    return longtail;
  }

  /**
   * Генерация long-tail вариантов для базового ключевого слова
   */
  generateLongtailVariants(baseKeyword) {
    const variants = [];
    const base = baseKeyword.toLowerCase();

    // Паттерны для генерации long-tail
    const modifiers = [
      'how to',
      'what is',
      'where to',
      'when to',
      'why',
      'best',
      'top',
      'cheap',
      'free',
      'online',
      'near me',
      'for sale',
      'price',
      'cost',
      'review'
    ];

    const suffixes = [
      'guide',
      'tutorial',
      'explained',
      'information',
      'check',
      'verify',
      'lookup',
      'search'
    ];

    // Генерируем варианты
    for (const modifier of modifiers) {
      variants.push(`${modifier} ${base}`);
    }

    for (const suffix of suffixes) {
      variants.push(`${base} ${suffix}`);
    }

    // Комбинированные
    for (const modifier of modifiers.slice(0, 5)) {
      for (const suffix of suffixes.slice(0, 5)) {
        variants.push(`${modifier} ${base} ${suffix}`);
      }
    }

    return variants.slice(0, 20); // Ограничиваем количество
  }

  /**
   * Приоритизация long-tail ключевых слов
   */
  prioritizeLongtail(longtailKeywords) {
    return longtailKeywords.map(kw => ({
      ...kw,
      priority: this.calculatePriority(kw)
    })).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Вычисление приоритета
   */
  calculatePriority(keyword) {
    let priority = 0;

    // Impressions (30%)
    priority += Math.min(keyword.impressions / 100, 1) * 0.3;

    // CTR (30%)
    priority += Math.min((keyword.ctr || 0) * 10, 1) * 0.3; // Нормализуем CTR

    // Position (20%) - лучше позиция = выше приоритет
    priority += Math.max(0, (100 - keyword.position) / 100) * 0.2;

    // Word count bonus (20%) - больше слов = выше приоритет (до 6 слов)
    priority += Math.min(keyword.wordCount / 6, 1) * 0.2;

    return priority;
  }

  /**
   * Интеграция long-tail в страницу
   */
  integrateLongtail(page, longtailKeywords) {
    const relevant = longtailKeywords
      .filter(kw => this.isRelevant(kw.keyword, page))
      .slice(0, 5); // Топ 5 релевантных

    return {
      ...page,
      longtailKeywords: relevant,
      primaryLongtail: relevant[0]?.keyword || null
    };
  }

  /**
   * Проверка релевантности
   */
  isRelevant(keyword, page) {
    const lower = keyword.toLowerCase();
    const pageContent = (page.content || page.html || '').toLowerCase();

    // Проверяем совпадение ключевых слов
    const keywordWords = lower.split(/\s+/).filter(w => w.length > 3);
    const matchCount = keywordWords.filter(w => pageContent.includes(w)).length;

    return matchCount >= keywordWords.length * 0.5; // 50% совпадение
  }

  /**
   * Получение рекомендаций
   */
  getRecommendations(longtailKeywords) {
    const recommendations = [];

    const highPotential = longtailKeywords.filter(kw => kw.priority > 0.7);
    if (highPotential.length > 0) {
      recommendations.push({
        type: 'high-potential',
        message: `Found ${highPotential.length} high-potential long-tail keywords`,
        action: 'Create content targeting these keywords'
      });
    }

    const lowCTR = longtailKeywords.filter(kw => kw.ctr < 0.01 && kw.impressions > 100);
    if (lowCTR.length > 0) {
      recommendations.push({
        type: 'low-ctr',
        message: `${lowCTR.length} long-tail keywords have low CTR`,
        action: 'Optimize titles and meta descriptions'
      });
    }

    return recommendations;
  }
}

module.exports = { LongtailExpansionEngine };


