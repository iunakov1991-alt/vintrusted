const { log } = require('../logger');

class SitemapPrioritizer {
  constructor(config) {
    this.config = config;
  }

  prioritize(pages) {
    // Безопасная проверка на массив
    if (!pages || !Array.isArray(pages)) {
      log('SITEMAP-PRIORITIZER', 'No pages provided for prioritization');
      return [];
    }
    
    return pages.map(page => ({
      ...page,
      sitemapPriority: this.calculatePriority(page),
      changefreq: this.calculateChangeFreq(page)
    })).sort((a, b) => (b.sitemapPriority || 0) - (a.sitemapPriority || 0));
  }

  calculatePriority(page) {
    let priority = 0.5;
    if (page.qualityScore > 0.8) priority += 0.2;
    if (page.metrics?.traffic > 100) priority += 0.2;
    if (page.metrics?.isIndexed) priority += 0.1;
    return Math.min(1, priority);
  }

  calculateChangeFreq(page) {
    return 'weekly';
  }
}

module.exports = { SitemapPrioritizer };


