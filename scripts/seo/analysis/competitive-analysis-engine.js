const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Competitive Analysis Integration
 * Автоматический анализ конкурентов и адаптация стратегии
 */
class CompetitiveAnalysisEngine {
  constructor(config) {
    this.config = config;
    this.competitorData = new Map();
    this.insights = [];
  }

  /**
   * Анализ конкурентов для ключевого слова
   */
  analyzeCompetitors(keyword, competitorPages = []) {
    const analysis = {
      keyword,
      competitorCount: competitorPages.length,
      avgContentLength: 0,
      avgTitleLength: 0,
      commonTopics: [],
      gaps: [],
      opportunities: []
    };

    if (competitorPages.length === 0) {
      return analysis;
    }

    // Анализ контента
    let totalLength = 0;
    let totalTitleLength = 0;

    for (const page of competitorPages) {
      totalLength += (page.content || '').length;
      totalTitleLength += (page.title || '').length;
    }

    analysis.avgContentLength = Math.round(totalLength / competitorPages.length);
    analysis.avgTitleLength = Math.round(totalTitleLength / competitorPages.length);

    // Извлечение общих тем
    analysis.commonTopics = this.extractCommonTopics(competitorPages);

    // Выявление пробелов
    analysis.gaps = this.identifyGaps(competitorPages);

    // Возможности
    analysis.opportunities = this.identifyOpportunities(analysis);

    log('COMPETITIVE-ANALYSIS', `Analyzed ${competitorPages.length} competitors for "${keyword}"`);
    return analysis;
  }

  /**
   * Извлечение общих тем
   */
  extractCommonTopics(pages) {
    const topicFrequency = new Map();

    for (const page of pages) {
      const topics = this.extractTopics(page);
      for (const topic of topics) {
        topicFrequency.set(topic, (topicFrequency.get(topic) || 0) + 1);
      }
    }

    // Сортируем по частоте
    const commonTopics = Array.from(topicFrequency.entries())
      .filter(([topic, count]) => count >= pages.length * 0.5) // В 50%+ страниц
      .sort((a, b) => b[1] - a[1])
      .map(([topic]) => topic);

    return commonTopics;
  }

  /**
   * Извлечение тем из страницы
   */
  extractTopics(page) {
    const topics = [];
    const content = (page.content || '').toLowerCase();

    const topicKeywords = {
      'vin-decoding': ['vin', 'decode', 'vehicle identification'],
      'accident-history': ['accident', 'crash', 'collision', 'damage'],
      'title-records': ['title', 'ownership', 'registration'],
      'recall-information': ['recall', 'safety', 'defect'],
      'fraud-prevention': ['fraud', 'scam', 'warning', 'verify']
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          topics.push(topic);
          break;
        }
      }
    }

    return topics;
  }

  /**
   * Выявление пробелов
   */
  identifyGaps(competitorPages) {
    const gaps = [];

    // Проверяем наличие structured data
    const hasStructuredData = competitorPages.filter(p => p.hasStructuredData).length;
    if (hasStructuredData < competitorPages.length * 0.5) {
      gaps.push({
        type: 'structured-data',
        message: 'Many competitors lack structured data',
        opportunity: 'Add structured data for competitive advantage'
      });
    }

    // Проверяем длину контента
    const avgLength = competitorPages.reduce((sum, p) => sum + (p.content || '').length, 0) / competitorPages.length;
    if (avgLength < 2000) {
      gaps.push({
        type: 'content-depth',
        message: 'Competitors have shallow content',
        opportunity: 'Create more comprehensive content'
      });
    }

    return gaps;
  }

  /**
   * Выявление возможностей
   */
  identifyOpportunities(analysis) {
    const opportunities = [];

    if (analysis.avgContentLength < 3000) {
      opportunities.push({
        type: 'content-expansion',
        message: 'Competitors have shorter content',
        action: 'Create longer, more comprehensive content'
      });
    }

    if (analysis.commonTopics.length < 3) {
      opportunities.push({
        type: 'topic-coverage',
        message: 'Limited topic coverage by competitors',
        action: 'Cover more topics for comprehensive content'
      });
    }

    return opportunities;
  }

  /**
   * Адаптация стратегии на основе анализа
   */
  adaptStrategy(analysis, currentStrategy) {
    const adaptations = [];

    // Адаптация длины контента
    if (analysis.avgContentLength > (currentStrategy.targetContentLength || 2000)) {
      adaptations.push({
        type: 'content-length',
        action: 'Increase target content length',
        value: Math.round(analysis.avgContentLength * 1.1) // 10% больше конкурентов
      });
    }

    // Адаптация тем
    if (analysis.commonTopics.length > 0) {
      adaptations.push({
        type: 'topics',
        action: 'Focus on common topics',
        topics: analysis.commonTopics
      });
    }

    // Адаптация на основе возможностей
    for (const opportunity of analysis.opportunities) {
      adaptations.push({
        type: 'opportunity',
        action: opportunity.action,
        reason: opportunity.message
      });
    }

    return {
      ...currentStrategy,
      adaptations,
      competitiveInsights: analysis
    };
  }
}

module.exports = { CompetitiveAnalysisEngine };


