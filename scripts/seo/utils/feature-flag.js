/**
 * Feature Flag Helper
 * Централизованная проверка feature flags
 */

/**
 * Проверка включенности feature flag
 * @param {Object} config - Конфигурация
 * @param {string} featureName - Имя feature
 * @returns {boolean} - true если feature включен
 */
function isFeatureEnabled(config, featureName) {
  if (!config || !config.features) {
    return false;
  }
  return config.features[featureName] !== false;
}

/**
 * Проверка нескольких feature flags одновременно
 * @param {Object} config - Конфигурация
 * @param {string[]} featureNames - Массив имен features
 * @returns {boolean} - true если все features включены
 */
function areFeaturesEnabled(config, featureNames) {
  return featureNames.every(name => isFeatureEnabled(config, name));
}

module.exports = {
  isFeatureEnabled,
  areFeaturesEnabled
};



















