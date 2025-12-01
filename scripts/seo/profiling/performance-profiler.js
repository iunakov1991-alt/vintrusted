const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Performance Profiler
 * Профилирование и автооптимизация (ТРИЗ приоритет #2)
 */
class PerformanceProfiler {
  constructor(config) {
    this.config = config;
    this.profiles = new Map(); // operation -> { times: [], avg: 0, min: 0, max: 0 }
    this.slowOperations = [];
    this.maxSlowOperations = 50;
  }

  /**
   * Профилирование операции
   */
  profile(operationName, fn) {
    const start = Date.now();
    let result;
    let error = null;

    try {
      result = typeof fn === 'function' ? fn() : fn;
    } catch (err) {
      error = err;
      throw err;
    } finally {
      const duration = Date.now() - start;
      this.recordOperation(operationName, duration, error);
    }

    return result;
  }

  /**
   * Асинхронное профилирование
   */
  async profileAsync(operationName, fn) {
    const start = Date.now();
    let result;
    let error = null;

    try {
      result = await fn();
    } catch (err) {
      error = err;
      throw err;
    } finally {
      const duration = Date.now() - start;
      this.recordOperation(operationName, duration, error);
    }

    return result;
  }

  /**
   * Запись операции
   */
  recordOperation(operationName, duration, error = null) {
    if (!this.profiles.has(operationName)) {
      this.profiles.set(operationName, {
        times: [],
        errors: [],
        totalCalls: 0,
        totalDuration: 0
      });
    }

    const profile = this.profiles.get(operationName);
    profile.times.push(duration);
    profile.totalCalls++;
    profile.totalDuration += duration;

    if (error) {
      profile.errors.push({
        timestamp: Date.now(),
        error: error.message
      });
    }

    // Ограничиваем размер истории
    if (profile.times.length > 100) {
      profile.times = profile.times.slice(-100);
    }

    // Отслеживаем медленные операции
    const threshold = this.config.performanceProfiler?.slowThreshold || 1000; // 1 секунда
    if (duration > threshold) {
      this.recordSlowOperation(operationName, duration);
    }
  }

  /**
   * Запись медленной операции
   */
  recordSlowOperation(operationName, duration) {
    this.slowOperations.push({
      operation: operationName,
      duration,
      timestamp: Date.now()
    });

    if (this.slowOperations.length > this.maxSlowOperations) {
      this.slowOperations = this.slowOperations.slice(-this.maxSlowOperations);
    }
  }

  /**
   * Получение статистики операции
   */
  getOperationStats(operationName) {
    const profile = this.profiles.get(operationName);
    if (!profile || profile.times.length === 0) {
      return null;
    }

    const times = profile.times;
    const avg = profile.totalDuration / profile.totalCalls;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const median = this.calculateMedian(times);
    const p95 = this.calculatePercentile(times, 95);
    const p99 = this.calculatePercentile(times, 99);

    return {
      operation: operationName,
      calls: profile.totalCalls,
      avg,
      min,
      max,
      median,
      p95,
      p99,
      errors: profile.errors.length,
      errorRate: profile.errors.length / profile.totalCalls
    };
  }

  /**
   * Получение всех статистик
   */
  getAllStats() {
    const stats = [];
    for (const [operation, profile] of this.profiles.entries()) {
      const stat = this.getOperationStats(operation);
      if (stat) {
        stats.push(stat);
      }
    }
    return stats.sort((a, b) => b.avg - a.avg);
  }

  /**
   * Выявление узких мест
   */
  identifyBottlenecks() {
    const stats = this.getAllStats();
    const bottlenecks = [];

    for (const stat of stats) {
      // Медленные операции
      if (stat.avg > 1000) {
        bottlenecks.push({
          type: 'slow_operation',
          operation: stat.operation,
          severity: stat.avg > 5000 ? 'critical' : 'high',
          avgDuration: stat.avg,
          recommendation: 'Optimize or parallelize this operation'
        });
      }

      // Высокий процент ошибок
      if (stat.errorRate > 0.1) {
        bottlenecks.push({
          type: 'high_error_rate',
          operation: stat.operation,
          severity: stat.errorRate > 0.3 ? 'critical' : 'high',
          errorRate: stat.errorRate,
          recommendation: 'Review error handling and add retry logic'
        });
      }

      // Высокая вариативность (нестабильность)
      const variability = (stat.max - stat.min) / stat.avg;
      if (variability > 2) {
        bottlenecks.push({
          type: 'high_variability',
          operation: stat.operation,
          severity: 'medium',
          variability,
          recommendation: 'Investigate causes of variability'
        });
      }
    }

    return bottlenecks;
  }

  /**
   * Автооптимизация на основе профилирования
   */
  autoOptimize() {
    const bottlenecks = this.identifyBottlenecks();
    const optimizations = [];

    for (const bottleneck of bottlenecks) {
      if (bottleneck.type === 'slow_operation' && bottleneck.avgDuration > 2000) {
        optimizations.push({
          operation: bottleneck.operation,
          action: 'parallelize',
          reason: 'Operation is too slow, should be parallelized'
        });
      }
    }

    if (optimizations.length > 0) {
      log('PERF-PROFILER', `Auto-optimization suggestions: ${optimizations.length}`);
    }

    return optimizations;
  }

  /**
   * Расчет медианы
   */
  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Расчет перцентиля
   */
  calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}

module.exports = { PerformanceProfiler };


