const fs = require('fs');
const path = require('path');
const { log } = require('../logger');
const { ConversionPredictor } = require('./conversion-predictor');

/**
 * SEO MONSTER 6.0: Conversion Tracker
 * Отслеживание конверсий и интеграция с аналитикой
 */
class ConversionTracker {
  constructor(config) {
    this.config = config;
    this.conversionPredictor = new ConversionPredictor(config);
    this.conversionsPath = path.join(process.cwd(), 'data/seo/conversions.json');
    this.loadConversions();
  }

  loadConversions() {
    try {
      if (fs.existsSync(this.conversionsPath)) {
        this.conversions = JSON.parse(fs.readFileSync(this.conversionsPath, 'utf8'));
      } else {
        this.conversions = {
          pages: {},
          totals: {
            conversions: 0,
            revenue: 0,
            sessions: 0
          },
          lastUpdated: null
        };
      }
    } catch (e) {
      this.conversions = {
        pages: {},
        totals: {
          conversions: 0,
          revenue: 0,
          sessions: 0
        },
        lastUpdated: null
      };
    }
  }

  saveConversions() {
    try {
      const dir = path.dirname(this.conversionsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.conversions.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.conversionsPath, JSON.stringify(this.conversions, null, 2), 'utf8');
    } catch (e) {
      log('CONVERSION', 'Failed to save conversions', e);
    }
  }

  /**
   * Регистрация конверсии
   */
  recordConversion(url, conversionData) {
    if (!this.conversions.pages[url]) {
      this.conversions.pages[url] = {
        url,
        conversions: 0,
        revenue: 0,
        sessions: 0,
        conversionRate: 0,
        firstConversion: new Date().toISOString(),
        lastConversion: null
      };
    }

    const page = this.conversions.pages[url];
    page.conversions += conversionData.count || 1;
    page.revenue += conversionData.revenue || 0;
    page.sessions += conversionData.sessions || 1;
    page.conversionRate = page.conversions / page.sessions;
    page.lastConversion = new Date().toISOString();

    this.conversions.totals.conversions += conversionData.count || 1;
    this.conversions.totals.revenue += conversionData.revenue || 0;
    this.conversions.totals.sessions += conversionData.sessions || 1;

    this.saveConversions();
    
    log('CONVERSION', `Conversion recorded: ${url}, rate: ${(page.conversionRate * 100).toFixed(2)}%`);
    
    return page;
  }

  /**
   * Получение данных о конверсиях для страницы
   */
  getPageConversions(url) {
    return this.conversions.pages[url] || {
      url,
      conversions: 0,
      revenue: 0,
      sessions: 0,
      conversionRate: 0
    };
  }

  /**
   * Получение данных о конверсиях для всех страниц
   */
  getAllConversions() {
    return this.conversions;
  }

  /**
   * Интеграция с Google Analytics для получения конверсий
   */
  async syncWithGA(gaData = {}) {
    // gaData должен содержать:
    // {
    //   pages: [
    //     {
    //       url: '/vin/...',
    //       sessions: 100,
    //       conversions: 5,
    //       revenue: 150
    //     }
    //   ]
    // }

    if (!gaData.pages || !Array.isArray(gaData.pages)) {
      log('CONVERSION', 'Invalid GA data format');
      return;
    }

    let synced = 0;
    for (const pageData of gaData.pages) {
      if (pageData.url) {
        this.recordConversion(pageData.url, {
          count: pageData.conversions || 0,
          revenue: pageData.revenue || 0,
          sessions: pageData.sessions || 0
        });
        synced++;
      }
    }

    log('CONVERSION', `Synced ${synced} pages with GA conversion data`);
    
    // Переобучаем модель после синхронизации
    if (synced > 0) {
      this.conversionPredictor.trainModel();
    }
  }

  /**
   * Обогащение страниц данными о конверсиях
   */
  enrichPagesWithConversions(pages) {
    return pages.map(page => {
      const conversions = this.getPageConversions(page.url);
      return {
        ...page,
        conversions: {
          rate: conversions.conversionRate,
          count: conversions.conversions,
          revenue: conversions.revenue,
          sessions: conversions.sessions
        },
        predictedConversion: this.conversionPredictor.predictConversion(page, {
          traffic: conversions.sessions,
          bounceRate: page.externalMetrics?.bounceRate,
          timeOnPage: page.externalMetrics?.timeOnPage,
          ctr: page.gscMetrics?.ctr,
          position: page.gscMetrics?.position
        })
      };
    });
  }

  /**
   * Получение статистики конверсий
   */
  getStatistics() {
    const pages = Object.values(this.conversions.pages);
    const pagesWithConversions = pages.filter(p => p.conversions > 0);
    
    const avgConversionRate = pages.length > 0
      ? pages.reduce((sum, p) => sum + p.conversionRate, 0) / pages.length
      : 0;

    const avgRevenuePerPage = pagesWithConversions.length > 0
      ? pagesWithConversions.reduce((sum, p) => sum + p.revenue, 0) / pagesWithConversions.length
      : 0;

    return {
      totalPages: pages.length,
      pagesWithConversions: pagesWithConversions.length,
      totalConversions: this.conversions.totals.conversions,
      totalRevenue: this.conversions.totals.revenue,
      totalSessions: this.conversions.totals.sessions,
      avgConversionRate,
      avgRevenuePerPage,
      topConvertingPages: pages
        .sort((a, b) => b.conversionRate - a.conversionRate)
        .slice(0, 10)
        .map(p => ({
          url: p.url,
          conversionRate: p.conversionRate,
          conversions: p.conversions,
          revenue: p.revenue
        }))
    };
  }
}

module.exports = { ConversionTracker };

