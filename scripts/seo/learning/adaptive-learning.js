const { log } = require('../logger');
const { getErrorHandler } = require('../utils/error-handler');

/**
 * SEO MONSTER 6.0: Adaptive Learning Engine
 * Адаптивное обучение на основе ошибок (ТРИЗ оптимизация)
 */
class AdaptiveLearningEngine {
  constructor(config) {
    this.config = config;
    this.errorHandler = getErrorHandler();
    this.learningHistory = [];
    this.maxHistorySize = 1000;
  }

  /**
   * Обучение на основе ошибки
   */
  learnFromError(error, context = {}) {
    const {
      module = 'unknown',
      operation = 'unknown',
      attempt = 1,
      resolved = false
    } = context;

    const learning = {
      timestamp: Date.now(),
      module,
      operation,
      error: {
        message: error.message,
        type: error.constructor.name,
        stack: error.stack?.substring(0, 500) // Ограничиваем размер
      },
      attempt,
      resolved,
      context: this.sanitizeContext(context)
    };

    this.learningHistory.push(learning);
    
    // Ограничиваем размер истории
    if (this.learningHistory.length > this.maxHistorySize) {
      this.learningHistory = this.learningHistory.slice(-this.maxHistorySize);
    }

    // Анализируем паттерны
    const patterns = this.analyzePatterns();
    
    if (patterns.length > 0) {
      log('ADAPTIVE-LEARNING', `Learned from error in ${module}.${operation}: ${patterns.length} patterns identified`);
    }

    return {
      learning,
      patterns,
      recommendations: this.generateRecommendations(patterns, module)
    };
  }

  /**
   * Анализ паттернов ошибок
   */
  analyzePatterns() {
    const patterns = [];
    const now = Date.now();
    const window = 3600000; // 1 час

    // Группируем ошибки по модулю и операции
    const grouped = {};
    for (const learning of this.learningHistory) {
      if (now - learning.timestamp > window) continue;
      
      const key = `${learning.module}.${learning.operation}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(learning);
    }

    // Ищем повторяющиеся паттерны
    for (const [key, learnings] of Object.entries(grouped)) {
      if (learnings.length >= 3) {
        const [module, operation] = key.split('.');
        patterns.push({
          module,
          operation,
          frequency: learnings.length,
          lastOccurrence: Math.max(...learnings.map(l => l.timestamp)),
          commonError: this.findCommonError(learnings),
          recommendation: this.getRecommendation(learnings)
        });
      }
    }

    return patterns;
  }

  /**
   * Поиск общей ошибки
   */
  findCommonError(learnings) {
    const errorTypes = {};
    for (const learning of learnings) {
      const type = learning.error.type;
      errorTypes[type] = (errorTypes[type] || 0) + 1;
    }

    const mostCommon = Object.entries(errorTypes)
      .sort((a, b) => b[1] - a[1])[0];

    return mostCommon ? mostCommon[0] : 'Unknown';
  }

  /**
   * Получение рекомендации
   */
  getRecommendation(learnings) {
    const errors = learnings.map(l => l.error.message.toLowerCase());
    
    // Паттерны и рекомендации
    if (errors.some(e => e.includes('timeout'))) {
      return 'Increase timeout or reduce concurrency';
    }
    
    if (errors.some(e => e.includes('rate limit'))) {
      return 'Implement exponential backoff or reduce request rate';
    }
    
    if (errors.some(e => e.includes('memory'))) {
      return 'Reduce batch size or implement streaming';
    }
    
    if (errors.some(e => e.includes('network'))) {
      return 'Add retry logic with exponential backoff';
    }

    return 'Review error patterns and implement specific handling';
  }

  /**
   * Генерация рекомендаций
   */
  generateRecommendations(patterns, module) {
    const recommendations = [];

    for (const pattern of patterns) {
      if (pattern.module === module) {
        recommendations.push({
          type: 'error_pattern',
          priority: pattern.frequency >= 5 ? 'high' : 'medium',
          message: pattern.recommendation,
          pattern
        });
      }
    }

    return recommendations;
  }

  /**
   * Очистка контекста от чувствительных данных
   */
  sanitizeContext(context) {
    const sanitized = { ...context };
    
    // Удаляем потенциально чувствительные поля
    delete sanitized.apiKey;
    delete sanitized.token;
    delete sanitized.password;
    delete sanitized.secret;
    
    return sanitized;
  }

  /**
   * Получение статистики обучения
   */
  getStats() {
    const now = Date.now();
    const window = 3600000; // 1 час
    const recent = this.learningHistory.filter(
      l => (now - l.timestamp) < window
    );

    return {
      total: this.learningHistory.length,
      recent: recent.length,
      resolved: recent.filter(l => l.resolved).length,
      patterns: this.analyzePatterns().length
    };
  }
}

// Singleton instance
let instance = null;

/**
 * Получить экземпляр AdaptiveLearningEngine (singleton)
 */
function getAdaptiveLearningEngine(config = {}) {
  if (!instance) {
    instance = new AdaptiveLearningEngine(config);
  }
  return instance;
}

module.exports = { AdaptiveLearningEngine, getAdaptiveLearningEngine };


