const { log, error } = require('../logger');

/**
 * SEO MONSTER 6.0: Memory Monitor
 * Мониторинг и управление памятью (ТРИЗ приоритет #1)
 */
class MemoryMonitor {
  constructor(config) {
    this.config = config;
    this.memoryThreshold = config.memoryMonitor?.threshold || 0.85; // 85% использования
    this.cleanupInterval = config.memoryMonitor?.cleanupInterval || 300000; // 5 минут
    this.memoryHistory = [];
    this.maxHistorySize = 100;
    this.cleanupTimer = null;
  }

  /**
   * Инициализация мониторинга
   */
  start(options = {}) {
    const { skipPeriodicCleanup = false } = options;
    
    this.monitor();
    
    // Периодическая очистка только если не на деплое
    if (!skipPeriodicCleanup) {
      this.startPeriodicCleanup();
      log('MEMORY-MONITOR', 'Memory monitoring started with periodic cleanup');
    } else {
      log('MEMORY-MONITOR', 'Memory monitoring started (periodic cleanup disabled for deployment)');
    }
  }

  /**
   * Остановка мониторинга
   */
  stop() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    log('MEMORY-MONITOR', 'Memory monitoring stopped');
  }

  /**
   * Мониторинг использования памяти
   */
  monitor() {
    if (typeof process.memoryUsage !== 'function') {
      return; // Не поддерживается
    }

    const usage = process.memoryUsage();
    const total = usage.heapTotal;
    const used = usage.heapUsed;
    const usagePercent = used / total;

    const snapshot = {
      timestamp: Date.now(),
      heapUsed: used,
      heapTotal: total,
      external: usage.external,
      rss: usage.rss,
      usagePercent: usagePercent
    };

    this.memoryHistory.push(snapshot);
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory = this.memoryHistory.slice(-this.maxHistorySize);
    }

    // Проверка порога
    if (usagePercent > this.memoryThreshold) {
      error('MEMORY-MONITOR', `Memory usage critical: ${(usagePercent * 100).toFixed(1)}%`);
      this.triggerCleanup();
    }

    return snapshot;
  }

  /**
   * Запуск периодической очистки
   */
  startPeriodicCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.cleanupInterval);
  }

  /**
   * Выполнение очистки памяти
   */
  performCleanup() {
    log('MEMORY-MONITOR', 'Performing memory cleanup');
    
    // Принудительная сборка мусора (если доступна)
    if (global.gc) {
      global.gc();
      log('MEMORY-MONITOR', 'Garbage collection triggered');
    }

    // Очистка истории
    if (this.memoryHistory.length > 50) {
      this.memoryHistory = this.memoryHistory.slice(-50);
    }

    // Мониторинг после очистки
    const after = this.monitor();
    log('MEMORY-MONITOR', `Memory after cleanup: ${(after.usagePercent * 100).toFixed(1)}%`);
  }

  /**
   * Экстренная очистка при превышении порога
   */
  triggerCleanup() {
    log('MEMORY-MONITOR', 'Triggering emergency cleanup');
    this.performCleanup();
  }

  /**
   * Получение статистики памяти
   */
  getStats() {
    const current = this.monitor();
    const history = this.memoryHistory;
    
    if (history.length === 0) {
      return { current, trend: 'unknown' };
    }

    const recent = history.slice(-10);
    const older = history.slice(-20, -10);
    
    const recentAvg = recent.reduce((sum, s) => sum + s.usagePercent, 0) / recent.length;
    const olderAvg = older.length > 0 
      ? older.reduce((sum, s) => sum + s.usagePercent, 0) / older.length 
      : recentAvg;

    let trend = 'stable';
    if (recentAvg > olderAvg * 1.1) {
      trend = 'increasing';
    } else if (recentAvg < olderAvg * 0.9) {
      trend = 'decreasing';
    }

    return {
      current,
      trend,
      average: recentAvg,
      max: Math.max(...recent.map(s => s.usagePercent)),
      min: Math.min(...recent.map(s => s.usagePercent))
    };
  }

  /**
   * Проверка, нужно ли ограничить операции
   */
  shouldLimitOperations() {
    const stats = this.getStats();
    return stats.current.usagePercent > this.memoryThreshold;
  }
}

module.exports = { MemoryMonitor };


