const crypto = require('crypto');
const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Computation Cache
 * Кеширование результатов вычислений (ТРИЗ приоритет #3)
 */
class ComputationCache {
  constructor(config) {
    this.config = config;
    this.cache = new Map();
    this.maxSize = config.computationCache?.maxSize || 1000;
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Кеширование вычисления
   */
  cache(key, fn, options = {}) {
    const cacheKey = this.generateKey(key, options);
    
    // Проверяем кеш
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      
      // Проверяем срок действия
      if (cached.expiresAt && Date.now() > cached.expiresAt) {
        this.cache.delete(cacheKey);
      } else {
        this.hitCount++;
        return cached.value;
      }
    }

    // Вычисляем и кешируем
    this.missCount++;
    const value = typeof fn === 'function' ? fn() : fn;
    
    const expiresAt = options.ttl 
      ? Date.now() + options.ttl 
      : null;

    this.set(cacheKey, value, expiresAt);
    
    return value;
  }

  /**
   * Асинхронное кеширование
   */
  async cacheAsync(key, fn, options = {}) {
    const cacheKey = this.generateKey(key, options);
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (!cached.expiresAt || Date.now() <= cached.expiresAt) {
        this.hitCount++;
        return cached.value;
      }
      this.cache.delete(cacheKey);
    }

    this.missCount++;
    const value = await fn();
    
    const expiresAt = options.ttl 
      ? Date.now() + options.ttl 
      : null;

    this.set(cacheKey, value, expiresAt);
    
    return value;
  }

  /**
   * Установка значения в кеш
   */
  set(key, value, expiresAt = null) {
    // Проверяем размер кеша
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      cachedAt: Date.now(),
      expiresAt,
      accessCount: 0,
      lastAccessed: Date.now()
    });
  }

  /**
   * Получение значения из кеша
   */
  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    const cached = this.cache.get(key);
    
    // Проверка срока действия
    if (cached.expiresAt && Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Обновляем статистику доступа
    cached.accessCount++;
    cached.lastAccessed = Date.now();

    return cached.value;
  }

  /**
   * Удаление старейших записей
   */
  evictOldest() {
    if (this.cache.size === 0) return;

    // Находим старейшую запись
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, cached] of this.cache.entries()) {
      if (cached.lastAccessed < oldestTime) {
        oldestTime = cached.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      log('COMPUTATION-CACHE', `Evicted oldest cache entry: ${oldestKey}`);
    }
  }

  /**
   * Генерация ключа кеша
   */
  generateKey(key, options = {}) {
    const parts = [key];
    
    if (options.context) {
      parts.push(JSON.stringify(options.context));
    }
    
    if (options.variant) {
      parts.push(options.variant);
    }

    const combined = parts.join('|');
    
    // Хешируем для длинных ключей
    if (combined.length > 100) {
      return crypto.createHash('md5').update(combined).digest('hex');
    }
    
    return combined;
  }

  /**
   * Очистка кеша
   */
  clear() {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    log('COMPUTATION-CACHE', 'Cache cleared');
  }

  /**
   * Получение статистики
   */
  getStats() {
    const total = this.hitCount + this.missCount;
    const hitRate = total > 0 ? this.hitCount / total : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hitCount,
      misses: this.missCount,
      hitRate: hitRate,
      efficiency: hitRate * 100 // Процент эффективности
    };
  }
}

module.exports = { ComputationCache };


