/**
 * MONSTER 7.1 — МОНИТОР
 * 
 * Мониторинг системы: память, CPU, задачи, производительность.
 */

const { getLogger } = require('./logger');

class SystemMonitor {
  constructor(config) {
    this.config = config;
    this.logger = getLogger(config);
    this.metrics = {
      memory: [],
      tasks: [],
      performance: []
    };
    this.isMonitoring = false;
    this.interval = null;
  }

  /**
   * Запуск мониторинга
   */
  start(intervalMs = 5000) {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.interval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    this.logger.info('MONITOR', 'System monitoring started');
  }

  /**
   * Остановка мониторинга
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isMonitoring = false;
    this.logger.info('MONITOR', 'System monitoring stopped');
  }

  /**
   * Сбор метрик
   */
  collectMetrics() {
    const memory = this.getMemoryUsage();
    const tasks = this.getTaskMetrics();
    const performance = this.getPerformanceMetrics();

    const timestamp = Date.now();

    // Сохранение метрик
    this.metrics.memory.push({ timestamp, ...memory });
    this.metrics.tasks.push({ timestamp, ...tasks });
    this.metrics.performance.push({ timestamp, ...performance });

    // Ограничение размера (храним последние 100 записей)
    ['memory', 'tasks', 'performance'].forEach(key => {
      if (this.metrics[key].length > 100) {
        this.metrics[key] = this.metrics[key].slice(-100);
      }
    });

    // Логирование критических состояний
    if (memory.percent > 85) {
      this.logger.warn('MONITOR', 'High memory usage detected', memory);
    }

    if (tasks.failed > 0) {
      this.logger.warn('MONITOR', 'Failed tasks detected', tasks);
    }
  }

  /**
   * Получение использования памяти
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    // maxMemory в MB (по умолчанию 6144 MB для M1)
    const maxMemoryMB = this.config.m1Limits?.maxMemory || 6144;
    const maxMemoryBytes = maxMemoryMB * 1024 * 1024;
    
    // Используем RSS как основной показатель использования памяти
    const rssMB = usage.rss / 1024 / 1024;
    const percent = Math.min(100, Math.round((rssMB / maxMemoryMB) * 100));

    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      rss: Math.round(rssMB), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      percent: percent,
      used: Math.round(rssMB) // Для совместимости с API
    };
  }

  /**
   * Получение метрик задач
   */
  getTaskMetrics() {
    // Заглушка: в реальности здесь будет получение из orchestrator
    return {
      total: 0,
      running: 0,
      completed: 0,
      failed: 0
    };
  }

  /**
   * Получение метрик производительности
   */
  getPerformanceMetrics() {
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();

    return {
      cpuUser: cpuUsage.user / 1000000, // seconds
      cpuSystem: cpuUsage.system / 1000000, // seconds
      uptime: Math.round(uptime) // seconds
    };
  }

  /**
   * Получение текущих метрик
   */
  getCurrentMetrics() {
    return {
      memory: this.getMemoryUsage(),
      tasks: this.getTaskMetrics(),
      performance: this.getPerformanceMetrics(),
      timestamp: Date.now()
    };
  }

  /**
   * Получение истории метрик
   */
  getMetricsHistory(limit = 50) {
    return {
      memory: this.metrics.memory.slice(-limit),
      tasks: this.metrics.tasks.slice(-limit),
      performance: this.metrics.performance.slice(-limit)
    };
  }

  /**
   * Получение статистики
   */
  getStatistics() {
    const memory = this.metrics.memory;
    const tasks = this.metrics.tasks;

    return {
      memory: {
        average: memory.length > 0 
          ? Math.round(memory.reduce((sum, m) => sum + m.percent, 0) / memory.length)
          : 0,
        max: memory.length > 0 
          ? Math.max(...memory.map(m => m.percent))
          : 0,
        min: memory.length > 0 
          ? Math.min(...memory.map(m => m.percent))
          : 0
      },
      tasks: {
        totalCompleted: tasks.length > 0
          ? tasks.reduce((sum, t) => sum + (t.completed || 0), 0)
          : 0,
        totalFailed: tasks.length > 0
          ? tasks.reduce((sum, t) => sum + (t.failed || 0), 0)
          : 0
      }
    };
  }
}

module.exports = SystemMonitor;




















