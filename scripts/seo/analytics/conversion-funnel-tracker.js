const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Conversion Funnel Tracker
 * Детальное отслеживание воронки конверсий на SEO страницах
 */
class ConversionFunnelTracker {
  constructor(config) {
    this.config = config;
    this.funnelData = new Map(); // URL -> funnel data
    this.funnelStages = [
      'page_view',
      'scroll_50',
      'scroll_100',
      'cta_view',
      'cta_click',
      'form_start',
      'form_submit',
      'conversion'
    ];
  }

  /**
   * Регистрация события воронки
   */
  trackEvent(url, stage, metadata = {}) {
    if (!this.funnelData.has(url)) {
      this.funnelData.set(url, {
        url,
        stages: {},
        firstEvent: new Date().toISOString(),
        lastEvent: new Date().toISOString()
      });
    }

    const data = this.funnelData.get(url);
    if (!data.stages[stage]) {
      data.stages[stage] = {
        count: 0,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        metadata: []
      };
    }

    data.stages[stage].count++;
    data.stages[stage].lastSeen = new Date().toISOString();
    data.stages[stage].metadata.push({
      timestamp: new Date().toISOString(),
      ...metadata
    });

    data.lastEvent = new Date().toISOString();
  }

  /**
   * Вычисление conversion rate для страницы
   */
  calculateConversionRate(url) {
    const data = this.funnelData.get(url);
    if (!data) return 0;

    const pageViews = data.stages['page_view']?.count || 0;
    const conversions = data.stages['conversion']?.count || 0;

    if (pageViews === 0) return 0;
    return conversions / pageViews;
  }

  /**
   * Вычисление drop-off rate между этапами
   */
  calculateDropOffRate(url, fromStage, toStage) {
    const data = this.funnelData.get(url);
    if (!data) return 0;

    const fromCount = data.stages[fromStage]?.count || 0;
    const toCount = data.stages[toStage]?.count || 0;

    if (fromCount === 0) return 0;
    return 1 - (toCount / fromCount);
  }

  /**
   * Анализ воронки для страницы
   */
  analyzeFunnel(url) {
    const data = this.funnelData.get(url);
    if (!data) {
      return {
        url,
        hasData: false,
        conversionRate: 0,
        dropOffs: [],
        recommendations: []
      };
    }

    const conversionRate = this.calculateConversionRate(url);
    const dropOffs = [];
    const recommendations = [];

    // Анализируем drop-offs между этапами
    for (let i = 0; i < this.funnelStages.length - 1; i++) {
      const fromStage = this.funnelStages[i];
      const toStage = this.funnelStages[i + 1];
      const dropOff = this.calculateDropOffRate(url, fromStage, toStage);

      if (dropOff > 0.5) { // Drop-off > 50%
        dropOffs.push({
          from: fromStage,
          to: toStage,
          rate: dropOff,
          severity: dropOff > 0.8 ? 'high' : 'medium'
        });

        // Генерируем рекомендации
        if (fromStage === 'page_view' && toStage === 'scroll_50') {
          recommendations.push({
            type: 'content',
            message: 'High drop-off at scroll - improve content engagement',
            action: 'Add more engaging content at the top'
          });
        } else if (fromStage === 'cta_view' && toStage === 'cta_click') {
          recommendations.push({
            type: 'cta',
            message: 'High drop-off at CTA - optimize call-to-action',
            action: 'Improve CTA visibility and copy'
          });
        } else if (fromStage === 'form_start' && toStage === 'form_submit') {
          recommendations.push({
            type: 'form',
            message: 'High drop-off at form - simplify form',
            action: 'Reduce form fields or improve UX'
          });
        }
      }
    }

    return {
      url,
      hasData: true,
      conversionRate,
      dropOffs,
      recommendations,
      stages: data.stages
    };
  }

  /**
   * Получение топ страниц по конверсиям
   */
  getTopConvertingPages(limit = 10) {
    const pages = [];

    for (const [url, data] of this.funnelData.entries()) {
      const conversionRate = this.calculateConversionRate(url);
      const conversions = data.stages['conversion']?.count || 0;

      pages.push({
        url,
        conversionRate,
        conversions,
        pageViews: data.stages['page_view']?.count || 0
      });
    }

    return pages
      .sort((a, b) => {
        // Сортируем по конверсиям, затем по rate
        if (b.conversions !== a.conversions) {
          return b.conversions - a.conversions;
        }
        return b.conversionRate - a.conversionRate;
      })
      .slice(0, limit);
  }

  /**
   * Получение статистики
   */
  getStats() {
    const totalPages = this.funnelData.size;
    let totalConversions = 0;
    let totalPageViews = 0;

    for (const [url, data] of this.funnelData.entries()) {
      totalConversions += data.stages['conversion']?.count || 0;
      totalPageViews += data.stages['page_view']?.count || 0;
    }

    const avgConversionRate = totalPageViews > 0 
      ? totalConversions / totalPageViews 
      : 0;

    return {
      totalPages,
      totalConversions,
      totalPageViews,
      avgConversionRate: avgConversionRate.toFixed(4),
      topPages: this.getTopConvertingPages(5)
    };
  }
}

module.exports = { ConversionFunnelTracker };


