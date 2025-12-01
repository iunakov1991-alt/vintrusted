const { log, error } = require('../logger');

/**
 * SEO MONSTER 6.0: Error Isolation
 * Изоляция ошибок на уровне модуля (ТРИЗ приоритет #1)
 */
class ErrorIsolation {
  constructor(config) {
    this.config = config;
    this.isolatedModules = new Map(); // module -> { state, errors, lastError }
  }

  /**
   * Изоляция модуля при ошибках
   */
  isolateModule(moduleName, fn, fallback = null) {
    const moduleState = this.getModuleState(moduleName);

    // Если модуль изолирован - используем fallback
    if (moduleState.isolated) {
      log('ERROR-ISOLATION', `${moduleName}: Module isolated, using fallback`);
      if (fallback) {
        return typeof fallback === 'function' ? fallback() : fallback;
      }
      throw new Error(`Module ${moduleName} is isolated due to errors`);
    }

    try {
      const result = typeof fn === 'function' ? fn() : fn;
      
      // Успешное выполнение - сбрасываем счетчик ошибок
      this.resetModuleErrors(moduleName);
      
      return result;
    } catch (err) {
      this.recordModuleError(moduleName, err);
      
      // Если превышен порог - изолируем модуль
      if (this.shouldIsolateModule(moduleName)) {
        this.isolateModuleState(moduleName);
        error('ERROR-ISOLATION', `${moduleName}: Module ISOLATED due to ${moduleState.errors.length} errors`);
      }
      
      // Используем fallback если доступен
      if (fallback) {
        log('ERROR-ISOLATION', `${moduleName}: Using fallback after error`);
        return typeof fallback === 'function' ? fallback() : fallback;
      }
      
      throw err;
    }
  }

  /**
   * Асинхронная изоляция
   */
  async isolateModuleAsync(moduleName, fn, fallback = null) {
    const moduleState = this.getModuleState(moduleName);

    if (moduleState.isolated) {
      log('ERROR-ISOLATION', `${moduleName}: Module isolated, using fallback`);
      if (fallback) {
        return typeof fallback === 'function' ? await fallback() : fallback;
      }
      throw new Error(`Module ${moduleName} is isolated due to errors`);
    }

    try {
      const result = await fn();
      this.resetModuleErrors(moduleName);
      return result;
    } catch (err) {
      this.recordModuleError(moduleName, err);
      
      if (this.shouldIsolateModule(moduleName)) {
        this.isolateModuleState(moduleName);
        error('ERROR-ISOLATION', `${moduleName}: Module ISOLATED`);
      }
      
      if (fallback) {
        return typeof fallback === 'function' ? await fallback() : fallback;
      }
      
      throw err;
    }
  }

  /**
   * Получение состояния модуля
   */
  getModuleState(moduleName) {
    if (!this.isolatedModules.has(moduleName)) {
      this.isolatedModules.set(moduleName, {
        isolated: false,
        errors: [],
        lastError: null,
        isolatedAt: null
      });
    }
    return this.isolatedModules.get(moduleName);
  }

  /**
   * Изоляция модуля
   */
  isolateModuleState(moduleName) {
    const state = this.getModuleState(moduleName);
    state.isolated = true;
    state.isolatedAt = Date.now();
  }

  /**
   * Запись ошибки модуля
   */
  recordModuleError(moduleName, err) {
    const state = this.getModuleState(moduleName);
    const now = Date.now();
    
    state.errors.push({
      timestamp: now,
      error: err.message,
      stack: err.stack?.substring(0, 200)
    });
    
    state.lastError = now;
    
    // Ограничиваем размер истории (последние 10 ошибок)
    if (state.errors.length > 10) {
      state.errors = state.errors.slice(-10);
    }
  }

  /**
   * Сброс ошибок модуля
   */
  resetModuleErrors(moduleName) {
    const state = this.getModuleState(moduleName);
    state.errors = [];
    state.lastError = null;
    state.isolated = false;
    state.isolatedAt = null;
  }

  /**
   * Проверка, нужно ли изолировать модуль
   */
  shouldIsolateModule(moduleName) {
    const state = this.getModuleState(moduleName);
    const threshold = this.config.errorIsolation?.threshold || 5;
    const window = this.config.errorIsolation?.window || 60000; // 1 минута
    
    const now = Date.now();
    const recentErrors = state.errors.filter(
      e => (now - e.timestamp) < window
    );
    
    return recentErrors.length >= threshold;
  }

  /**
   * Принудительное восстановление модуля
   */
  recoverModule(moduleName) {
    this.resetModuleErrors(moduleName);
    log('ERROR-ISOLATION', `${moduleName}: Module recovered`);
  }

  /**
   * Graceful Degradation - работа в урезанном режиме
   */
  gracefulDegrade(moduleName, reducedFunctionality) {
    const state = this.getModuleState(moduleName);
    state.isolated = true;
    state.degradedMode = true;
    state.reducedFunctionality = reducedFunctionality;
    log('ERROR-ISOLATION', `${moduleName}: Entered graceful degradation mode`);
  }
}

module.exports = { ErrorIsolation };

