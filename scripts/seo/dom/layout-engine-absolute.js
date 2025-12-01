const { log } = require('../logger');

/**
 * SEO-ДИЗАЙН ABSOLUTE 1000%
 * Layout Engine с 6 вариантами layout для вариативности DOM
 */
class LayoutEngineAbsolute {
  constructor(config) {
    this.config = config;
    this.layouts = this.initializeLayouts();
  }

  /**
   * Инициализация 6 вариантов layout с разным порядком блоков
   */
  initializeLayouts() {
    return {
      // Layout 1: Классический DMV-стиль
      'DMV': {
        name: 'DMV',
        weight: 1.0,
        blocks: [
          'hero',
          'keyFacts',
          'vehicleSpecs',
          'deepExplanation',
          'stateInsights',
          'commonRisks',
          'freeVsPaid',
          'faq',
          'internalLinks'
        ]
      },
      
      // Layout 2: Apple-стиль (чистый, минималистичный)
      'APPLE': {
        name: 'APPLE',
        weight: 1.0,
        blocks: [
          'hero',
          'deepExplanation',
          'keyFacts',
          'aiAnalysis',
          'marketValue',
          'stateInsights',
          'freeVsPaid',
          'faq',
          'internalLinks'
        ]
      },
      
      // Layout 3: LegalTech-стиль (детальный, структурированный)
      'LEGAL': {
        name: 'LEGAL',
        weight: 1.0,
        blocks: [
          'hero',
          'vehicleSpecs',
          'commonRisks',
          'deepExplanation',
          'stateInsights',
          'aiAnalysis',
          'freeVsPaid',
          'faq',
          'internalLinks'
        ]
      },
      
      // Layout 4: Гибридный (сбалансированный)
      'HYBRID': {
        name: 'HYBRID',
        weight: 1.0,
        blocks: [
          'hero',
          'keyFacts',
          'aiAnalysis',
          'vehicleSpecs',
          'marketValue',
          'stateInsights',
          'commonRisks',
          'freeVsPaid',
          'faq',
          'internalLinks'
        ]
      },
      
      // Layout 5: Фокус на аналитике
      'ANALYTIC': {
        name: 'ANALYTIC',
        weight: 1.0,
        blocks: [
          'hero',
          'deepExplanation',
          'aiAnalysis',
          'keyFacts',
          'marketValue',
          'vehicleSpecs',
          'stateInsights',
          'freeVsPaid',
          'faq',
          'internalLinks'
        ]
      },
      
      // Layout 6: Фокус на рисках
      'RISK': {
        name: 'RISK',
        weight: 1.0,
        blocks: [
          'hero',
          'commonRisks',
          'keyFacts',
          'vehicleSpecs',
          'stateInsights',
          'deepExplanation',
          'aiAnalysis',
          'freeVsPaid',
          'faq',
          'internalLinks'
        ]
      }
    };
  }

  /**
   * Выбор layout на основе детерминированного хеша
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
    // Возвращаем массив layout'ов в формате, удобном для AdaptiveLayoutSelection
    // Каждый layout получает явный id, чтобы:
    // - availableLayouts был именно массивом (есть .length и .map)
    // - AdaptiveLayoutSelection мог логировать selected.id и считать метрики
    return Object.keys(this.layouts).map((key) => ({
      id: key,
      ...this.layouts[key]
    }));
  }
}

module.exports = { LayoutEngineAbsolute };

