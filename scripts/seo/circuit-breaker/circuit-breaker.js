const { log, error } = require('../logger');

/**
 * SEO MONSTER 6.0: Circuit Breaker
 * Защита от проблемных модулей (ТРИЗ оптимизация)
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 минута
    this.monitoringWindow = options.monitoringWindow || 60000; // 1 минута
    
    this.states = new Map(); // module -> { state, failures, lastFailure, openedAt }
    this.stateTypes = {
      CLOSED: 'closed',      // Нормальная работа
      OPEN: 'open',          // Модуль отключен
      HALF_OPEN: 'half_open' // Тестирование восстановления
    };
  }

  /**
   * Выполнение функции через circuit breaker
   */
  async execute(moduleName, fn, fallback = null) {
    const state = this.getState(moduleName);

    // Если circuit открыт - используем fallback
    if (state.state === this.stateTypes.OPEN) {
      const timeSinceOpen = Date.now() - state.openedAt;
      
      // Проверяем, не пора ли перейти в half-open
      if (timeSinceOpen >= this.resetTimeout) {
        this.setState(moduleName, this.stateTypes.HALF_OPEN);
        log('CIRCUIT-BREAKER', `${moduleName}: Transitioning to HALF_OPEN for testing`);
      } else {
        log('CIRCUIT-BREAKER', `${moduleName}: Circuit OPEN, using fallback`);
        if (fallback) {
          return typeof fallback === 'function' ? fallback() : fallback;
        }
        throw new Error(`Circuit breaker is OPEN for module: ${moduleName}`);
      }
    }

    try {
      const result = await fn();
      
      // Успешное выполнение - сбрасываем счетчик ошибок
      if (state.state === this.stateTypes.HALF_OPEN) {
        this.setState(moduleName, this.stateTypes.CLOSED);
        log('CIRCUIT-BREAKER', `${moduleName}: Circuit CLOSED after successful test`);
      } else {
        this.resetFailures(moduleName);
      }
      
      return result;
    } catch (err) {
      this.recordFailure(moduleName);
      
      // Если превышен порог - открываем circuit
      if (this.shouldOpenCircuit(moduleName)) {
        this.setState(moduleName, this.stateTypes.OPEN);
        error('CIRCUIT-BREAKER', `${moduleName}: Circuit OPENED due to ${this.failureThreshold} failures`);
      }
      
      // Используем fallback если доступен
      if (fallback) {
        log('CIRCUIT-BREAKER', `${moduleName}: Using fallback after error`);
        return typeof fallback === 'function' ? fallback() : fallback;
      }
      
      throw err;
    }
  }

  /**
   * Получение состояния модуля
   */
  getState(moduleName) {
    if (!this.states.has(moduleName)) {
      this.states.set(moduleName, {
        state: this.stateTypes.CLOSED,
        failures: [],
        lastFailure: null,
        openedAt: null
      });
    }
    return this.states.get(moduleName);
  }

  /**
   * Установка состояния модуля
   */
  setState(moduleName, newState) {
    const state = this.getState(moduleName);
    state.state = newState;
    
    if (newState === this.stateTypes.OPEN) {
      state.openedAt = Date.now();
    } else if (newState === this.stateTypes.CLOSED) {
      state.openedAt = null;
      this.resetFailures(moduleName);
    }
  }

  /**
   * Запись ошибки
   */
  recordFailure(moduleName) {
    const state = this.getState(moduleName);
    const now = Date.now();
    
    state.failures.push(now);
    state.lastFailure = now;
    
    // Очищаем старые ошибки
    state.failures = state.failures.filter(
      timestamp => (now - timestamp) < this.monitoringWindow
    );
  }

  /**
   * Сброс счетчика ошибок
   */
  resetFailures(moduleName) {
    const state = this.getState(moduleName);
    state.failures = [];
    state.lastFailure = null;
  }

  /**
   * Проверка, нужно ли открыть circuit
   */
  shouldOpenCircuit(moduleName) {
    const state = this.getState(moduleName);
    return state.failures.length >= this.failureThreshold;
  }

  /**
   * Принудительное закрытие circuit
   */
  reset(moduleName) {
    this.setState(moduleName, this.stateTypes.CLOSED);
    log('CIRCUIT-BREAKER', `${moduleName}: Circuit manually reset to CLOSED`);
  }

  /**
   * Получение статистики
   */
  getStats(moduleName) {
    const state = this.getState(moduleName);
    return {
      state: state.state,
      failures: state.failures.length,
      lastFailure: state.lastFailure,
      openedAt: state.openedAt
    };
  }
}

// Singleton instance
let instance = null;

/**
 * Получить экземпляр CircuitBreaker (singleton)
 */
function getCircuitBreaker(options = {}) {
  if (!instance) {
    instance = new CircuitBreaker(options);
  }
  return instance;
}

module.exports = { CircuitBreaker, getCircuitBreaker };


