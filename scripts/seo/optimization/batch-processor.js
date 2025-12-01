const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Batch Processor
 * Группировка операций для эффективности (ТРИЗ приоритет #4)
 */
class BatchProcessor {
  constructor(config) {
    this.config = config;
    this.batchSize = config.batchProcessor?.batchSize || 10;
    this.batchTimeout = config.batchProcessor?.batchTimeout || 100; // 100ms
    this.pendingBatches = new Map(); // operationType -> { items: [], timer: null }
  }

  /**
   * Добавление элемента в батч
   */
  async addToBatch(operationType, item, processor) {
    if (!this.pendingBatches.has(operationType)) {
      this.pendingBatches.set(operationType, {
        items: [],
        timer: null,
        processor: processor
      });
    }

    const batch = this.pendingBatches.get(operationType);
    batch.items.push(item);

    // Если батч заполнен - обрабатываем сразу
    if (batch.items.length >= this.batchSize) {
      return this.processBatch(operationType);
    }

    // Иначе запускаем таймер
    if (!batch.timer) {
      batch.timer = setTimeout(() => {
        this.processBatch(operationType);
      }, this.batchTimeout);
    }

    // Возвращаем промис, который разрешится после обработки
    return new Promise((resolve, reject) => {
      batch.pendingResolves = batch.pendingResolves || [];
      batch.pendingResolves.push({ resolve, reject, item });
    });
  }

  /**
   * Обработка батча
   */
  async processBatch(operationType) {
    const batch = this.pendingBatches.get(operationType);
    if (!batch || batch.items.length === 0) {
      return;
    }

    // Очищаем таймер
    if (batch.timer) {
      clearTimeout(batch.timer);
      batch.timer = null;
    }

    const items = [...batch.items];
    const resolves = batch.pendingResolves || [];
    batch.items = [];
    batch.pendingResolves = [];

    log('BATCH-PROCESSOR', `Processing batch of ${items.length} items for ${operationType}`);

    try {
      // Обрабатываем батч
      const results = await batch.processor(items);

      // Разрешаем все промисы
      for (let i = 0; i < resolves.length; i++) {
        const result = Array.isArray(results) ? results[i] : results;
        resolves[i].resolve(result);
      }
    } catch (err) {
      // Отклоняем все промисы при ошибке
      for (const { reject } of resolves) {
        reject(err);
      }
    }
  }

  /**
   * Принудительная обработка всех батчей
   */
  async flushAll() {
    const operations = Array.from(this.pendingBatches.keys());
    const promises = operations.map(op => this.processBatch(op));
    await Promise.all(promises);
    log('BATCH-PROCESSOR', 'All batches flushed');
  }

  /**
   * Получение статистики батчей
   */
  getStats() {
    const stats = {};
    
    for (const [operationType, batch] of this.pendingBatches.entries()) {
      stats[operationType] = {
        pending: batch.items.length,
        batchSize: this.batchSize,
        hasTimer: !!batch.timer
      };
    }

    return stats;
  }
}

module.exports = { BatchProcessor };


