/**
 * MONSTER 7.1 — SECTION CACHE
 * 
 * ТРИЗ-принцип "ИСПОЛЬЗОВАНИЕ РЕСУРСОВ":
 * - Кэширование повторяющихся секций (введение, FAQ)
 * - Переиспользование уже созданного контента
 */

const fs = require('fs');
const path = require('path');

class SectionCache {
  constructor(config) {
    this.config = config;
    this.cache = new Map();
    this.cachePath = path.join(process.cwd(), 'data/cache/sections');
    this.maxCacheSize = 100; // Максимум 100 секций в памяти
    
    // Создаём директорию кэша
    if (!fs.existsSync(this.cachePath)) {
      fs.mkdirSync(this.cachePath, { recursive: true });
    }
    
    // Загружаем кэш с диска
    this.loadCache();
  }

  /**
   * Генерация ключа кэша
   */
  getCacheKey(sectionType, context) {
    const { theme, intent } = context;
    
    // Кэшируем только определённые типы секций
    const cacheableTypes = ['introduction', 'faq'];
    
    if (!cacheableTypes.includes(sectionType)) {
      return null; // Не кэшируем
    }
    
    return `${sectionType}-${theme}-${intent}`;
  }

  /**
   * Получение из кэша или генерация
   */
  async getOrGenerate(sectionType, context, generator) {
    const key = this.getCacheKey(sectionType, context);
    
    // Если секция не кэшируется, генерируем сразу
    if (!key) {
      return await generator(sectionType, context);
    }
    
    // Проверяем кэш в памяти
    if (this.cache.has(key)) {
      console.log(`[CACHE] Hit (memory): ${key}`);
      return this.cache.get(key);
    }
    
    // Проверяем кэш на диске
    const cached = this.loadFromDisk(key);
    if (cached) {
      console.log(`[CACHE] Hit (disk): ${key}`);
      this.cache.set(key, cached);
      return cached;
    }
    
    // Генерируем новую секцию
    console.log(`[CACHE] Miss: ${key}, generating...`);
    const section = await generator(sectionType, context);
    
    // Сохраняем в кэш
    this.saveToCache(key, section);
    
    return section;
  }

  /**
   * Сохранение в кэш
   */
  saveToCache(key, section) {
    // Сохраняем в память
    if (this.cache.size >= this.maxCacheSize) {
      // Удаляем самую старую запись (FIFO)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, section);
    
    // Сохраняем на диск
    this.saveToDisk(key, section);
  }

  /**
   * Сохранение на диск
   */
  saveToDisk(key, section) {
    try {
      const filePath = path.join(this.cachePath, `${key}.json`);
      fs.writeFileSync(filePath, JSON.stringify(section, null, 2), 'utf8');
    } catch (error) {
      console.warn(`[CACHE] Failed to save to disk: ${error.message}`);
    }
  }

  /**
   * Загрузка с диска
   */
  loadFromDisk(key) {
    try {
      const filePath = path.join(this.cachePath, `${key}.json`);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn(`[CACHE] Failed to load from disk: ${error.message}`);
    }
    return null;
  }

  /**
   * Загрузка всего кэша с диска
   */
  loadCache() {
    try {
      const files = fs.readdirSync(this.cachePath);
      let loaded = 0;
      
      for (const file of files.slice(0, this.maxCacheSize)) {
        if (file.endsWith('.json')) {
          const key = file.replace('.json', '');
          const cached = this.loadFromDisk(key);
          if (cached) {
            this.cache.set(key, cached);
            loaded++;
          }
        }
      }
      
      console.log(`[CACHE] Loaded ${loaded} sections from disk`);
    } catch (error) {
      console.warn(`[CACHE] Failed to load cache: ${error.message}`);
    }
  }

  /**
   * Очистка кэша
   */
  clear() {
    this.cache.clear();
    try {
      const files = fs.readdirSync(this.cachePath);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(this.cachePath, file));
        }
      });
      console.log('[CACHE] Cache cleared');
    } catch (error) {
      console.warn(`[CACHE] Failed to clear cache: ${error.message}`);
    }
  }

  /**
   * Статистика кэша
   */
  getStats() {
    return {
      memorySize: this.cache.size,
      maxSize: this.maxCacheSize,
      diskSize: this.getDiskCacheSize()
    };
  }

  getDiskCacheSize() {
    try {
      const files = fs.readdirSync(this.cachePath);
      return files.filter(f => f.endsWith('.json')).length;
    } catch (error) {
      return 0;
    }
  }
}

module.exports = SectionCache;








