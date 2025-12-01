const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Error Intelligence
 * Использование ошибок как ресурса для улучшения (ТРИЗ приоритет #7)
 */
class ErrorIntelligence {
  constructor(config) {
    this.config = config;
    this.errorPatterns = new Map(); // errorType -> { count: 0, contexts: [], solutions: [] }
    this.learnedSolutions = new Map(); // errorSignature -> solution
  }

  /**
   * Анализ ошибки и извлечение интеллекта
   */
  analyzeError(error, context = {}) {
    const errorType = this.categorizeError(error);
    const signature = this.getErrorSignature(error, context);
    
    // Записываем паттерн ошибки
    if (!this.errorPatterns.has(errorType)) {
      this.errorPatterns.set(errorType, {
        count: 0,
        contexts: [],
        solutions: [],
        firstSeen: Date.now(),
        lastSeen: Date.now()
      });
    }

    const pattern = this.errorPatterns.get(errorType);
    pattern.count++;
    pattern.lastSeen = Date.now();
    pattern.contexts.push({
      signature,
      context: this.sanitizeContext(context),
      timestamp: Date.now()
    });

    // Ограничиваем размер контекстов
    if (pattern.contexts.length > 50) {
      pattern.contexts = pattern.contexts.slice(-50);
    }

    // Ищем решение
    const solution = this.findSolution(signature, errorType);
    if (solution) {
      pattern.solutions.push({
        solution,
        appliedAt: Date.now(),
        success: null // Будет обновлено после применения
      });
    }

    log('ERROR-INTELLIGENCE', `Analyzed error: ${errorType} (count: ${pattern.count})`);

    return {
      errorType,
      signature,
      pattern,
      solution,
      recommendation: this.generateRecommendation(pattern, solution)
    };
  }

  /**
   * Категоризация ошибки
   */
  categorizeError(error) {
    const message = error.message || '';
    const stack = error.stack || '';

    if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
      return 'timeout';
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return 'rate_limit';
    }
    if (message.includes('memory') || message.includes('heap')) {
      return 'memory';
    }
    if (message.includes('network') || message.includes('ECONNREFUSED')) {
      return 'network';
    }
    if (message.includes('parse') || message.includes('JSON')) {
      return 'parse';
    }
    if (message.includes('permission') || message.includes('EACCES')) {
      return 'permission';
    }
    if (message.includes('not found') || message.includes('ENOENT')) {
      return 'not_found';
    }

    return 'unknown';
  }

  /**
   * Получение сигнатуры ошибки
   */
  getErrorSignature(error, context) {
    const parts = [
      this.categorizeError(error),
      context.module || 'unknown',
      context.operation || 'unknown',
      (error.message || '').substring(0, 50)
    ];
    return require('crypto').createHash('md5').update(parts.join('|')).digest('hex');
  }

  /**
   * Поиск решения для ошибки
   */
  findSolution(signature, errorType) {
    // Проверяем, есть ли уже решение для этой сигнатуры
    if (this.learnedSolutions.has(signature)) {
      return this.learnedSolutions.get(signature);
    }

    // Генерируем решение на основе типа ошибки
    const solution = this.generateSolution(errorType);
    if (solution) {
      this.learnedSolutions.set(signature, solution);
    }

    return solution;
  }

  /**
   * Генерация решения на основе типа ошибки
   */
  generateSolution(errorType) {
    const solutions = {
      timeout: {
        action: 'increase_timeout',
        params: { multiplier: 1.5 },
        description: 'Increase timeout for this operation'
      },
      rate_limit: {
        action: 'switch_provider',
        params: { fallback: true },
        description: 'Switch to alternative API provider'
      },
      memory: {
        action: 'reduce_batch_size',
        params: { factor: 0.5 },
        description: 'Reduce batch size to lower memory usage'
      },
      network: {
        action: 'retry_with_backoff',
        params: { maxRetries: 3, backoffMs: 1000 },
        description: 'Retry with exponential backoff'
      },
      parse: {
        action: 'validate_before_parse',
        params: { strict: false },
        description: 'Add validation before parsing'
      },
      permission: {
        action: 'check_permissions',
        params: { path: 'auto' },
        description: 'Check and fix file permissions'
      },
      not_found: {
        action: 'create_if_missing',
        params: { create: true },
        description: 'Create missing file or directory'
      }
    };

    return solutions[errorType] || null;
  }

  /**
   * Генерация рекомендации
   */
  generateRecommendation(pattern, solution) {
    if (!solution) {
      return {
        priority: 'low',
        action: 'monitor',
        description: 'Monitor this error pattern for now'
      };
    }

    const urgency = pattern.count > 10 ? 'high' : pattern.count > 5 ? 'medium' : 'low';

    return {
      priority: urgency,
      action: solution.action,
      description: solution.description,
      params: solution.params,
      confidence: this.calculateConfidence(pattern)
    };
  }

  /**
   * Расчет уверенности в решении
   */
  calculateConfidence(pattern) {
    // Уверенность растет с количеством повторений
    const countConfidence = Math.min(1, pattern.count / 20);
    
    // Уверенность растет, если есть успешные решения
    const solutionConfidence = pattern.solutions.filter(s => s.success === true).length / Math.max(1, pattern.solutions.length);
    
    return (countConfidence * 0.6 + solutionConfidence * 0.4);
  }

  /**
   * Применение решения
   */
  applySolution(errorType, solution, result) {
    const pattern = this.errorPatterns.get(errorType);
    if (!pattern) return;

    // Обновляем последнее решение
    if (pattern.solutions.length > 0) {
      const lastSolution = pattern.solutions[pattern.solutions.length - 1];
      lastSolution.success = result.success;
      lastSolution.appliedAt = Date.now();
      lastSolution.result = result;
    }

    log('ERROR-INTELLIGENCE', `Applied solution for ${errorType}: ${result.success ? 'success' : 'failed'}`);
  }

  /**
   * Обучение на успешных решениях
   */
  learnFromSuccess(errorType, solution) {
    const signature = `${errorType}-${solution.action}`;
    if (!this.learnedSolutions.has(signature)) {
      this.learnedSolutions.set(signature, solution);
      log('ERROR-INTELLIGENCE', `Learned new solution: ${signature}`);
    }
  }

  /**
   * Очистка контекста
   */
  sanitizeContext(context) {
    const sanitized = { ...context };
    delete sanitized.apiKey;
    delete sanitized.token;
    delete sanitized.password;
    return sanitized;
  }

  /**
   * Получение статистики ошибок
   */
  getStats() {
    const patterns = Array.from(this.errorPatterns.values());
    return {
      totalErrorTypes: patterns.length,
      totalErrors: patterns.reduce((sum, p) => sum + p.count, 0),
      topErrors: patterns
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(p => ({
          type: p.errorType || 'unknown',
          count: p.count,
          solutions: p.solutions.length
        })),
      learnedSolutions: this.learnedSolutions.size
    };
  }
}

module.exports = { ErrorIntelligence };


