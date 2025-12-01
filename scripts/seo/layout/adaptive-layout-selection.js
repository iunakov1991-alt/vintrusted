const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Adaptive Layout Selection
 * AI выбирает layout на основе метрик производительности
 */
class AdaptiveLayoutSelection {
  constructor(config) {
    this.config = config;
    this.layoutMetrics = new Map(); // layoutId -> metrics
    this.selectionHistory = [];
  }

  /**
   * Обновление метрик для layout
   */
  updateLayoutMetrics(layoutId, metrics) {
    const current = this.layoutMetrics.get(layoutId) || {
      totalUses: 0,
      totalConversions: 0,
      totalTraffic: 0,
      avgQuality: 0,
      avgCTR: 0,
      avgBounceRate: 0,
      lastUpdated: null
    };

    current.totalUses += metrics.uses || 1;
    current.totalConversions += metrics.conversions || 0;
    current.totalTraffic += metrics.traffic || 0;
    current.avgQuality = this.updateAverage(current.avgQuality, current.totalUses, metrics.quality || 0);
    current.avgCTR = this.updateAverage(current.avgCTR, current.totalUses, metrics.ctr || 0);
    current.avgBounceRate = this.updateAverage(current.avgBounceRate, current.totalUses, metrics.bounceRate || 0);
    current.lastUpdated = new Date().toISOString();

    this.layoutMetrics.set(layoutId, current);
  }

  /**
   * Обновление среднего значения
   */
  updateAverage(currentAvg, count, newValue) {
    if (count === 0) return newValue;
    return (currentAvg * (count - 1) + newValue) / count;
  }

  /**
   * Выбор лучшего layout для страницы
   */
  selectBestLayout(page, availableLayouts) {
    if (availableLayouts.length === 0) {
      return null;
    }

    // Вычисляем score для каждого layout
    const scores = availableLayouts.map(layout => ({
      layout,
      score: this.calculateLayoutScore(layout, page)
    }));

    // Сортируем по score
    scores.sort((a, b) => b.score - a.score);

    const selected = scores[0].layout;
    const score = scores[0].score;

    // Сохраняем выбор в историю
    this.selectionHistory.push({
      pageUrl: page.url,
      layoutId: selected.id,
      score,
      timestamp: new Date().toISOString()
    });

    log('ADAPTIVE-LAYOUT', `Selected layout ${selected.id} for ${page.url} (score: ${score.toFixed(3)})`);
    return selected;
  }

  /**
   * Вычисление score для layout
   */
  calculateLayoutScore(layout, page) {
    const metrics = this.layoutMetrics.get(layout.id) || {
      totalUses: 0,
      totalConversions: 0,
      totalTraffic: 0,
      avgQuality: 0,
      avgCTR: 0,
      avgBounceRate: 0
    };

    let score = 0;

    // Conversion rate (40%)
    const conversionRate = metrics.totalUses > 0 
      ? metrics.totalConversions / metrics.totalUses 
      : 0;
    score += conversionRate * 0.4;

    // Average quality (25%)
    score += metrics.avgQuality * 0.25;

    // CTR (20%)
    score += Math.min(metrics.avgCTR, 0.1) * 200; // Нормализуем CTR (0-10% = 0-1)

    // Traffic (10%)
    const trafficScore = Math.min(metrics.totalTraffic / 1000, 1); // 1000+ трафика = 1.0
    score += trafficScore * 0.1;

    // Bounce rate penalty (5%)
    const bouncePenalty = metrics.avgBounceRate * 0.05;
    score -= bouncePenalty;

    // Новый layout bonus (если мало данных)
    if (metrics.totalUses < 10) {
      score += 0.1; // Даем шанс новым layout'ам
    }

    // Page-specific factors
    if (page.intent && layout.suitableIntents && layout.suitableIntents.includes(page.intent)) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score)); // 0-1
  }

  /**
   * Получение статистики по layout'ам
   */
  getLayoutStats() {
    const stats = [];

    for (const [layoutId, metrics] of this.layoutMetrics.entries()) {
      const conversionRate = metrics.totalUses > 0 
        ? metrics.totalConversions / metrics.totalUses 
        : 0;

      stats.push({
        layoutId,
        totalUses: metrics.totalUses,
        conversionRate: conversionRate.toFixed(3),
        avgQuality: metrics.avgQuality.toFixed(3),
        avgCTR: metrics.avgCTR.toFixed(3),
        avgBounceRate: metrics.avgBounceRate.toFixed(3),
        score: this.calculateLayoutScore({ id: layoutId }, {})
      });
    }

    return stats.sort((a, b) => b.score - a.score);
  }

  /**
   * Рекомендации по улучшению layout'ов
   */
  getRecommendations() {
    const stats = this.getLayoutStats();
    const recommendations = [];

    if (stats.length === 0) {
      return [{ type: 'info', message: 'No layout metrics available yet' }];
    }

    const bestLayout = stats[0];
    const worstLayout = stats[stats.length - 1];

    if (bestLayout.score - worstLayout.score > 0.2) {
      recommendations.push({
        type: 'warning',
        message: `Layout "${bestLayout.layoutId}" significantly outperforms "${worstLayout.layoutId}"`,
        action: 'Consider deprecating or improving underperforming layouts'
      });
    }

    if (bestLayout.conversionRate < 0.01) {
      recommendations.push({
        type: 'info',
        message: 'All layouts have low conversion rates',
        action: 'Review content and CTA placement'
      });
    }

    return recommendations;
  }
}

module.exports = { AdaptiveLayoutSelection };


