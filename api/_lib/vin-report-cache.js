const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Простой logger для API модулей
const log = (tag, msg) => console.log(`[${tag}] ${new Date().toISOString()} - ${msg}`);

/**
 * SEO MONSTER 6.0: VIN Report Cache System
 * Сохранение и кэширование VIN отчетов
 * ТРИЗ: Максимальное использование ресурсов - один отчет используется многократно
 */
class VINReportCache {
  constructor() {
    this.cacheDir = path.join(process.cwd(), 'data/vin-reports');
    this.ensureCacheDir();
  }

  ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Нормализация VIN
   */
  normalizeVIN(vin) {
    return (vin || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  /**
   * Получение пути к файлу отчета
   */
  getReportPath(vin) {
    const normalized = this.normalizeVIN(vin);
    return path.join(this.cacheDir, `${normalized}.json`);
  }

  /**
   * Сохранение отчета в компактном формате
   * ТРИЗ: Минимальный шаг - максимальный эффект - компактное хранение
   */
  async saveReport(vin, reportData, source = 'api') {
    const normalized = this.normalizeVIN(vin);
    if (!normalized || normalized.length !== 17) {
      throw new Error('Invalid VIN');
    }

    const reportPath = this.getReportPath(normalized);
    
    // Компактное представление отчета
    const compactReport = {
      vin: normalized,
      source,
      savedAt: new Date().toISOString(),
      // Сохраняем только ключевые данные
      data: this.compressReport(reportData),
      hash: this.calculateHash(reportData)
    };

    try {
      fs.writeFileSync(reportPath, JSON.stringify(compactReport, null, 2), 'utf8');
      log('VIN-CACHE', `Report saved for VIN: ${normalized}`);
      return reportPath;
    } catch (e) {
      log('VIN-CACHE', `Error saving report: ${e.message}`);
      throw e;
    }
  }

  /**
   * Сжатие отчета (удаление избыточных данных)
   * ТРИЗ: Устранение операционной бессмысленности
   */
  compressReport(reportData) {
    if (typeof reportData === 'string') {
      // Если это HTML, извлекаем ключевые данные
      return {
        type: 'html',
        length: reportData.length,
        preview: reportData.substring(0, 500),
        // Сохраняем полный HTML в отдельном поле для развертывания
        fullHtml: reportData
      };
    }

    // Если это объект, сохраняем структурированно
    return {
      type: 'structured',
      vin: reportData.vin,
      attributes: reportData.attributes || {},
      sections: reportData.sections || {},
      source: reportData.source
    };
  }

  /**
   * Вычисление hash для проверки изменений
   */
  calculateHash(data) {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('md5').update(str).digest('hex');
  }

  /**
   * Получение сохраненного отчета
   */
  getReport(vin) {
    const normalized = this.normalizeVIN(vin);
    const reportPath = this.getReportPath(normalized);

    if (!fs.existsSync(reportPath)) {
      return null;
    }

    try {
      const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      
      // Разворачиваем компактный отчет
      if (data.data.type === 'html' && data.data.fullHtml) {
        return {
          vin: data.vin,
          report: data.data.fullHtml,
          source: data.source,
          savedAt: data.savedAt,
          cached: true
        };
      }

      return {
        vin: data.vin,
        report: data.data,
        source: data.source,
        savedAt: data.savedAt,
        cached: true
      };
    } catch (e) {
      log('VIN-CACHE', `Error reading report: ${e.message}`);
      return null;
    }
  }

  /**
   * Проверка наличия отчета
   */
  hasReport(vin) {
    const normalized = this.normalizeVIN(vin);
    const reportPath = this.getReportPath(normalized);
    return fs.existsSync(reportPath);
  }

  /**
   * Получение статистики кэша
   */
  getStats() {
    if (!fs.existsSync(this.cacheDir)) {
      return { total: 0, size: 0 };
    }

    const files = fs.readdirSync(this.cacheDir).filter(f => f.endsWith('.json'));
    let totalSize = 0;

    for (const file of files) {
      const filePath = path.join(this.cacheDir, file);
      try {
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      } catch (e) {
        // Ignore errors
      }
    }

    return {
      total: files.length,
      size: totalSize,
      sizeMB: (totalSize / 1024 / 1024).toFixed(2)
    };
  }
}

module.exports = { VINReportCache };

