const fs = require('fs');
const path = require('path');
const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Self-Cleanup Engine
 * Автоочистка ненужных данных (ТРИЗ приоритет #8)
 */
class SelfCleanupEngine {
  constructor(config) {
    this.config = config;
    this.cleanupRules = [];
    this.cleanupHistory = [];
    this.maxHistorySize = 100;
  }

  /**
   * Регистрация правила очистки
   */
  registerRule(rule) {
    this.cleanupRules.push({
      ...rule,
      lastRun: null,
      runCount: 0
    });
    log('SELF-CLEANUP', `Registered cleanup rule: ${rule.name}`);
  }

  /**
   * Выполнение всех правил очистки
   */
  async cleanup(options = {}) {
    const { dryRun = false, force = false } = options;
    const results = [];

    for (const rule of this.cleanupRules) {
      // Проверяем, нужно ли выполнять правило
      if (!force && rule.interval) {
        const now = Date.now();
        const lastRun = rule.lastRun || 0;
        if (now - lastRun < rule.interval) {
          continue; // Еще не время
        }
      }

      try {
        const result = await this.executeRule(rule, { dryRun });
        results.push(result);
        rule.lastRun = Date.now();
        rule.runCount++;
      } catch (e) {
        log('SELF-CLEANUP', `Error executing rule ${rule.name}: ${e.message}`);
        results.push({
          rule: rule.name,
          success: false,
          error: e.message
        });
      }
    }

    // Сохраняем историю
    this.cleanupHistory.push({
      timestamp: Date.now(),
      results,
      dryRun
    });

    if (this.cleanupHistory.length > this.maxHistorySize) {
      this.cleanupHistory = this.cleanupHistory.slice(-this.maxHistorySize);
    }

    const totalCleaned = results.reduce((sum, r) => sum + (r.cleaned || 0), 0);
    log('SELF-CLEANUP', `Cleanup completed: ${totalCleaned} items cleaned, ${results.length} rules executed`);

    return {
      totalCleaned,
      results,
      dryRun
    };
  }

  /**
   * Выполнение конкретного правила
   */
  async executeRule(rule, options = {}) {
    const { dryRun = false } = options;
    let cleaned = 0;
    let freed = 0; // bytes freed

    switch (rule.type) {
      case 'old_files':
        const fileResult = await this.cleanupOldFiles(rule, dryRun);
        cleaned = fileResult.count;
        freed = fileResult.freed;
        break;

      case 'old_cache':
        const cacheResult = await this.cleanupOldCache(rule, dryRun);
        cleaned = cacheResult.count;
        freed = cacheResult.freed;
        break;

      case 'old_logs':
        const logResult = await this.cleanupOldLogs(rule, dryRun);
        cleaned = logResult.count;
        freed = logResult.freed;
        break;

      case 'duplicate_files':
        const dupResult = await this.cleanupDuplicates(rule, dryRun);
        cleaned = dupResult.count;
        freed = dupResult.freed;
        break;

      case 'empty_directories':
        const dirResult = await this.cleanupEmptyDirs(rule, dryRun);
        cleaned = dirResult.count;
        freed = dirResult.freed;
        break;

      default:
        throw new Error(`Unknown cleanup rule type: ${rule.type}`);
    }

    return {
      rule: rule.name,
      type: rule.type,
      cleaned,
      freed,
      success: true,
      dryRun
    };
  }

  /**
   * Очистка старых файлов
   */
  async cleanupOldFiles(rule, dryRun) {
    const { path: targetPath, maxAge = 86400000, pattern = '*' } = rule; // 24 часа по умолчанию
    const dir = path.join(process.cwd(), targetPath);
    
    if (!fs.existsSync(dir)) {
      return { count: 0, freed: 0 };
    }

    const files = this.findFiles(dir, pattern);
    const now = Date.now();
    let count = 0;
    let freed = 0;

    for (const file of files) {
      try {
        const stats = fs.statSync(file);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          if (!dryRun) {
            const size = stats.size;
            fs.unlinkSync(file);
            freed += size;
          }
          count++;
        }
      } catch (e) {
        // Игнорируем ошибки доступа
      }
    }

    return { count, freed };
  }

  /**
   * Очистка старого кеша
   */
  async cleanupOldCache(rule, dryRun) {
    const { path: cachePath = 'data/seo/cache', maxAge = 604800000 } = rule; // 7 дней
    return this.cleanupOldFiles({ ...rule, path: cachePath, maxAge }, dryRun);
  }

  /**
   * Очистка старых логов
   */
  async cleanupOldLogs(rule, dryRun) {
    const { path: logPath = 'data/seo/logs', maxAge = 2592000000, keepRecent = 100 } = rule; // 30 дней, но оставляем последние 100
    
    const dir = path.join(process.cwd(), logPath);
    if (!fs.existsSync(dir)) {
      return { count: 0, freed: 0 };
    }

    const files = this.findFiles(dir, '*.log');
    const now = Date.now();
    
    // Сортируем по дате модификации (новые первыми)
    const filesWithStats = files.map(file => {
      try {
        const stats = fs.statSync(file);
        return { file, stats, age: now - stats.mtimeMs };
      } catch (e) {
        return null;
      }
    }).filter(Boolean).sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs);

    let count = 0;
    let freed = 0;

    // Удаляем старые файлы, но оставляем последние keepRecent
    for (let i = keepRecent; i < filesWithStats.length; i++) {
      const { file, stats, age } = filesWithStats[i];
      if (age > maxAge) {
        if (!dryRun) {
          const size = stats.size;
          fs.unlinkSync(file);
          freed += size;
        }
        count++;
      }
    }

    return { count, freed };
  }

  /**
   * Очистка дубликатов
   */
  async cleanupDuplicates(rule, dryRun) {
    const { path: targetPath, hashAlgorithm = 'md5' } = rule;
    const dir = path.join(process.cwd(), targetPath);
    
    if (!fs.existsSync(dir)) {
      return { count: 0, freed: 0 };
    }

    const files = this.findFiles(dir);
    const hashes = new Map();
    let count = 0;
    let freed = 0;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file);
        const hash = require('crypto').createHash(hashAlgorithm).update(content).digest('hex');
        
        if (hashes.has(hash)) {
          // Дубликат найден - удаляем
          const stats = fs.statSync(file);
          if (!dryRun) {
            fs.unlinkSync(file);
            freed += stats.size;
          }
          count++;
        } else {
          hashes.set(hash, file);
        }
      } catch (e) {
        // Игнорируем ошибки
      }
    }

    return { count, freed };
  }

  /**
   * Очистка пустых директорий
   */
  async cleanupEmptyDirs(rule, dryRun) {
    const { path: targetPath, recursive = true } = rule;
    const dir = path.join(process.cwd(), targetPath);
    
    if (!fs.existsSync(dir)) {
      return { count: 0, freed: 0 };
    }

    let count = 0;
    const emptyDirs = this.findEmptyDirs(dir, recursive);

    for (const emptyDir of emptyDirs) {
      try {
        if (!dryRun) {
          fs.rmdirSync(emptyDir);
        }
        count++;
      } catch (e) {
        // Игнорируем ошибки
      }
    }

    return { count, freed: 0 };
  }

  /**
   * Поиск файлов
   */
  findFiles(dir, pattern = '*') {
    const files = [];
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          files.push(...this.findFiles(fullPath, pattern));
        } else if (entry.isFile()) {
          if (pattern === '*' || this.matchesPattern(entry.name, pattern)) {
            files.push(fullPath);
          }
        }
      }
    } catch (e) {
      // Игнорируем ошибки доступа
    }

    return files;
  }

  /**
   * Проверка соответствия паттерну
   */
  matchesPattern(filename, pattern) {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(filename);
    }
    return filename === pattern;
  }

  /**
   * Поиск пустых директорий
   */
  findEmptyDirs(dir, recursive) {
    const emptyDirs = [];
    
    try {
      const entries = fs.readdirSync(dir);
      
      if (entries.length === 0) {
        emptyDirs.push(dir);
      } else if (recursive) {
        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          try {
            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
              emptyDirs.push(...this.findEmptyDirs(fullPath, recursive));
            }
          } catch (e) {
            // Игнорируем
          }
        }
      }
    } catch (e) {
      // Игнорируем ошибки доступа
    }

    return emptyDirs;
  }

  /**
   * Инициализация правил по умолчанию
   */
  initializeDefaultRules() {
    // Очистка старых кешей
    this.registerRule({
      name: 'cleanup_old_cache',
      type: 'old_cache',
      path: 'data/seo/cache',
      maxAge: 604800000, // 7 дней
      interval: 86400000 // Каждые 24 часа
    });

    // Очистка старых логов
    this.registerRule({
      name: 'cleanup_old_logs',
      type: 'old_logs',
      path: 'data/seo/logs',
      maxAge: 2592000000, // 30 дней
      keepRecent: 100,
      interval: 86400000 // Каждые 24 часа
    });

    // Очистка временных файлов
    this.registerRule({
      name: 'cleanup_temp_files',
      type: 'old_files',
      path: 'data/seo/temp',
      maxAge: 86400000, // 24 часа
      pattern: '*',
      interval: 3600000 // Каждый час
    });

    log('SELF-CLEANUP', 'Default cleanup rules initialized');
  }

  /**
   * Получение статистики
   */
  getStats() {
    return {
      rulesCount: this.cleanupRules.length,
      totalRuns: this.cleanupHistory.length,
      lastCleanup: this.cleanupHistory.length > 0 
        ? this.cleanupHistory[this.cleanupHistory.length - 1].timestamp 
        : null,
      rules: this.cleanupRules.map(r => ({
        name: r.name,
        type: r.type,
        runCount: r.runCount,
        lastRun: r.lastRun
      }))
    };
  }
}

module.exports = { SelfCleanupEngine };


