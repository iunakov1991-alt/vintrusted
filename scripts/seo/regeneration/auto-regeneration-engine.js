const { log } = require('../logger');
const { getErrorHandler } = require('../utils/error-handler');

/**
 * SEO MONSTER 6.0: Auto Regeneration Engine
 * Автоматическая регенерация плохих страниц (ТРИЗ оптимизация)
 */
class AutoRegenerationEngine {
  constructor(config) {
    this.config = config;
    this.errorHandler = getErrorHandler();
    this.regenerationThreshold = config.autoRepair?.regenerationThreshold || 0.5;
    this.minQualityForRegeneration = config.autoRepair?.minQualityForRepair || 0.6;
  }

  /**
   * Определение страниц, требующих регенерации
   */
  identifyPagesForRegeneration(pages, metrics = {}) {
    const pagesToRegenerate = [];

    for (const page of pages) {
      const shouldRegenerate = this.shouldRegeneratePage(page, metrics);
      
      if (shouldRegenerate) {
        pagesToRegenerate.push({
          page,
          reason: shouldRegenerate.reason,
          priority: shouldRegenerate.priority || 'medium'
        });
      }
    }

    if (pagesToRegenerate.length > 0) {
      log('AUTO-REGEN', `Identified ${pagesToRegenerate.length} pages for regeneration`);
    }

    return pagesToRegenerate;
  }

  /**
   * Проверка, нужно ли регенерировать страницу
   */
  shouldRegeneratePage(page, metrics = {}) {
    // Критерий 1: Низкое качество
    if (page.quality && page.quality.score < this.minQualityForRegeneration) {
      return {
        should: true,
        reason: `Low quality score: ${page.quality.score.toFixed(3)}`,
        priority: 'high'
      };
    }

    // Критерий 2: Плохие метрики GSC (если доступны)
    if (page.gscMetrics) {
      const ctr = page.gscMetrics.ctr || 0;
      const position = page.gscMetrics.position || 100;
      const clicks = page.gscMetrics.clicks || 0;
      const impressions = page.gscMetrics.impressions || 0;

      // Низкий CTR при хорошей позиции
      if (position < 20 && ctr < 0.01 && impressions > 100) {
        return {
          should: true,
          reason: `Low CTR (${(ctr * 100).toFixed(2)}%) at position ${position.toFixed(1)}`,
          priority: 'high'
        };
      }

      // Много показов, но нет кликов
      if (impressions > 1000 && clicks === 0) {
        return {
          should: true,
          reason: `Zero clicks with ${impressions} impressions`,
          priority: 'medium'
        };
      }
    }

    // Критерий 3: Плохие внешние метрики
    if (page.externalMetrics) {
      const bounceRate = page.externalMetrics.bounceRate || 0;
      const timeOnPage = page.externalMetrics.timeOnPage || 0;

      // Высокий bounce rate
      if (bounceRate > 0.9 && timeOnPage < 10) {
        return {
          should: true,
          reason: `High bounce rate (${(bounceRate * 100).toFixed(1)}%) with low time on page`,
          priority: 'medium'
        };
      }
    }

    // Критерий 4: Нет конверсий при наличии трафика
    if (page.conversionMetrics) {
      const hasTraffic = (page.gscMetrics?.clicks || 0) > 10;
      const hasConversions = (page.conversionMetrics.conversions || 0) > 0;

      if (hasTraffic && !hasConversions && page.conversionMetrics.trafficConversionPotential < this.regenerationThreshold) {
        return {
          should: true,
          reason: `No conversions despite traffic, low conversion potential`,
          priority: 'low'
        };
      }
    }

    return { should: false };
  }

  /**
   * Планирование регенерации
   */
  planRegeneration(pagesToRegenerate, buildContext = {}) {
    // Сортируем по приоритету
    const sorted = pagesToRegenerate.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    });

    // Ограничиваем количество для одного билда
    const maxRegenerations = buildContext.maxRegenerations || 50;
    const planned = sorted.slice(0, maxRegenerations);

    return {
      planned,
      total: pagesToRegenerate.length,
      skipped: pagesToRegenerate.length - planned.length
    };
  }
}

module.exports = { AutoRegenerationEngine };


