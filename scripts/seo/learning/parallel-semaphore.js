const { log } = require('../logger');

/**
 * Семафор для ограничения параллелизма
 * Защита от перегрузки API/локальной модели
 */
class ParallelSemaphore {
  constructor(maxConcurrent = 6) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = [];
    this.totalAcquired = 0;
    this.totalReleased = 0;
  }

  /**
   * Получить разрешение на выполнение
   * Возвращает Promise, который резолвится, когда есть свободный слот
   */
  async acquire() {
    return new Promise((resolve) => {
      if (this.running < this.maxConcurrent) {
        this.running++;
        this.totalAcquired++;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  /**
   * Освободить слот
   */
  release() {
    this.running--;
    this.totalReleased++;
    
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      this.running++;
      this.totalAcquired++;
      next();
    }
  }

  /**
   * Обернуть функцию для автоматического управления семафором
   */
  async execute(fn) {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  /**
   * Получить статистику
   */
  getStats() {
    return {
      maxConcurrent: this.maxConcurrent,
      running: this.running,
      queued: this.queue.length,
      totalAcquired: this.totalAcquired,
      totalReleased: this.totalReleased
    };
  }

  /**
   * Сброс статистики
   */
  resetStats() {
    this.totalAcquired = 0;
    this.totalReleased = 0;
  }
}

module.exports = { ParallelSemaphore };



















