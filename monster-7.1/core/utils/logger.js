/**
 * MONSTER 7.1 — ЛОГГЕР
 * 
 * Централизованная система логирования с уровнями и ротацией.
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor(config) {
    this.config = config;
    this.logsPath = path.join(process.cwd(), 'data/logs');
    this.logFile = path.join(this.logsPath, `monster_${this.getDateString()}.log`);
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    this.currentLevel = this.levels[config.logLevel || 'INFO'];
    
    // Создание директории логов
    if (!fs.existsSync(this.logsPath)) {
      fs.mkdirSync(this.logsPath, { recursive: true });
    }
  }

  /**
   * Логирование с уровнем
   */
  log(level, module, message, data = null) {
    const levelNum = this.levels[level] || this.levels.INFO;
    
    if (levelNum > this.currentLevel) {
      return; // Пропускаем если уровень ниже текущего
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      module,
      message,
      data
    };

    // Консольный вывод
    const consoleMessage = `[${timestamp}] [${level}] [${module}] ${message}`;
    this.consoleLog(level, consoleMessage, data);

    // Файловый вывод
    this.fileLog(logEntry);
  }

  /**
   * Консольный вывод с цветами
   */
  consoleLog(level, message, data) {
    const colors = {
      ERROR: '\x1b[31m', // Red
      WARN: '\x1b[33m',  // Yellow
      INFO: '\x1b[36m',  // Cyan
      DEBUG: '\x1b[90m'  // Gray
    };
    const reset = '\x1b[0m';
    const color = colors[level] || '';

    console.log(`${color}${message}${reset}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  /**
   * Файловый вывод
   */
  fileLog(entry) {
    try {
      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logFile, line, 'utf8');
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }

  /**
   * Методы для разных уровней
   */
  error(module, message, data = null) {
    this.log('ERROR', module, message, data);
  }

  warn(module, message, data = null) {
    this.log('WARN', module, message, data);
  }

  info(module, message, data = null) {
    this.log('INFO', module, message, data);
  }

  debug(module, message, data = null) {
    this.log('DEBUG', module, message, data);
  }

  /**
   * Логирование производительности
   */
  performance(module, operation, duration, data = {}) {
    this.info(module, `Performance: ${operation} took ${duration}ms`, {
      operation,
      duration,
      ...data
    });
  }

  /**
   * Логирование памяти
   */
  memory(module, usage) {
    const percent = Math.round((usage.heapUsed / (6 * 1024 * 1024 * 1024)) * 100);
    if (percent > 80) {
      this.warn(module, `High memory usage: ${percent}%`, usage);
    } else {
      this.debug(module, `Memory usage: ${percent}%`, usage);
    }
  }

  /**
   * Получение строки даты для имени файла
   */
  getDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  /**
   * Ротация логов (удаление старых)
   */
  rotateLogs(daysToKeep = 7) {
    try {
      const files = fs.readdirSync(this.logsPath);
      const now = Date.now();
      const maxAge = daysToKeep * 24 * 60 * 60 * 1000;

      files.forEach(file => {
        if (file.startsWith('monster_') && file.endsWith('.log')) {
          const filePath = path.join(this.logsPath, file);
          const stats = fs.statSync(filePath);
          const age = now - stats.mtimeMs;

          if (age > maxAge) {
            fs.unlinkSync(filePath);
            this.info('LOGGER', `Deleted old log file: ${file}`);
          }
        }
      });
    } catch (error) {
      this.error('LOGGER', 'Error rotating logs', { error: error.message });
    }
  }

  /**
   * Получение последних логов
   */
  getRecentLogs(limit = 100) {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }

      const lines = fs.readFileSync(this.logFile, 'utf8')
        .split('\n')
        .filter(Boolean)
        .slice(-limit);

      return lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
    } catch (error) {
      return [];
    }
  }
}

// Singleton instance
let loggerInstance = null;

function getLogger(config) {
  if (!loggerInstance) {
    loggerInstance = new Logger(config);
  }
  return loggerInstance;
}

module.exports = { Logger, getLogger };






