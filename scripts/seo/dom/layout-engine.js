const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Layout Engine
 * Генерация 6-9+ различных layout схем с вариативными блоками
 */
class LayoutEngine {
  constructor(config) {
    this.config = config;
    this.layoutCount = config.layoutCount || 9;
    this.layouts = this.initializeLayouts();
  }

  /**
   * Инициализация всех layout схем
   */
  initializeLayouts() {
    const layouts = {};
    
    // Layout A: Header → Key Facts → AI → Table → FAQ → CTA
    layouts.A = {
      name: 'A',
      weight: 1.0,
      blocks: ['header', 'keyFacts', 'aiSection', 'featureTable', 'faq', 'cta']
    };

    // Layout B: Header → AI → Comparison → Table → Local → FAQ → CTA
    layouts.B = {
      name: 'B',
      weight: 1.0,
      blocks: ['header', 'aiSection', 'comparison', 'featureTable', 'localInsights', 'faq', 'cta']
    };

    // Layout C: Header → Local → Key Facts → Table → AI → FAQ → Comparison → CTA
    layouts.C = {
      name: 'C',
      weight: 1.0,
      blocks: ['header', 'localInsights', 'keyFacts', 'featureTable', 'aiSection', 'faq', 'comparison', 'cta']
    };

    // Layout D: Header → Extended Insights → AI → Table → Fraud Risk → FAQ → CTA
    layouts.D = {
      name: 'D',
      weight: 1.0,
      blocks: ['header', 'extendedInsights', 'aiSection', 'featureTable', 'fraudRisk', 'faq', 'cta']
    };

    // Layout E: Header → DMV Rules → Key Facts → AI → Table → Insurance → FAQ → CTA
    layouts.E = {
      name: 'E',
      weight: 1.0,
      blocks: ['header', 'dmvRules', 'keyFacts', 'aiSection', 'featureTable', 'insurance', 'faq', 'cta']
    };

    // Layout F: Header → Table → AI → Local → Comparison → Key Facts → FAQ → CTA
    layouts.F = {
      name: 'F',
      weight: 1.0,
      blocks: ['header', 'featureTable', 'aiSection', 'localInsights', 'comparison', 'keyFacts', 'faq', 'cta']
    };

    // Layout G: Header → AI → Key Facts → Extended → Table → DMV → FAQ → CTA
    layouts.G = {
      name: 'G',
      weight: 1.0,
      blocks: ['header', 'aiSection', 'keyFacts', 'extendedInsights', 'featureTable', 'dmvRules', 'faq', 'cta']
    };

    // Layout H: Header → Fraud Risk → Table → AI → Insurance → Local → FAQ → CTA
    layouts.H = {
      name: 'H',
      weight: 1.0,
      blocks: ['header', 'fraudRisk', 'featureTable', 'aiSection', 'insurance', 'localInsights', 'faq', 'cta']
    };

    // Layout I: Header → Comparison → AI → Table → Extended → Key Facts → DMV → FAQ → CTA
    layouts.I = {
      name: 'I',
      weight: 1.0,
      blocks: ['header', 'comparison', 'aiSection', 'featureTable', 'extendedInsights', 'keyFacts', 'dmvRules', 'faq', 'cta']
    };

    return layouts;
  }

  /**
   * Выбор layout для страницы на основе детерминированного хеша
   */
  selectLayout(item, layoutWeights = {}) {
    const base = `${item.vin || ''}|${item.stateSlug || ''}|${item.intent || ''}|${item.lang || ''}`;
    let h = 0;
    for (let i = 0; i < base.length; i++) {
      h = (h * 31 + base.charCodeAt(i)) >>> 0;
    }

    // Применяем веса из LTR системы
    const weightedLayouts = Object.keys(this.layouts).map(key => ({
      key,
      layout: this.layouts[key],
      weight: (layoutWeights[key] || 1.0) * this.layouts[key].weight
    }));

    // Нормализуем веса
    const totalWeight = weightedLayouts.reduce((sum, l) => sum + l.weight, 0);
    weightedLayouts.forEach(l => l.normalizedWeight = l.weight / totalWeight);

    // Выбираем layout на основе хеша и весов
    let cumulative = 0;
    const random = (h % 1000) / 1000;
    
    for (const wl of weightedLayouts) {
      cumulative += wl.normalizedWeight;
      if (random <= cumulative) {
        log('LAYOUT', `Selected layout ${wl.key} for ${item.vin}/${item.stateSlug}`);
        return wl.layout;
      }
    }

    // Fallback на первый layout
    return weightedLayouts[0].layout;
  }

  /**
   * Получить все доступные layouts
   */
  getAllLayouts() {
    return this.layouts;
  }

  /**
   * Обновить веса layouts на основе метрик
   */
  updateLayoutWeights(metrics) {
    // Логика обновления весов на основе avgQuality каждого layout
    // Будет реализована в LTR модуле
    return this.layouts;
  }
}

module.exports = { LayoutEngine };

