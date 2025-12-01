const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Internal Link Optimizer
 * AI оптимизирует внутренние ссылки на основе PageRank и метрик
 */
class InternalLinkOptimizer {
  constructor(config) {
    this.config = config;
    this.pageRank = new Map(); // URL -> PageRank value
    this.linkGraph = new Map(); // URL -> [outgoing links]
    this.metrics = new Map(); // URL -> metrics
  }

  /**
   * Вычисление PageRank
   */
  calculatePageRank(pages, iterations = 10) {
    const urls = pages.map(p => p.url);
    const dampingFactor = 0.85;

    // Инициализация
    for (const url of urls) {
      this.pageRank.set(url, 1.0 / urls.length);
      this.linkGraph.set(url, []);
    }

    // Построение графа ссылок
    for (const page of pages) {
      const links = page.internalLinks || [];
      this.linkGraph.set(page.url, links.map(l => l.url));
    }

    // Итерации PageRank
    for (let i = 0; i < iterations; i++) {
      const newPageRank = new Map();

      for (const url of urls) {
        let rank = (1 - dampingFactor) / urls.length;

        // Суммируем входящие ссылки
        for (const [sourceUrl, outgoingLinks] of this.linkGraph.entries()) {
          if (outgoingLinks.includes(url) && outgoingLinks.length > 0) {
            rank += dampingFactor * (this.pageRank.get(sourceUrl) || 0) / outgoingLinks.length;
          }
        }

        newPageRank.set(url, rank);
      }

      this.pageRank = newPageRank;
    }

    log('INTERNAL-LINK-OPT', `PageRank calculated for ${urls.length} pages`);
  }

  /**
   * Оптимизация внутренних ссылок для страницы
   */
  optimizeLinks(page, allPages) {
    const currentLinks = page.internalLinks || [];
    const optimizedLinks = [];

    // Сортируем страницы по PageRank и метрикам
    const candidatePages = allPages
      .filter(p => p.url !== page.url)
      .map(p => ({
        page: p,
        score: this.calculateLinkScore(p, page)
      }))
      .sort((a, b) => b.score - a.score);

    // Выбираем лучшие ссылки
    const maxLinks = Math.min(10, candidatePages.length); // Максимум 10 ссылок
    const selected = candidatePages.slice(0, maxLinks);

    for (const candidate of selected) {
      optimizedLinks.push({
        url: candidate.page.url,
        anchor: this.generateAnchor(candidate.page, page),
        score: candidate.score,
        reason: this.getLinkReason(candidate.page, page)
      });
    }

    // Сохраняем информацию о ссылках
    this.linkGraph.set(page.url, optimizedLinks.map(l => l.url));

    log('INTERNAL-LINK-OPT', `Optimized ${optimizedLinks.length} links for ${page.url}`);
    return optimizedLinks;
  }

  /**
   * Вычисление score для ссылки
   */
  calculateLinkScore(targetPage, sourcePage) {
    let score = 0;

    // PageRank (40%)
    const pageRank = this.pageRank.get(targetPage.url) || 0;
    score += pageRank * 0.4;

    // Quality (20%)
    score += (targetPage.qualityScore || 0) * 0.2;

    // Traffic (20%)
    const metrics = this.metrics.get(targetPage.url) || {};
    const traffic = metrics.traffic || 0;
    score += Math.min(traffic / 1000, 1) * 0.2; // 1000+ трафика = 1.0

    // Relevance (20%)
    const relevance = this.calculateRelevance(targetPage, sourcePage);
    score += relevance * 0.2;

    return score;
  }

  /**
   * Вычисление релевантности
   */
  calculateRelevance(targetPage, sourcePage) {
    let relevance = 0;
    let factors = 0;

    // Одинаковый VIN
    if (targetPage.vin === sourcePage.vin) {
      relevance += 0.4;
      factors++;
    }

    // Одинаковый make
    if (targetPage.make === sourcePage.make) {
      relevance += 0.2;
      factors++;
    }

    // Одинаковый model
    if (targetPage.model === sourcePage.model) {
      relevance += 0.2;
      factors++;
    }

    // Одинаковый year
    if (targetPage.year === sourcePage.year) {
      relevance += 0.1;
      factors++;
    }

    // Одинаковый state
    if (targetPage.stateSlug === sourcePage.stateSlug) {
      relevance += 0.1;
      factors++;
    }

    return factors > 0 ? relevance : 0.1; // Минимальная релевантность
  }

  /**
   * Генерация anchor text
   */
  generateAnchor(targetPage, sourcePage) {
    // Генерируем релевантный anchor text
    const parts = [];

    if (targetPage.make) parts.push(targetPage.make);
    if (targetPage.model) parts.push(targetPage.model);
    if (targetPage.year) parts.push(targetPage.year);
    if (targetPage.stateSlug) parts.push(targetPage.stateSlug);

    if (parts.length > 0) {
      return parts.join(' ') + ' VIN Check';
    }

    return 'VIN Check';
  }

  /**
   * Причина добавления ссылки
   */
  getLinkReason(targetPage, sourcePage) {
    if (targetPage.vin === sourcePage.vin) {
      return 'same-vin';
    }
    if (targetPage.make === sourcePage.make && targetPage.model === sourcePage.model) {
      return 'same-vehicle';
    }
    if (targetPage.stateSlug === sourcePage.stateSlug) {
      return 'same-state';
    }
    return 'related-content';
  }

  /**
   * Обновление метрик для URL
   */
  updateMetrics(url, metrics) {
    this.metrics.set(url, {
      ...this.metrics.get(url),
      ...metrics,
      lastUpdated: new Date().toISOString()
    });
  }

  /**
   * Получение топ страниц по PageRank
   */
  getTopPagesByPageRank(limit = 10) {
    const entries = Array.from(this.pageRank.entries())
      .map(([url, rank]) => ({ url, rank }))
      .sort((a, b) => b.rank - a.rank)
      .slice(0, limit);

    return entries;
  }

  /**
   * Получение статистики
   */
  getStats() {
    const ranks = Array.from(this.pageRank.values());
    const avgRank = ranks.length > 0 
      ? ranks.reduce((sum, r) => sum + r, 0) / ranks.length 
      : 0;

    return {
      totalPages: this.pageRank.size,
      avgPageRank: avgRank.toFixed(4),
      topPages: this.getTopPagesByPageRank(5)
    };
  }
}

module.exports = { InternalLinkOptimizer };


