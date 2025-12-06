const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { log } = require('../logger');

/**
 * Оптимизатор для MacBook M1
 * Управляет потоками, памятью и температурой
 */
class M1Optimizer {
  constructor() {
    this._isM1 = null; // Ленивая инициализация
    this.maxThreads = 6; // По умолчанию для M1
    this.memoryLimit = 6000; // 6 GB из 8 GB доступно
  }

  /**
   * Получить статус M1 (с кэшированием)
   */
  get isM1() {
    if (this._isM1 === null) {
      this._isM1 = this.detectM1();
      log('M1-OPTIMIZER', `M1 detection result: ${this._isM1}`);
    }
    return this._isM1;
  }

  /**
   * Определение MacBook M1
   */
  detectM1() {
    // Проверяем архитектуру
    if (process.platform !== 'darwin') return false;
    if (process.arch !== 'arm64') return false;
    
    // Дополнительная проверка через системную команду
    try {
      const { execSync } = require('child_process');
      const cpu = execSync('sysctl -n machdep.cpu.brand_string', { encoding: 'utf8', maxBuffer: 1024 }).trim();
      log('M1-OPTIMIZER', `CPU brand: "${cpu}"`);
      const isApple = cpu.includes('Apple') || cpu.includes('M1') || cpu.includes('M2') || cpu.includes('M3');
      log('M1-OPTIMIZER', `M1 detection result: ${isApple}`);
      if (isApple) return true;
    } catch (e) {
      log('M1-OPTIMIZER', `CPU detection error: ${e.message}`);
    }
    
    // Fallback: если arm64 на macOS, скорее всего M1
    if (process.arch === 'arm64') {
      log('M1-OPTIMIZER', `Fallback detection: arm64 on macOS = M1`);
      return true;
    }
    
    return false;
  }

  /**
   * Получить оптимальное количество потоков
   */
  getOptimalThreads() {
    if (!this.isM1) {
      return 4; // Для не-M1 используем 4
    }
    
    // Для M1: 6 потоков оптимально (баланс производительности и памяти)
    return this.maxThreads;
  }

  /**
   * Проверка доступной памяти
   */
  async getAvailableMemory() {
    try {
      // Используем vm_stat для получения информации о памяти
      const { stdout } = await execAsync('vm_stat', { timeout: 5000 });
      
      // Парсим вывод (упрощенная версия)
      // В реальности нужно парсить страницы памяти
      return this.memoryLimit; // Возвращаем лимит
    } catch (e) {
      return this.memoryLimit;
    }
  }

  /**
   * Очистка памяти после билда
   */
  async cleanupAfterBuild() {
    if (!this.isM1) {
      log('M1-OPTIMIZER', 'Not M1, skipping cleanup');
      return;
    }
    
    log('M1-OPTIMIZER', 'Cleaning up memory after build...');
    
    try {
      // 1. Очистка процессов (Ollama отключен, больше не используется)
      
      // 2. Принудительная сборка мусора Node.js
      if (global.gc) {
        global.gc();
        log('M1-OPTIMIZER', 'Garbage collection triggered');
      } else {
        log('M1-OPTIMIZER', 'Garbage collection not available (run with --expose-gc)');
      }
      
      // 3. Логируем использование памяти
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      
      log('M1-OPTIMIZER', `Memory after cleanup: ${heapUsedMB} MB used / ${heapTotalMB} MB total`);
      
      // 4. Небольшая пауза для освобождения памяти
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (e) {
      log('M1-OPTIMIZER', `Cleanup error: ${e.message}`);
    }
  }

  /**
   * Проверка температуры (упрощенная через CPU usage)
   */
  async checkTemperature() {
    if (!this.isM1) return null;
    
    try {
      // Используем CPU usage как индикатор нагрузки
      const cpuUsage = process.cpuUsage();
      const totalCpu = cpuUsage.user + cpuUsage.system;
      
      // Если CPU usage очень высокий, возможно перегрев
      // 1 секунда CPU time = очень высокая нагрузка
      if (totalCpu > 1000000000) {
        log('M1-OPTIMIZER', 'High CPU usage detected, may throttle');
        return 'high';
      }
      
      return 'normal';
    } catch (e) {
      return null;
    }
  }

  /**
   * Получить рекомендации по конфигурации
   */
  getRecommendations() {
    if (!this.isM1) {
      return {
        threads: 4,
        model: 'phi3',
        concurrency: 20
      };
    }
    
    return {
      threads: 6,
      model: 'phi3', // Легкая модель для 8GB
      concurrency: 42, // 6 × 7
      memoryLimit: 6000
    };
  }
}

module.exports = { M1Optimizer };

