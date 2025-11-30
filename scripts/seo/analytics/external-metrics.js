const fs = require('fs');
const path = require('path');
const { log, error } = require('../logger');

/**
 * SEO MONSTER 6.0: External Metrics Integration
 * Интеграция с аналитикой для учета bounce rate, time on page и других метрик
 */
class ExternalMetrics {
  constructor(config) {
    this.config = config;
    this.metricsPath = path.join(process.cwd(), 'data/seo/external-metrics.json');
    this.metricsCache = new Map();
    this.loadCache();
  }

  loadCache() {
    if (fs.existsSync(this.metricsPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.metricsPath, 'utf8'));
        if (data.metrics) {
          for (const [url, metrics] of Object.entries(data.metrics)) {
            this.metricsCache.set(url, metrics);
          }
          log('METRICS', `Loaded ${this.metricsCache.size} external metrics`);
        }
      } catch (e) {
        error('METRICS', `Cache load error: ${e.message}`);
      }
    }
  }

  saveCache() {
    try {
      const dir = path.dirname(this.metricsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        lastUpdated: new Date().toISOString(),
        metrics: Object.fromEntries(this.metricsCache)
      };

      fs.writeFileSync(this.metricsPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      error('METRICS', `Cache save error: ${e.message}`);
    }
  }

  /**
   * Нормализация URL
   */
  normalizeURL(url) {
    let normalized = url.replace(/^https?:\/\/[^\/]+/, '');
    normalized = normalized.split('?')[0];
    if (!normalized.endsWith('/') && !normalized.includes('.')) {
      normalized += '/';
    }
    return normalized;
  }

  /**
   * Импорт метрик из Google Analytics (CSV формат)
   */
  importFromAnalyticsCSV(csvPath) {
    if (!fs.existsSync(csvPath)) {
      error('METRICS', `CSV file not found: ${csvPath}`);
      return false;
    }

    try {
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const lines = csvContent.split('\n').filter(Boolean);
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

      const urlIndex = headers.findIndex(h => h.includes('url') || h.includes('page'));
      const bounceRateIndex = headers.findIndex(h => h.includes('bounce') || h.includes('bounce rate'));
      const timeOnPageIndex = headers.findIndex(h => h.includes('time') || h.includes('avg') || h.includes('duration'));
      const sessionsIndex = headers.findIndex(h => h.includes('session') || h.includes('visit'));
      const pageviewsIndex = headers.findIndex(h => h.includes('pageview') || h.includes('view'));

      if (urlIndex === -1) {
        error('METRICS', 'URL column not found in CSV');
        return false;
      }

      let importedCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        if (values.length <= urlIndex) continue;

        const url = values[urlIndex].trim();
        if (!url || !url.includes('/vin/')) continue;

        const normalized = this.normalizeURL(url);

        const metrics = {
          bounceRate: bounceRateIndex >= 0 ? parseFloat(values[bounceRateIndex] || 0) : null,
          timeOnPage: timeOnPageIndex >= 0 ? parseFloat(values[timeOnPageIndex] || 0) : null,
          sessions: sessionsIndex >= 0 ? parseFloat(values[sessionsIndex] || 0) : null,
          pageviews: pageviewsIndex >= 0 ? parseFloat(values[pageviewsIndex] || 0) : null,
          lastUpdated: new Date().toISOString()
        };

        // Обновляем существующие метрики или создаем новые
        const existing = this.metricsCache.get(normalized) || {};
        this.metricsCache.set(normalized, {
          ...existing,
          ...metrics
        });

        importedCount++;
      }

      this.saveCache();
      log('METRICS', `Imported ${importedCount} URLs from analytics CSV`);

      return true;
    } catch (e) {
      error('METRICS', `CSV import error: ${e.message}`, e);
      return false;
    }
  }

  /**
   * Парсинг CSV строки
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
   * Импорт метрик из JSON
   */
  importFromJSON(jsonPath) {
    if (!fs.existsSync(jsonPath)) {
      error('METRICS', `JSON file not found: ${jsonPath}`);
      return false;
    }

    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const rows = Array.isArray(data) ? data : (data.rows || data.data || []);

      let importedCount = 0;

      for (const row of rows) {
        const url = row.url || row.page || row.pagePath;
        if (!url || !url.includes('/vin/')) continue;

        const normalized = this.normalizeURL(url);

        const metrics = {
          bounceRate: row.bounceRate || row.bounce_rate || null,
          timeOnPage: row.timeOnPage || row.avg_time_on_page || row.time_on_page || null,
          sessions: row.sessions || row.visits || null,
          pageviews: row.pageviews || row.views || null,
          lastUpdated: new Date().toISOString()
        };

        const existing = this.metricsCache.get(normalized) || {};
        this.metricsCache.set(normalized, {
          ...existing,
          ...metrics
        });

        importedCount++;
      }

      this.saveCache();
      log('METRICS', `Imported ${importedCount} URLs from analytics JSON`);

      return true;
    } catch (e) {
      error('METRICS', `JSON import error: ${e.message}`, e);
      return false;
    }
  }

  /**
   * Получение метрик для URL
   */
  getMetricsForURL(url) {
    const normalized = this.normalizeURL(url);
    return this.metricsCache.get(normalized) || {
      bounceRate: null,
      timeOnPage: null,
      sessions: null,
      pageviews: null
    };
  }

  /**
   * Получение метрик для страницы
   */
  getMetricsForPage(page) {
    return this.getMetricsForURL(page.url);
  }

  /**
   * Обогащение страниц внешними метриками
   */
  enrichPagesWithMetrics(pages) {
    let enrichedCount = 0;

    for (const page of pages) {
      const metrics = this.getMetricsForPage(page);
      
      if (metrics.bounceRate !== null || metrics.timeOnPage !== null) {
        page.externalMetrics = metrics;
        page.bounceRate = metrics.bounceRate;
        page.timeOnPage = metrics.timeOnPage;
        page.sessions = metrics.sessions;
        page.pageviews = metrics.pageviews;
        enrichedCount++;
      }
    }

    log('METRICS', `Enriched ${enrichedCount} pages with external metrics`);
    return pages;
  }

  /**
   * Расчет score на основе внешних метрик
   */
  calculateMetricsScore(metrics) {
    if (!metrics || (metrics.bounceRate === null && metrics.timeOnPage === null)) {
      return null;
    }

    let score = 0.5; // Базовый score

    // Bounce rate: чем ниже, тем лучше (инвертируем)
    if (metrics.bounceRate !== null) {
      const bounceScore = 1 - (metrics.bounceRate / 100);
      score += bounceScore * 0.3;
    }

    // Time on page: чем больше, тем лучше
    if (metrics.timeOnPage !== null) {
      const timeScore = Math.min(metrics.timeOnPage / 300, 1); // 5 минут = максимум
      score += timeScore * 0.2;
    }

    // Нормализация к 0-1
    return Math.min(1, Math.max(0, score));
  }

  /**
   * Получение статистики
   */
  getStatistics() {
    const urls = Array.from(this.metricsCache.keys());
    if (urls.length === 0) {
      return {
        totalUrls: 0,
        urlsWithBounceRate: 0,
        urlsWithTimeOnPage: 0,
        avgBounceRate: 0,
        avgTimeOnPage: 0
      };
    }

    let totalBounceRate = 0;
    let totalTimeOnPage = 0;
    let urlsWithBounceRate = 0;
    let urlsWithTimeOnPage = 0;

    for (const url of urls) {
      const metrics = this.metricsCache.get(url);
      if (metrics.bounceRate !== null) {
        totalBounceRate += metrics.bounceRate;
        urlsWithBounceRate++;
      }
      if (metrics.timeOnPage !== null) {
        totalTimeOnPage += metrics.timeOnPage;
        urlsWithTimeOnPage++;
      }
    }

    return {
      totalUrls: urls.length,
      urlsWithBounceRate,
      urlsWithTimeOnPage,
      avgBounceRate: urlsWithBounceRate > 0 ? totalBounceRate / urlsWithBounceRate : 0,
      avgTimeOnPage: urlsWithTimeOnPage > 0 ? totalTimeOnPage / urlsWithTimeOnPage : 0
    };
  }
}

module.exports = { ExternalMetrics };

