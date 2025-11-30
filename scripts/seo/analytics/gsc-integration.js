const fs = require('fs');
const path = require('path');
const { log, error } = require('../logger');

/**
 * SEO MONSTER 6.0: Google Search Console Integration
 * Импорт данных из GSC для улучшения самообучения
 */
class GSCIntegration {
  constructor(config) {
    this.config = config;
    this.gscDataPath = path.join(process.cwd(), 'data/seo/gsc-data.json');
    this.gscCachePath = path.join(process.cwd(), 'data/seo/gsc-cache.json');
    this.loadCache();
  }

  loadCache() {
    this.cache = {};
    if (fs.existsSync(this.gscCachePath)) {
      try {
        this.cache = JSON.parse(fs.readFileSync(this.gscCachePath, 'utf8'));
        log('GSC', `Cache loaded: ${Object.keys(this.cache).length} URLs`);
      } catch (e) {
        log('GSC', `Cache load error: ${e.message}`);
      }
    }
  }

  saveCache() {
    try {
      const dir = path.dirname(this.gscCachePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.gscCachePath, JSON.stringify(this.cache, null, 2), 'utf8');
    } catch (e) {
      error('GSC', `Cache save error: ${e.message}`);
    }
  }

  /**
   * Импорт данных из CSV файла (экспортированного из GSC)
   * Формат: URL, Clicks, Impressions, CTR, Position
   */
  importFromCSV(csvPath) {
    if (!fs.existsSync(csvPath)) {
      error('GSC', `CSV file not found: ${csvPath}`);
      return false;
    }

    try {
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const lines = csvContent.split('\n').filter(Boolean);
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      const urlIndex = headers.findIndex(h => h.includes('url') || h.includes('page'));
      const clicksIndex = headers.findIndex(h => h.includes('click'));
      const impressionsIndex = headers.findIndex(h => h.includes('impression'));
      const ctrIndex = headers.findIndex(h => h.includes('ctr'));
      const positionIndex = headers.findIndex(h => h.includes('position') || h.includes('avg'));

      if (urlIndex === -1) {
        error('GSC', 'URL column not found in CSV');
        return false;
      }

      const imported = {};
      let importedCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        if (values.length <= urlIndex) continue;

        const url = values[urlIndex].trim();
        if (!url || !url.includes('/vin/')) continue; // Только SEO страницы

        const clicks = clicksIndex >= 0 ? parseFloat(values[clicksIndex] || 0) : 0;
        const impressions = impressionsIndex >= 0 ? parseFloat(values[impressionsIndex] || 0) : 0;
        const ctr = ctrIndex >= 0 ? parseFloat(values[ctrIndex] || 0) : (impressions > 0 ? clicks / impressions : 0);
        const position = positionIndex >= 0 ? parseFloat(values[positionIndex] || 0) : 0;

        // Нормализация URL (убираем домен, добавляем trailing slash если нужно)
        const normalizedUrl = this.normalizeURL(url);

        imported[normalizedUrl] = {
          clicks,
          impressions,
          ctr: ctr * 100, // Конвертируем в проценты
          position,
          lastUpdated: new Date().toISOString()
        };

        this.cache[normalizedUrl] = imported[normalizedUrl];
        importedCount++;
      }

      this.saveCache();
      log('GSC', `Imported ${importedCount} URLs from CSV`);

      // Сохраняем также в основной файл данных
      const gscData = {
        lastImport: new Date().toISOString(),
        totalUrls: importedCount,
        data: imported
      };
      const dataDir = path.dirname(this.gscDataPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(this.gscDataPath, JSON.stringify(gscData, null, 2), 'utf8');

      return true;
    } catch (e) {
      error('GSC', `CSV import error: ${e.message}`, e);
      return false;
    }
  }

  /**
   * Парсинг CSV строки с учетом кавычек
   */
  parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    return values;
  }

  /**
   * Нормализация URL
   */
  normalizeURL(url) {
    // Убираем домен
    let normalized = url.replace(/^https?:\/\/[^\/]+/, '');
    
    // Убираем query параметры
    normalized = normalized.split('?')[0];
    
    // Добавляем trailing slash если нужно
    if (!normalized.endsWith('/') && !normalized.includes('.')) {
      normalized += '/';
    }

    return normalized;
  }

  /**
   * Получение метрик для URL
   */
  getMetricsForURL(url) {
    const normalized = this.normalizeURL(url);
    return this.cache[normalized] || {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0
    };
  }

  /**
   * Получение метрик для страницы
   */
  getMetricsForPage(page) {
    return this.getMetricsForURL(page.url);
  }

  /**
   * Обновление метрик страниц из GSC данных
   */
  enrichPagesWithGSCData(pages) {
    let enrichedCount = 0;
    
    for (const page of pages) {
      const metrics = this.getMetricsForPage(page);
      if (metrics.clicks > 0 || metrics.impressions > 0) {
        page.gscMetrics = metrics;
        page.traffic = metrics.clicks;
        page.ctr = metrics.ctr;
        page.position = metrics.position;
        enrichedCount++;
      }
    }

    log('GSC', `Enriched ${enrichedCount} pages with GSC data`);
    return pages;
  }

  /**
   * Импорт из JSON файла (альтернативный формат)
   */
  importFromJSON(jsonPath) {
    if (!fs.existsSync(jsonPath)) {
      error('GSC', `JSON file not found: ${jsonPath}`);
      return false;
    }

    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const imported = {};

      // Поддержка разных форматов JSON
      const rows = Array.isArray(data) ? data : (data.rows || data.data || []);

      for (const row of rows) {
        const url = row.url || row.page || row.keys?.[0];
        if (!url || !url.includes('/vin/')) continue;

        const normalized = this.normalizeURL(url);
        imported[normalized] = {
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          ctr: (row.ctr || 0) * 100,
          position: row.position || row.avgPosition || 0,
          lastUpdated: new Date().toISOString()
        };

        this.cache[normalized] = imported[normalized];
      }

      this.saveCache();
      log('GSC', `Imported ${Object.keys(imported).length} URLs from JSON`);

      return true;
    } catch (e) {
      error('GSC', `JSON import error: ${e.message}`, e);
      return false;
    }
  }

  /**
   * Получение статистики по всем данным
   */
  getStatistics() {
    const urls = Object.keys(this.cache);
    if (urls.length === 0) {
      return {
        totalUrls: 0,
        totalClicks: 0,
        totalImpressions: 0,
        avgCTR: 0,
        avgPosition: 0
      };
    }

    let totalClicks = 0;
    let totalImpressions = 0;
    let totalCTR = 0;
    let totalPosition = 0;
    let urlsWithData = 0;

    for (const url of urls) {
      const metrics = this.cache[url];
      if (metrics.impressions > 0) {
        totalClicks += metrics.clicks || 0;
        totalImpressions += metrics.impressions || 0;
        totalCTR += metrics.ctr || 0;
        totalPosition += metrics.position || 0;
        urlsWithData++;
      }
    }

    return {
      totalUrls: urls.length,
      urlsWithData,
      totalClicks,
      totalImpressions,
      avgCTR: urlsWithData > 0 ? totalCTR / urlsWithData : 0,
      avgPosition: urlsWithData > 0 ? totalPosition / urlsWithData : 0
    };
  }
}

module.exports = { GSCIntegration };

