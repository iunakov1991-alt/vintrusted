const fs = require('fs');
const path = require('path');
const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Unified Config Manager
 * Единый менеджер конфигурации (ТРИЗ оптимизация)
 */
class ConfigManager {
  constructor() {
    this.configPath = path.join(process.cwd(), 'data/seo/config.json');
    this.rlStatePath = path.join(process.cwd(), 'data/seo/rl-state.json');
    this._config = null;
    this._rlState = null;
    this._cacheTime = null;
    this.cacheTimeout = 60000; // 1 минута кеш
  }

  /**
   * Загрузка конфигурации с кешированием
   */
  getConfig() {
    const now = Date.now();
    
    // Используем кеш если он свежий
    if (this._config && this._cacheTime && (now - this._cacheTime) < this.cacheTimeout) {
      return this._config;
    }

    try {
      if (fs.existsSync(this.configPath)) {
        this._config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      } else {
        // Fallback конфигурация
        this._config = this.getDefaultConfig();
        log('CONFIG', 'Using default configuration (config.json not found)');
      }
      
      this._cacheTime = now;
      return this._config;
    } catch (e) {
      log('CONFIG', `Error loading config: ${e.message}, using defaults`);
      this._config = this.getDefaultConfig();
      this._cacheTime = now;
      return this._config;
    }
  }

  /**
   * Загрузка RL state с кешированием
   */
  getRLState() {
    const now = Date.now();
    
    // Используем кеш если он свежий
    if (this._rlState && this._cacheTime && (now - this._cacheTime) < this.cacheTimeout) {
      return this._rlState;
    }

    try {
      if (fs.existsSync(this.rlStatePath)) {
        this._rlState = JSON.parse(fs.readFileSync(this.rlStatePath, 'utf8'));
      } else {
        // Fallback RL state
        this._rlState = this.getDefaultRLState();
      }
      
      return this._rlState;
    } catch (e) {
      log('CONFIG', `Error loading RL state: ${e.message}, using defaults`);
      this._rlState = this.getDefaultRLState();
      return this._rlState;
    }
  }

  /**
   * Сохранение конфигурации
   */
  saveConfig(config) {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
      this._config = config;
      this._cacheTime = Date.now();
      log('CONFIG', 'Configuration saved');
      return true;
    } catch (e) {
      log('CONFIG', `Error saving config: ${e.message}`);
      return false;
    }
  }

  /**
   * Сохранение RL state
   */
  saveRLState(rlState) {
    try {
      fs.writeFileSync(this.rlStatePath, JSON.stringify(rlState, null, 2), 'utf8');
      this._rlState = rlState;
      log('CONFIG', 'RL state saved');
      return true;
    } catch (e) {
      log('CONFIG', `Error saving RL state: ${e.message}`);
      return false;
    }
  }

  /**
   * Получение значения конфигурации с fallback
   */
  get(key, defaultValue = null) {
    const config = this.getConfig();
    const keys = key.split('.');
    let value = config;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }
    
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Проверка feature flag
   */
  isFeatureEnabled(featureName) {
    const features = this.get('features', {});
    return features[featureName] !== false; // По умолчанию включено если не указано
  }

  /**
   * Дефолтная конфигурация
   */
  getDefaultConfig() {
    return {
      version: "6.0",
      targetPagesPerBuild: 10000,
      maxPagesPerCluster: 500,
      minQualityScore: 0.70,
      enableAI: true,
      aiMaxTokens: 600,
      aiProviders: ["deepseek"],
      languages: ["en", "es"],
      defaultLanguage: "en",
      intents: [
        "vin_check",
        "accident_check",
        "ownership_history",
        "market_value",
        "dmv_records",
        "title_brand",
        "odometer_rollback",
        "theft_records"
      ],
      layoutCount: 9,
      minLayoutVariety: 6,
      uniquenessThreshold: 0.85,
      internalLinksPerPage: {
        min: 1,
        max: 3
      },
      crawlBudget: {
        highPriority: 0.4,
        mediumPriority: 0.4,
        lowPriority: 0.2
      },
      autoRepair: {
        enabled: true,
        minQualityForRepair: 0.6,
        regenerationThreshold: 0.5
      },
      semanticRequirements: {
        tier1Required: true,
        tier1Themes: [
          "vehicle-identity-core",
          "accident-damage-intelligence",
          "ownership-logic",
          "state-specific-rules",
          "fraud-prevention"
        ],
        minTier1Coverage: 0.8,
        semanticWeightInQuality: 0.20
      },
      features: {
        seedExpansion: true,
        h1Variants: true,
        synonyms: true,
        dynamicMeta: false,
        breadcrumbs: true,
        canonicalLogic: true,
        authorityGraph: true,
        landingHubs: true
      }
    };
  }

  /**
   * Дефолтный RL state
   */
  getDefaultRLState() {
    return {
      intentWeights: {},
      languageWeights: {},
      clusterScores: {},
      layoutWeights: {}
    };
  }

  /**
   * Очистка кеша
   */
  clearCache() {
    this._config = null;
    this._rlState = null;
    this._cacheTime = null;
  }
}

// Singleton instance
let instance = null;

/**
 * Получить экземпляр ConfigManager (singleton)
 */
function getConfigManager() {
  if (!instance) {
    instance = new ConfigManager();
  }
  return instance;
}

module.exports = { ConfigManager, getConfigManager };


