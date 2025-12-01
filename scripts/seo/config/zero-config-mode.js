const { log } = require('../logger');
const { getConfigManager } = require('../utils/config-manager');

/**
 * SEO MONSTER 6.0: Zero-Config Mode
 * Режим работы без конфигурации (ТРИЗ оптимизация)
 */
class ZeroConfigMode {
  constructor() {
    this.configManager = getConfigManager();
  }

  /**
   * Автоматическое определение оптимальной конфигурации
   */
  autoConfigure(metrics = {}) {
    const {
      totalPages = 0,
      avgQuality = 0,
      avgCTR = 0,
      totalClicks = 0,
      buildHistory = []
    } = metrics;

    const config = this.configManager.getConfig();
    const autoConfig = { ...config };

    // Автоматическая настройка targetPagesPerBuild
    if (!config.targetPagesPerBuild || config.targetPagesPerBuild === 10000) {
      if (totalPages === 0) {
        autoConfig.targetPagesPerBuild = 300; // Консервативный старт
      } else if (totalPages < 100) {
        autoConfig.targetPagesPerBuild = 500;
      } else if (totalPages < 1000) {
        autoConfig.targetPagesPerBuild = 1000;
      } else if (totalPages < 10000) {
        autoConfig.targetPagesPerBuild = 2000;
      } else {
        autoConfig.targetPagesPerBuild = 5000;
      }
    }

    // Автоматическая настройка minQualityScore
    if (buildHistory.length > 0) {
      const recentQuality = buildHistory
        .slice(-5)
        .reduce((sum, h) => sum + (h.avgQuality || 0), 0) / Math.min(5, buildHistory.length);
      
      if (recentQuality > 0.85) {
        autoConfig.minQualityScore = 0.75; // Можно быть менее строгим
      } else if (recentQuality < 0.7) {
        autoConfig.minQualityScore = 0.65; // Нужно быть более мягким
      }
    }

    // Автоматическая настройка конкурентности
    if (!config.concurrency) {
      const recentBuildTime = buildHistory.length > 0
        ? buildHistory.slice(-1)[0]?.duration || 0
        : 0;
      
      if (recentBuildTime > 300000) { // > 5 минут
        autoConfig.concurrency = 4; // Снижаем конкурентность
      } else if (recentBuildTime < 60000) { // < 1 минута
        autoConfig.concurrency = 12; // Увеличиваем конкурентность
      } else {
        autoConfig.concurrency = 8; // Дефолт
      }
    }

    // Автоматическая настройка feature flags на основе метрик
    if (!config.features) {
      config.features = {};
    }

    // Включаем seed expansion если страниц мало
    if (totalPages < 100 && config.features.seedExpansion === undefined) {
      autoConfig.features.seedExpansion = true;
    }

    // Включаем synonyms если качество хорошее
    if (avgQuality > 0.8 && config.features.synonyms === undefined) {
      autoConfig.features.synonyms = true;
    }

    // Включаем breadcrumbs если есть трафик
    if (totalClicks > 100 && config.features.breadcrumbs === undefined) {
      autoConfig.features.breadcrumbs = true;
    }

    log('ZERO-CONFIG', 'Auto-configured based on metrics');
    
    return autoConfig;
  }

  /**
   * Проверка, нужна ли конфигурация
   */
  needsConfiguration() {
    const config = this.configManager.getConfig();
    
    // Проверяем наличие критичных параметров
    const hasTargetPages = config.targetPagesPerBuild && config.targetPagesPerBuild > 0;
    const hasMinQuality = config.minQualityScore && config.minQualityScore > 0;
    const hasIntents = config.intents && config.intents.length > 0;
    const hasLanguages = config.languages && config.languages.length > 0;

    return !(hasTargetPages && hasMinQuality && hasIntents && hasLanguages);
  }

  /**
   * Применение автоматической конфигурации
   */
  applyAutoConfig(metrics = {}) {
    if (this.needsConfiguration()) {
      const autoConfig = this.autoConfigure(metrics);
      this.configManager.saveConfig(autoConfig);
      log('ZERO-CONFIG', 'Applied auto-configuration');
      return true;
    }
    return false;
  }
}

module.exports = { ZeroConfigMode };


