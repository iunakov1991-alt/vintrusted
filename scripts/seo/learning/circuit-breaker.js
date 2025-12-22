const { log, error } = require('../logger');

/**
 * Circuit Breaker для защиты от каскадных ошибок
 * Паттерн: CLOSED → OPEN → HALF_OPEN → CLOSED
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.threshold = options.threshold || 0.5; // 50% ошибок
    this.timeWindow = options.timeWindow || 60000; // 1 минута
    this.cooldown = options.cooldown || 30000; // 30 секунд до попытки восстановления
    this.minRequests = options.minRequests || 5; // Минимум запросов для оценки
    
    this.failures = [];
    this.successes = [];
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.lastFailure = null;
    this.providerName = options.providerName || 'unknown';
  }

  /**
   * Проверка, можно ли выполнить запрос
   */
  canExecute() {
    if (this.state === 'OPEN') {
      // Проверяем, прошло ли достаточно времени для попытки восстановления
      if (this.lastFailure && Date.now() - this.lastFailure > this.cooldown) {
        log('CIRCUIT-BREAKER', `${this.providerName}: Transitioning to HALF_OPEN (cooldown expired)`);
        this.state = 'HALF_OPEN';
        return true;
      }
      log('CIRCUIT-BREAKER', `${this.providerName}: Circuit is OPEN, request blocked`);
      return false;
    }
    return true;
  }

  /**
   * Запись успешного выполнения
   */
  recordSuccess() {
    const now = Date.now();
    this.successes.push(now);
    
    // Очищаем старые записи
    this.successes = this.successes.filter(t => now - t < this.timeWindow);
    
    if (this.state === 'HALF_OPEN') {
      log('CIRCUIT-BREAKER', `${this.providerName}: Success in HALF_OPEN, transitioning to CLOSED`);
      this.state = 'CLOSED';
      this.failures = []; // Сбрасываем счетчик ошибок
    }
  }

  /**
   * Запись ошибки
   */
  recordFailure(errorType = 'UNKNOWN') {
    const now = Date.now();
    this.failures.push({ timestamp: now, type: errorType });
    this.lastFailure = now;
    
    // Очищаем старые записи
    this.failures = this.failures.filter(f => now - f.timestamp < this.timeWindow);
    
    // Подсчитываем общее количество запросов в окне
    const totalRequests = this.failures.length + this.successes.length;
    
    if (totalRequests >= this.minRequests) {
      const failureRate = this.failures.length / totalRequests;
      
      if (failureRate >= this.threshold && this.state === 'CLOSED') {
        log('CIRCUIT-BREAKER', `${this.providerName}: Failure rate ${(failureRate * 100).toFixed(1)}% exceeds threshold ${(this.threshold * 100).toFixed(1)}%, opening circuit`);
        this.state = 'OPEN';
      } else if (this.state === 'HALF_OPEN') {
        log('CIRCUIT-BREAKER', `${this.providerName}: Failure in HALF_OPEN, reopening circuit`);
        this.state = 'OPEN';
      }
    }
  }

  /**
   * Получение статистики
   */
  getStats() {
    const now = Date.now();
    const recentFailures = this.failures.filter(f => now - f.timestamp < this.timeWindow);
    const recentSuccesses = this.successes.filter(t => now - t < this.timeWindow);
    const totalRequests = recentFailures.length + recentSuccesses.length;
    const failureRate = totalRequests > 0 ? recentFailures.length / totalRequests : 0;
    
    return {
      state: this.state,
      failureRate: failureRate,
      failures: recentFailures.length,
      successes: recentSuccesses.length,
      totalRequests: totalRequests,
      lastFailure: this.lastFailure ? new Date(this.lastFailure).toISOString() : null
    };
  }

  /**
   * Сброс состояния (для тестирования или ручного восстановления)
   */
  reset() {
    log('CIRCUIT-BREAKER', `${this.providerName}: Manually resetting circuit breaker`);
    this.state = 'CLOSED';
    this.failures = [];
    this.successes = [];
    this.lastFailure = null;
  }
}

module.exports = { CircuitBreaker };










