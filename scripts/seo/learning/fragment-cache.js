const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { log, error } = require('../logger');

/**
 * Кэш общих фрагментов (FAQ, state-specific секции)
 * Переиспользование для похожих VIN-страниц
 */
class FragmentCache {
  constructor() {
    this.cacheDir = path.join(process.cwd(), 'data/seo/fragment-cache');
    this.cache = new Map();
    this.ensureCacheDir();
    this.loadCache();
  }

  /**
   * Создание директории кэша если её нет
   */
  ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
      log('FRAGMENT-CACHE', `Created cache directory: ${this.cacheDir}`);
    }
  }

  /**
   * Загрузка кэша из файлов
   */
  loadCache() {
    if (!fs.existsSync(this.cacheDir)) return;

    const files = fs.readdirSync(this.cacheDir).filter(f => f.endsWith('.json'));
    log('FRAGMENT-CACHE', `Loading ${files.length} cached fragments...`);

    for (const file of files) {
      const filePath = path.join(this.cacheDir, file);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const key = this.buildKey(data.fragmentType, data.context);
        this.cache.set(key, data);
      } catch (e) {
        error('FRAGMENT-CACHE', `Error loading ${file}: ${e.message}`);
      }
    }

    log('FRAGMENT-CACHE', `Loaded ${this.cache.size} fragments`);
  }

  /**
   * Построение ключа кэша
   */
  buildKey(fragmentType, context) {
    const parts = [
      fragmentType,
      context.stateSlug || '',
      context.make || '',
      context.model || '',
      context.year || ''
    ];
    return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
  }

  /**
   * Получение кэшированного фрагмента
   */
  get(fragmentType, context) {
    const key = this.buildKey(fragmentType, context);
    const cached = this.cache.get(key);
    
    if (cached) {
      // Проверяем срок годности (30 дней)
      const age = Date.now() - new Date(cached.timestamp).getTime();
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 дней
      
      if (age < maxAge) {
        log('FRAGMENT-CACHE', `Cache HIT for ${fragmentType} (${context.stateSlug || 'general'})`);
        return cached.content;
      } else {
        log('FRAGMENT-CACHE', `Cache EXPIRED for ${fragmentType}, removing...`);
        this.cache.delete(key);
        this.deleteFile(key);
      }
    }
    
    return null;
  }

  /**
   * Сохранение фрагмента в кэш
   */
  set(fragmentType, context, content) {
    const key = this.buildKey(fragmentType, context);
    const data = {
      fragmentType,
      context,
      content,
      timestamp: new Date().toISOString(),
      wordCount: content.split(/\s+/).length
    };

    this.cache.set(key, data);
    
    // Сохраняем в файл
    const filePath = path.join(this.cacheDir, `${key}.json`);
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      log('FRAGMENT-CACHE', `Cached fragment ${fragmentType} (${data.wordCount} words)`);
    } catch (e) {
      error('FRAGMENT-CACHE', `Error saving fragment: ${e.message}`);
    }
  }

  /**
   * Удаление файла кэша
   */
  deleteFile(key) {
    const filePath = path.join(this.cacheDir, `${key}.json`);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        error('FRAGMENT-CACHE', `Error deleting cache file: ${e.message}`);
      }
    }
  }

  /**
   * Проверка наличия фрагмента в кэше
   */
  has(fragmentType, context) {
    const key = this.buildKey(fragmentType, context);
    return this.cache.has(key);
  }

  /**
   * Очистка кэша (для тестирования)
   */
  clear() {
    this.cache.clear();
    if (fs.existsSync(this.cacheDir)) {
      const files = fs.readdirSync(this.cacheDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        fs.unlinkSync(path.join(this.cacheDir, file));
      }
    }
    log('FRAGMENT-CACHE', 'Cache cleared');
  }

  /**
   * Получение статистики кэша
   */
  getStats() {
    const stats = {
      totalFragments: this.cache.size,
      byType: {},
      totalSize: 0
    };

    for (const [key, data] of this.cache.entries()) {
      const type = data.fragmentType;
      if (!stats.byType[type]) {
        stats.byType[type] = { count: 0, totalWords: 0 };
      }
      stats.byType[type].count++;
      stats.byType[type].totalWords += data.wordCount || 0;
      stats.totalSize += JSON.stringify(data).length;
    }

    return stats;
  }
}

// Singleton instance
let instance = null;

function getFragmentCache() {
  if (!instance) {
    instance = new FragmentCache();
  }
  return instance;
}

module.exports = { FragmentCache, getFragmentCache };










