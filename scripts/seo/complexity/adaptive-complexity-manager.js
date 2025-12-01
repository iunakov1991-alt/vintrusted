const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Adaptive Complexity Manager
 * Адаптация сложности системы под нагрузку (ТРИЗ приоритет #8)
 */
class AdaptiveComplexityManager {
  constructor(config) {
    this.config = config;
    this.complexityLevel = 'medium'; // low, medium, high
    this.complexityHistory = [];
    this.maxHistorySize = 100;
    this.metrics = {
      load: 0, // 0-1
      performance: 1, // 0-1
      quality: 1, // 0-1
      resources: 0 // 0-1
    };
  }

  /**
   * Обновление метрик и адаптация сложности
   */
  updateMetrics(newMetrics) {
    this.metrics = { ...this.metrics, ...newMetrics };
    this.adaptComplexity();
  }

  /**
   * Адаптация сложности на основе метрик
   */
  adaptComplexity() {
    const { load, performance, quality, resources } = this.metrics;
    
    // Высокая нагрузка или низкая производительность -> снижаем сложность
    if (load > 0.8 || performance < 0.5) {
      this.setComplexity('low');
    }
    // Низкая нагрузка и хорошая производительность -> повышаем сложность
    else if (load < 0.3 && performance > 0.8 && quality > 0.7) {
      this.setComplexity('high');
    }
    // Средние условия -> средняя сложность
    else {
      this.setComplexity('medium');
    }
  }

  /**
   * Установка уровня сложности
   */
  setComplexity(level) {
    if (this.complexityLevel === level) {
      return; // Без изменений
    }

    const previous = this.complexityLevel;
    this.complexityLevel = level;
    
    this.complexityHistory.push({
      timestamp: Date.now(),
      from: previous,
      to: level,
      metrics: { ...this.metrics }
    });

    if (this.complexityHistory.length > this.maxHistorySize) {
      this.complexityHistory = this.complexityHistory.slice(-this.maxHistorySize);
    }

    log('ADAPTIVE-COMPLEXITY', `Complexity changed: ${previous} -> ${level}`);
  }

  /**
   * Получение параметров для текущего уровня сложности
   */
  getParameters(operation) {
    const params = this.getDefaultParameters(operation);
    const adjustments = this.getComplexityAdjustments(this.complexityLevel);
    
    return this.applyAdjustments(params, adjustments);
  }

  /**
   * Получение параметров по умолчанию
   */
  getDefaultParameters(operation) {
    const defaults = {
      content_generation: {
        concurrency: 20, // ТРИЗ: увеличено с 8 до 20 для быстрых билдов
        aiMaxTokens: 400, // ТРИЗ: уменьшено с 600 до 400 для ускорения
        enableAdvancedFeatures: true,
        cacheEnabled: true
      },
      url_planning: {
        maxUrls: 10000,
        enableSeedExpansion: true,
        enableAI: true
      },
      quality_scoring: {
        strictMode: true,
        enableAdvancedMetrics: true
      },
      image_generation: {
        enabled: true,
        batchSize: 5
      }
    };

    return defaults[operation] || {};
  }

  /**
   * Получение корректировок для уровня сложности
   */
  getComplexityAdjustments(level) {
    const adjustments = {
      low: {
        concurrency: 0.5, // Уменьшаем конкурентность в 2 раза
        aiMaxTokens: 0.7, // Уменьшаем токены
        enableAdvancedFeatures: false, // Отключаем продвинутые функции
        cacheEnabled: true, // Кеш всегда включен
        maxUrls: 0.5, // Уменьшаем количество URL
        strictMode: false, // Менее строгий режим
        batchSize: 0.5 // Уменьшаем размер батча
      },
      medium: {
        concurrency: 1.0,
        aiMaxTokens: 1.0,
        enableAdvancedFeatures: true,
        cacheEnabled: true,
        maxUrls: 1.0,
        strictMode: true,
        batchSize: 1.0
      },
      high: {
        concurrency: 1.5, // Увеличиваем конкурентность
        aiMaxTokens: 1.2, // Больше токенов
        enableAdvancedFeatures: true,
        cacheEnabled: true,
        maxUrls: 1.5, // Больше URL
        strictMode: true,
        batchSize: 1.5, // Больше батч
        enableAdvancedMetrics: true
      }
    };

    return adjustments[level] || adjustments.medium;
  }

  /**
   * Применение корректировок к параметрам
   */
  applyAdjustments(params, adjustments) {
    const adjusted = { ...params };

    for (const [key, value] of Object.entries(adjustments)) {
      if (adjusted.hasOwnProperty(key)) {
        if (typeof adjusted[key] === 'number') {
          adjusted[key] = Math.round(adjusted[key] * value);
        } else if (typeof adjusted[key] === 'boolean') {
          adjusted[key] = value;
        }
      } else {
        adjusted[key] = value;
      }
    }

    return adjusted;
  }

  /**
   * Получение рекомендуемой конкурентности
   */
  // ТРИЗ оптимизация: увеличиваем базовую конкурентность для быстрых билдов
  getRecommendedConcurrency(baseConcurrency = 20) {
    const adjustment = this.getComplexityAdjustments(this.complexityLevel).concurrency || 1.0;
    return Math.max(1, Math.round(baseConcurrency * adjustment));
  }

  /**
   * Получение рекомендуемого количества токенов
   */
  // ТРИЗ оптимизация: уменьшаем базовые токены для ускорения
  getRecommendedMaxTokens(baseTokens = 400) {
    const adjustment = this.getComplexityAdjustments(this.complexityLevel).aiMaxTokens || 1.0;
    return Math.round(baseTokens * adjustment);
  }

  /**
   * Проверка, включены ли продвинутые функции
   */
  areAdvancedFeaturesEnabled() {
    return this.getComplexityAdjustments(this.complexityLevel).enableAdvancedFeatures !== false;
  }

  /**
   * Получение статистики
   */
  getStats() {
    const recent = this.complexityHistory.slice(-10);
    const transitions = recent.filter(h => h.from !== h.to).length;

    return {
      currentLevel: this.complexityLevel,
      metrics: { ...this.metrics },
      transitions: transitions,
      history: recent.map(h => ({
        timestamp: h.timestamp,
        level: h.to,
        load: h.metrics.load,
        performance: h.metrics.performance
      }))
    };
  }
}

module.exports = { AdaptiveComplexityManager };


