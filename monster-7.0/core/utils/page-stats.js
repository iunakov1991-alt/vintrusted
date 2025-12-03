/**
 * PAGE STATISTICS TRACKER
 * 
 * Отслеживает статистику сгенерированных страниц:
 * - Количество сгенерированных страниц
 * - Количество опубликованных страниц (доступных по ссылкам)
 * - Средний показатель качества страниц
 * - Статистика по индексации (для будущей интеграции с Google Search Console)
 */

const fs = require('fs');
const path = require('path');

class PageStats {
  constructor() {
    this.statsPath = path.join(process.cwd(), 'data/stats/page-stats.json');
    this.pagesPath = path.join(process.cwd(), 'public/seo-pages');
    this.ensureStatsFile();
  }

  ensureStatsFile() {
    const dir = path.dirname(this.statsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (!fs.existsSync(this.statsPath)) {
      this.saveStats({
        totalGenerated: 0,
        totalPublished: 0,
        averageQuality: 0,
        qualityDistribution: {
          excellent: 0, // >= 0.9
          good: 0,      // 0.7-0.89
          average: 0,  // 0.5-0.69
          poor: 0      // < 0.5
        },
        indexedByGoogle: 0, // Для будущей интеграции
        lastUpdated: new Date().toISOString(),
        pages: []
      });
    }
  }

  /**
   * Получение текущей статистики
   */
  getStats() {
    try {
      const data = fs.readFileSync(this.statsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return this.getDefaultStats();
    }
  }

  getDefaultStats() {
    return {
      totalGenerated: 0,
      totalPublished: 0,
      averageQuality: 0,
      qualityDistribution: {
        excellent: 0,
        good: 0,
        average: 0,
        poor: 0
      },
      indexedByGoogle: 0,
      lastUpdated: new Date().toISOString(),
      pages: []
    };
  }

  /**
   * Сохранение статистики
   */
  saveStats(stats) {
    try {
      fs.writeFileSync(this.statsPath, JSON.stringify(stats, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving page stats:', error);
    }
  }

  /**
   * Подсчет реального количества опубликованных страниц
   */
  countPublishedPages() {
    if (!fs.existsSync(this.pagesPath)) {
      return 0;
    }

    try {
      const dirs = fs.readdirSync(this.pagesPath, { withFileTypes: true });
      let count = 0;
      
      for (const dir of dirs) {
        if (dir.isDirectory()) {
          const indexPath = path.join(this.pagesPath, dir.name, 'index.html');
          if (fs.existsSync(indexPath)) {
            count++;
          }
        }
      }
      
      return count;
    } catch (error) {
      console.error('Error counting published pages:', error);
      return 0;
    }
  }

  /**
   * Расчет статистики качества страниц
   */
  calculateQualityStats() {
    const stats = this.getStats();
    const pages = stats.pages || [];
    
    if (pages.length === 0) {
      return {
        averageQuality: 0,
        qualityDistribution: {
          excellent: 0,
          good: 0,
          average: 0,
          poor: 0
        }
      };
    }

    let totalQuality = 0;
    const distribution = {
      excellent: 0,
      good: 0,
      average: 0,
      poor: 0
    };

    for (const page of pages) {
      const quality = page.qualityScore || 0;
      totalQuality += quality;

      if (quality >= 0.9) {
        distribution.excellent++;
      } else if (quality >= 0.7) {
        distribution.good++;
      } else if (quality >= 0.5) {
        distribution.average++;
      } else {
        distribution.poor++;
      }
    }

    return {
      averageQuality: totalQuality / pages.length,
      qualityDistribution: distribution
    };
  }

  /**
   * Обновление статистики после генерации страниц
   */
  updateStats(pages = []) {
    const stats = this.getStats();
    
    // Добавляем новые страницы
    for (const page of pages) {
      const existingIndex = stats.pages.findIndex(p => p.path === page.path);
      if (existingIndex >= 0) {
        // Обновляем существующую страницу
        stats.pages[existingIndex] = {
          path: page.path,
          qualityScore: page.qualityScore || 0,
          generatedAt: page.timestamp || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      } else {
        // Добавляем новую страницу
        stats.pages.push({
          path: page.path,
          qualityScore: page.qualityScore || 0,
          generatedAt: page.timestamp || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    // Обновляем общую статистику
    stats.totalGenerated = stats.pages.length;
    stats.totalPublished = this.countPublishedPages();
    
    const qualityStats = this.calculateQualityStats();
    stats.averageQuality = qualityStats.averageQuality;
    stats.qualityDistribution = qualityStats.qualityDistribution;
    
    stats.lastUpdated = new Date().toISOString();

    this.saveStats(stats);
    return stats;
  }

  /**
   * Получение полной статистики для дашборда
   */
  getDashboardStats() {
    const stats = this.getStats();
    const published = this.countPublishedPages();
    
    return {
      totalGenerated: stats.totalGenerated,
      totalPublished: published,
      averageQuality: Math.round(stats.averageQuality * 100) / 100,
      qualityPercentage: Math.round(stats.averageQuality * 100),
      qualityDistribution: stats.qualityDistribution,
      indexedByGoogle: stats.indexedByGoogle || 0, // Для будущей интеграции
      lastUpdated: stats.lastUpdated
    };
  }

  /**
   * Обновление статистики индексации (для будущей интеграции с Google Search Console)
   */
  updateIndexedCount(count) {
    const stats = this.getStats();
    stats.indexedByGoogle = count;
    stats.lastUpdated = new Date().toISOString();
    this.saveStats(stats);
  }
}

module.exports = PageStats;

