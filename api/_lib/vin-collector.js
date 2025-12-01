const fs = require('fs');
const path = require('path');

// Простой logger для API модулей
const log = (tag, msg) => console.log(`[${tag}] ${new Date().toISOString()} - ${msg}`);

/**
 * SEO MONSTER 6.0: VIN Collector
 * Сбор VIN кодов для обучения AI
 * ТРИЗ: Максимальное использование ресурсов - каждый VIN становится источником обучения
 */
class VINCollector {
  constructor() {
    this.collectedVinsPath = path.join(process.cwd(), 'data/vin-collection');
    this.paidVinsPath = path.join(this.collectedVinsPath, 'paid-vins.jsonl');
    this.unpaidVinsPath = path.join(this.collectedVinsPath, 'unpaid-vins.jsonl');
    this.ensureDir();
  }

  ensureDir() {
    if (!fs.existsSync(this.collectedVinsPath)) {
      fs.mkdirSync(this.collectedVinsPath, { recursive: true });
    }
  }

  /**
   * Нормализация VIN
   */
  normalizeVIN(vin) {
    return (vin || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  /**
   * Сохранение оплаченного VIN (VIN введен + отчет оплачен)
   * ТРИЗ: Перехват события - два события совпали
   */
  async savePaidVIN(vin, metadata = {}) {
    const normalized = this.normalizeVIN(vin);
    if (!normalized || normalized.length !== 17) {
      return false;
    }

    const entry = {
      vin: normalized,
      paidAt: new Date().toISOString(),
      ...metadata
    };

    try {
      fs.appendFileSync(this.paidVinsPath, JSON.stringify(entry) + '\n', 'utf8');
      log('VIN-COLLECTOR', `Paid VIN saved: ${normalized}`);
      return true;
    } catch (e) {
      log('VIN-COLLECTOR', `Error saving paid VIN: ${e.message}`);
      return false;
    }
  }

  /**
   * Сохранение неоплаченного VIN (VIN введен, но не дошел до оплаты)
   * ТРИЗ: Использование всех ресурсов - даже неоплаченные VIN полезны
   */
  async saveUnpaidVIN(vin, metadata = {}) {
    const normalized = this.normalizeVIN(vin);
    if (!normalized || normalized.length !== 17) {
      return false;
    }

    // Проверяем, не был ли этот VIN уже оплачен
    if (this.isPaid(normalized)) {
      return false; // Не сохраняем, если уже оплачен
    }

    const entry = {
      vin: normalized,
      viewedAt: new Date().toISOString(),
      ...metadata
    };

    try {
      fs.appendFileSync(this.unpaidVinsPath, JSON.stringify(entry) + '\n', 'utf8');
      log('VIN-COLLECTOR', `Unpaid VIN saved: ${normalized}`);
      return true;
    } catch (e) {
      log('VIN-COLLECTOR', `Error saving unpaid VIN: ${e.message}`);
      return false;
    }
  }

  /**
   * Проверка, был ли VIN оплачен
   */
  isPaid(vin) {
    const normalized = this.normalizeVIN(vin);
    if (!fs.existsSync(this.paidVinsPath)) {
      return false;
    }

    try {
      const content = fs.readFileSync(this.paidVinsPath, 'utf8');
      return content.includes(`"vin":"${normalized}"`);
    } catch (e) {
      return false;
    }
  }

  /**
   * Получение всех оплаченных VIN
   */
  getPaidVINs() {
    if (!fs.existsSync(this.paidVinsPath)) {
      return [];
    }

    try {
      const lines = fs.readFileSync(this.paidVinsPath, 'utf8')
        .split('\n')
        .filter(Boolean);
      
      return lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
    } catch (e) {
      log('VIN-COLLECTOR', `Error reading paid VINs: ${e.message}`);
      return [];
    }
  }

  /**
   * Получение всех неоплаченных VIN
   */
  getUnpaidVINs() {
    if (!fs.existsSync(this.unpaidVinsPath)) {
      return [];
    }

    try {
      const lines = fs.readFileSync(this.unpaidVinsPath, 'utf8')
        .split('\n')
        .filter(Boolean);
      
      return lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
    } catch (e) {
      log('VIN-COLLECTOR', `Error reading unpaid VINs: ${e.message}`);
      return [];
    }
  }

  /**
   * Получение статистики
   */
  getStats() {
    return {
      paid: this.getPaidVINs().length,
      unpaid: this.getUnpaidVINs().length,
      total: this.getPaidVINs().length + this.getUnpaidVINs().length
    };
  }
}

module.exports = { VINCollector };

