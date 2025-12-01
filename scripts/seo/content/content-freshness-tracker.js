const fs = require('fs');
const path = require('path');
const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Content Freshness Tracker
 * Отслеживание "свежести" контента и автоматическое обновление
 */
class ContentFreshnessTracker {
  constructor(config) {
    this.config = config;
    this.freshnessDataPath = path.join(process.cwd(), 'data/seo/content-freshness.json');
    this.freshnessData = this.loadFreshnessData();
    this.freshnessThreshold = 90; // Дней до обновления
  }

  /**
   * Загрузка данных о свежести
   */
  loadFreshnessData() {
    if (fs.existsSync(this.freshnessDataPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.freshnessDataPath, 'utf8'));
      } catch (e) {
        log('CONTENT-FRESHNESS', `Error loading freshness data: ${e.message}`);
      }
    }
    return {};
  }

  /**
   * Сохранение данных о свежести
   */
  saveFreshnessData() {
    try {
      fs.writeFileSync(this.freshnessDataPath, JSON.stringify(this.freshnessData, null, 2), 'utf8');
    } catch (e) {
      log('CONTENT-FRESHNESS', `Error saving freshness data: ${e.message}`);
    }
  }

  /**
   * Регистрация страницы
   */
  registerPage(page) {
    const url = page.url || `/vin/${page.vin}/${page.stateSlug}/`;
    const now = new Date().toISOString();

    if (!this.freshnessData[url]) {
      this.freshnessData[url] = {
        createdAt: now,
        lastUpdated: now,
        updateCount: 0,
        lastContentHash: this.hashContent(page)
      };
    } else {
      const contentHash = this.hashContent(page);
      if (this.freshnessData[url].lastContentHash !== contentHash) {
        this.freshnessData[url].lastUpdated = now;
        this.freshnessData[url].updateCount++;
        this.freshnessData[url].lastContentHash = contentHash;
      }
    }

    this.saveFreshnessData();
  }

  /**
   * Hash контента
   */
  hashContent(page) {
    const crypto = require('crypto');
    const content = (page.content || page.html || '').substring(0, 1000); // Первые 1000 символов
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Проверка, нужно ли обновление
   */
  needsUpdate(page) {
    const url = page.url || `/vin/${page.vin}/${page.stateSlug}/`;
    const data = this.freshnessData[url];

    if (!data) {
      return true; // Новая страница
    }

    const lastUpdated = new Date(data.lastUpdated);
    const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);

    // Обновляем если старше threshold дней
    if (daysSinceUpdate > this.freshnessThreshold) {
      return true;
    }

    // Обновляем если метрики падают
    if (page.metrics && page.metrics.trafficTrend === 'decreasing') {
      return true;
    }

    return false;
  }

  /**
   * Получение страниц, требующих обновления
   */
  getPagesNeedingUpdate(pages) {
    const needingUpdate = [];

    for (const page of pages) {
      if (this.needsUpdate(page)) {
        needingUpdate.push({
          page,
          reason: this.getUpdateReason(page),
          freshnessScore: this.calculateFreshnessScore(page)
        });
      }
    }

    // Сортируем по приоритету обновления
    needingUpdate.sort((a, b) => {
      // Сначала по freshness score (ниже = приоритетнее)
      if (a.freshnessScore !== b.freshnessScore) {
        return a.freshnessScore - b.freshnessScore;
      }
      // Затем по качеству (ниже = приоритетнее)
      return (a.page.qualityScore || 0) - (b.page.qualityScore || 0);
    });

    log('CONTENT-FRESHNESS', `Found ${needingUpdate.length} pages needing update`);
    return needingUpdate;
  }

  /**
   * Причина обновления
   */
  getUpdateReason(page) {
    const url = page.url || `/vin/${page.vin}/${page.stateSlug}/`;
    const data = this.freshnessData[url];

    if (!data) {
      return 'new-page';
    }

    const daysSinceUpdate = (Date.now() - new Date(data.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate > this.freshnessThreshold) {
      return 'stale-content';
    }

    if (page.metrics && page.metrics.trafficTrend === 'decreasing') {
      return 'declining-metrics';
    }

    return 'unknown';
  }

  /**
   * Вычисление freshness score
   */
  calculateFreshnessScore(page) {
    const url = page.url || `/vin/${page.vin}/${page.stateSlug}/`;
    const data = this.freshnessData[url];

    if (!data) {
      return 0; // Новая страница - высокий приоритет
    }

    const daysSinceUpdate = (Date.now() - new Date(data.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
    const freshnessScore = daysSinceUpdate / this.freshnessThreshold; // 0-1+, где 1+ = очень старый

    // Добавляем penalty за падающие метрики
    let penalty = 0;
    if (page.metrics && page.metrics.trafficTrend === 'decreasing') {
      penalty = 0.5;
    }

    return freshnessScore + penalty;
  }

  /**
   * Получение статистики
   */
  getStats() {
    const urls = Object.keys(this.freshnessData);
    const now = Date.now();
    let staleCount = 0;
    let avgAge = 0;

    for (const url of urls) {
      const data = this.freshnessData[url];
      const age = (now - new Date(data.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
      avgAge += age;
      if (age > this.freshnessThreshold) {
        staleCount++;
      }
    }

    avgAge = urls.length > 0 ? avgAge / urls.length : 0;

    return {
      totalPages: urls.length,
      stalePages: staleCount,
      avgAge: avgAge.toFixed(1),
      threshold: this.freshnessThreshold
    };
  }
}

module.exports = { ContentFreshnessTracker };


