const { log, error } = require('../logger');

/**
 * SEO MONSTER 6.0: Unified Error Handler
 * Единый обработчик ошибок (ТРИЗ оптимизация)
 */
class ErrorHandler {
  constructor(config = {}) {
    this.config = config;
    this.errorCounts = new Map();
    this.maxErrorsPerModule = config.maxErrorsPerModule || 5;
    this.errorWindow = config.errorWindow || 60000; // 1 минута
  }

  /**
   * Обработка ошибки с логированием и fallback
   */
  handleError(err, context = {}) {
    const {
      module = 'unknown',
      operation = 'unknown',
      fallback = null,
      critical = false,
      silent = false
    } = context;

    // Увеличиваем счетчик ошибок для модуля
    this.trackError(module);

    // Логируем ошибку
    if (!silent) {
      error(module, `${operation} failed: ${err.message}`);
      if (err.stack && this.config.debug) {
        log(module, `Stack trace: ${err.stack}`);
      }
    }

    // Если критическая ошибка - пробрасываем дальше
    if (critical) {
      throw err;
    }

    // Если есть fallback - возвращаем его
    if (fallback !== null) {
      if (typeof fallback === 'function') {
        try {
          return fallback();
        } catch (fallbackErr) {
          error(module, `Fallback also failed: ${fallbackErr.message}`);
          return this.getDefaultFallback(operation);
        }
      }
      return fallback;
    }

    // Дефолтный fallback
    return this.getDefaultFallback(operation);
  }

  /**
   * Обертка для async функций с автоматической обработкой ошибок
   */
  async wrapAsync(fn, context = {}) {
    try {
      return await fn();
    } catch (err) {
      return this.handleError(err, context);
    }
  }

  /**
   * Обертка для sync функций с автоматической обработкой ошибок
   */
  wrapSync(fn, context = {}) {
    try {
      return fn();
    } catch (err) {
      return this.handleError(err, context);
    }
  }

  /**
   * Проверка, не превышен ли лимит ошибок для модуля
   */
  isModuleFailing(module) {
    const errors = this.errorCounts.get(module) || [];
    const now = Date.now();
    const recentErrors = errors.filter(timestamp => (now - timestamp) < this.errorWindow);
    
    return recentErrors.length >= this.maxErrorsPerModule;
  }

  /**
   * Отслеживание ошибки для модуля
   */
  trackError(module) {
    if (!this.errorCounts.has(module)) {
      this.errorCounts.set(module, []);
    }
    
    const errors = this.errorCounts.get(module);
    errors.push(Date.now());
    
    // Очищаем старые ошибки
    const now = Date.now();
    const recentErrors = errors.filter(timestamp => (now - timestamp) < this.errorWindow);
    this.errorCounts.set(module, recentErrors);
  }

  /**
   * Сброс счетчика ошибок для модуля
   */
  resetModule(module) {
    this.errorCounts.delete(module);
  }

  /**
   * Получение дефолтного fallback значения
   */
  getDefaultFallback(operation) {
    const fallbacks = {
      'load': null,
      'save': false,
      'generate': '',
      'analyze': {},
      'calculate': 0,
      'validate': false,
      'process': []
    };

    for (const [key, value] of Object.entries(fallbacks)) {
      if (operation.toLowerCase().includes(key)) {
        return value;
      }
    }

    return null;
  }

  /**
   * Создание безопасной обертки для модуля
   */
  createSafeWrapper(moduleName, methods) {
    const wrapper = {};
    
    for (const [methodName, method] of Object.entries(methods)) {
      if (typeof method === 'function') {
        if (method.constructor.name === 'AsyncFunction') {
          wrapper[methodName] = async (...args) => {
            return this.wrapAsync(
              () => method.apply(methods, args),
              { module: moduleName, operation: methodName }
            );
          };
        } else {
          wrapper[methodName] = (...args) => {
            return this.wrapSync(
              () => method.apply(methods, args),
              { module: moduleName, operation: methodName }
            );
          };
        }
      } else {
        wrapper[methodName] = method;
      }
    }
    
    return wrapper;
  }
}

// Singleton instance
let instance = null;

/**
 * Получить экземпляр ErrorHandler (singleton)
 */
function getErrorHandler(config = {}) {
  if (!instance) {
    instance = new ErrorHandler(config);
  }
  return instance;
}

module.exports = { ErrorHandler, getErrorHandler };


