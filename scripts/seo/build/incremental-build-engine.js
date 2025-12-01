const fs = require('fs');
const path = require('path');
const { log } = require('../logger');
const crypto = require('crypto');

/**
 * SEO MONSTER 6.0: Incremental Build Engine
 * Обновляет только измененные/новые страницы
 */
class IncrementalBuildEngine {
  constructor(config) {
    this.config = config;
    this.checksumPath = path.join(process.cwd(), 'data/seo/incremental-checksums.json');
    this.checksums = this.loadChecksums();
  }

  /**
   * Загрузка checksums
   */
  loadChecksums() {
    if (fs.existsSync(this.checksumPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.checksumPath, 'utf8'));
      } catch (e) {
        log('INCREMENTAL-BUILD', `Error loading checksums: ${e.message}`);
      }
    }
    return {};
  }

  /**
   * Сохранение checksums
   */
  saveChecksums() {
    try {
      fs.writeFileSync(this.checksumPath, JSON.stringify(this.checksums, null, 2), 'utf8');
    } catch (e) {
      log('INCREMENTAL-BUILD', `Error saving checksums: ${e.message}`);
    }
  }

  /**
   * Вычисление checksum для страницы
   */
  calculateChecksum(page) {
    const data = JSON.stringify({
      vin: page.vin,
      stateSlug: page.stateSlug,
      make: page.make,
      model: page.model,
      year: page.year,
      intent: page.intent,
      layout: page.layout?.id,
      contentHash: this.hashContent(page.content || '')
    });
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * Hash контента
   */
  hashContent(content) {
    return crypto.createHash('md5').update(content || '').digest('hex');
  }

  /**
   * Проверка, нужно ли обновлять страницу
   */
  needsUpdate(page) {
    const url = page.url || `/vin/${page.vin}/${page.stateSlug}/`;
    const currentChecksum = this.calculateChecksum(page);
    const savedChecksum = this.checksums[url];

    // Новая страница или измененная
    if (!savedChecksum || savedChecksum !== currentChecksum) {
      return true;
    }

    // Проверяем, существует ли файл
    const filePath = path.join(process.cwd(), 'public', 'vin', page.vin, page.stateSlug, 'index.html');
    if (!fs.existsSync(filePath)) {
      return true;
    }

    return false;
  }

  /**
   * Фильтрация страниц для инкрементального билда
   */
  filterPagesForIncrementalBuild(pages) {
    const needsUpdate = [];
    const skip = [];

    for (const page of pages) {
      if (this.needsUpdate(page)) {
        needsUpdate.push(page);
      } else {
        skip.push(page);
      }
    }

    log('INCREMENTAL-BUILD', `Filtered: ${needsUpdate.length} need update, ${skip.length} skip`);
    return { needsUpdate, skip };
  }

  /**
   * Обновление checksum после генерации
   */
  updateChecksum(page) {
    const url = page.url || `/vin/${page.vin}/${page.stateSlug}/`;
    this.checksums[url] = this.calculateChecksum(page);
  }

  /**
   * Обновление checksums для батча
   */
  updateChecksumsBatch(pages) {
    for (const page of pages) {
      this.updateChecksum(page);
    }
    this.saveChecksums();
  }

  /**
   * Очистка старых checksums (для страниц, которых больше нет)
   */
  cleanupChecksums(existingUrls) {
    const urlsSet = new Set(existingUrls);
    let cleaned = 0;

    for (const url in this.checksums) {
      if (!urlsSet.has(url)) {
        delete this.checksums[url];
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.saveChecksums();
      log('INCREMENTAL-BUILD', `Cleaned ${cleaned} old checksums`);
    }
  }

  /**
   * Получение статистики
   */
  getStats() {
    return {
      totalChecksums: Object.keys(this.checksums).length,
      checksumPath: this.checksumPath
    };
  }
}

module.exports = { IncrementalBuildEngine };


