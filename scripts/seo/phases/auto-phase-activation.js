const { log } = require('../logger');
const { getConfigManager } = require('../utils/config-manager');

/**
 * SEO MONSTER 6.0: Auto Phase Activation
 * Автоматическое включение фаз по метрикам (ТРИЗ оптимизация)
 */
class AutoPhaseActivation {
  constructor(config) {
    this.config = config;
    this.configManager = getConfigManager();
    this.phases = {
      A: {
        name: 'Phase A',
        minPages: 0,
        maxPages: 100,
        features: ['seedExpansion', 'h1Variants', 'synonyms']
      },
      B: {
        name: 'Phase B',
        minPages: 100,
        maxPages: 1000,
        features: ['breadcrumbs', 'canonicalLogic', 'authorityGraph', 'landingHubs']
      },
      C: {
        name: 'Phase C',
        minPages: 1000,
        maxPages: 10000,
        features: ['dynamicMeta', 'advancedInternalLinks']
      },
      D: {
        name: 'Phase D',
        minPages: 10000,
        maxPages: 100000,
        features: ['advancedCaching', 'performanceOptimization']
      },
      E: {
        name: 'Phase E',
        minPages: 100000,
        maxPages: Infinity,
        features: ['enterpriseFeatures', 'advancedAnalytics']
      }
    };
  }

  /**
   * Определение активных фаз на основе метрик
   */
  determineActivePhases(metrics = {}) {
    const {
      totalPages = 0,
      avgQuality = 0,
      avgCTR = 0,
      avgPosition = 0,
      totalClicks = 0
    } = metrics;

    const activePhases = [];
    const recommendations = [];

    // Определяем фазы на основе количества страниц
    for (const [phaseKey, phase] of Object.entries(this.phases)) {
      if (totalPages >= phase.minPages && totalPages < phase.maxPages) {
        activePhases.push(phaseKey);
        
        // Проверяем, включены ли все фичи фазы
        const config = this.configManager.getConfig();
        const features = config.features || {};
        
        for (const feature of phase.features) {
          if (features[feature] === false) {
            recommendations.push({
              phase: phaseKey,
              feature,
              reason: `Phase ${phaseKey} recommends ${feature} but it's disabled`,
              action: 'enable'
            });
          }
        }
      }
    }

    // Дополнительные рекомендации на основе метрик
    if (avgQuality < 0.7 && totalPages > 100) {
      recommendations.push({
        phase: 'A',
        feature: 'qualityOptimization',
        reason: 'Low average quality detected',
        action: 'review'
      });
    }

    if (avgCTR < 0.01 && avgPosition < 20 && totalPages > 1000) {
      recommendations.push({
        phase: 'B',
        feature: 'contentOptimization',
        reason: 'Low CTR despite good positions',
        action: 'optimize'
      });
    }

    return {
      activePhases,
      recommendations,
      currentPhase: activePhases[activePhases.length - 1] || 'A'
    };
  }

  /**
   * Автоматическая активация фаз
   */
  async activatePhases(metrics = {}) {
    const analysis = this.determineActivePhases(metrics);
    const config = this.configManager.getConfig();
    const features = config.features || {};
    let updated = false;

    // Активируем фичи для активных фаз
    for (const phaseKey of analysis.activePhases) {
      const phase = this.phases[phaseKey];
      
      for (const feature of phase.features) {
        if (features[feature] === false) {
          features[feature] = true;
          updated = true;
          log('AUTO-PHASE', `Auto-activated ${feature} for ${phase.name}`);
        }
      }
    }

    // Применяем рекомендации
    for (const rec of analysis.recommendations) {
      if (rec.action === 'enable' && features[rec.feature] === false) {
        features[rec.feature] = true;
        updated = true;
        log('AUTO-PHASE', `Auto-enabled ${rec.feature}: ${rec.reason}`);
      }
    }

    if (updated) {
      config.features = features;
      this.configManager.saveConfig(config);
      log('AUTO-PHASE', 'Configuration updated with auto-activated phases');
    }

    return {
      ...analysis,
      updated,
      features: config.features
    };
  }
}

module.exports = { AutoPhaseActivation };


