const { log } = require('../logger');

// Проверка наличия jsdom
let JSDOM;
try {
  JSDOM = require('jsdom').JSDOM;
} catch (e) {
  log('SMART-CANONICAL', 'jsdom not available, canonical will use regex fallback');
}

/**
 * SEO MONSTER 6.0: Smart Canonical Engine
 * Умная система canonical URL на основе дублирования контента и метрик
 */
class SmartCanonicalEngine {
  constructor(config) {
    this.config = config;
    this.contentHashes = new Map(); // content hash -> canonical URL
    this.urlMetrics = new Map(); // URL -> metrics (traffic, quality, etc.)
  }

  /**
   * Вычисление hash контента
   */
  hashContent(content) {
    const crypto = require('crypto');
    const normalized = content.toLowerCase().replace(/\s+/g, ' ').trim();
    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  /**
   * Определение canonical URL для страницы
   */
  determineCanonical(page, allPages = []) {
    const contentHash = this.hashContent(page.html || page.content || '');
    
    // Проверяем, есть ли уже canonical для этого контента
    if (this.contentHashes.has(contentHash)) {
      const existingCanonical = this.contentHashes.get(contentHash);
      if (existingCanonical !== page.url) {
        log('SMART-CANONICAL', `Duplicate content found: ${page.url} -> ${existingCanonical}`);
        return existingCanonical;
      }
    }

    // Если нет дублирования, проверяем метрики для выбора лучшего URL
    const similarPages = this.findSimilarPages(page, allPages);
    if (similarPages.length > 0) {
      const bestPage = this.selectBestCanonical(similarPages);
      if (bestPage.url !== page.url) {
        log('SMART-CANONICAL', `Better canonical found: ${page.url} -> ${bestPage.url}`);
        return bestPage.url;
      }
    }

    // Сохраняем как canonical
    this.contentHashes.set(contentHash, page.url);
    return page.url; // Сама страница является canonical
  }

  /**
   * Поиск похожих страниц
   */
  findSimilarPages(page, allPages) {
    const pageHash = this.hashContent(page.html || page.content || '');
    const similar = [];

    for (const otherPage of allPages) {
      if (otherPage.url === page.url) continue;
      
      const otherHash = this.hashContent(otherPage.html || otherPage.content || '');
      const similarity = this.calculateSimilarity(pageHash, otherHash, page, otherPage);
      
      if (similarity > 0.8) { // 80% похожести
        similar.push({ page: otherPage, similarity });
      }
    }

    return similar.sort((a, b) => b.similarity - a.similarity).map(s => s.page);
  }

  /**
   * Вычисление похожести
   */
  calculateSimilarity(hash1, hash2, page1, page2) {
    // Если hash одинаковый - 100% похожесть
    if (hash1 === hash2) return 1.0;

    // Проверяем похожесть по параметрам
    let similarity = 0;
    let factors = 0;

    if (page1.vin === page2.vin) {
      similarity += 0.3;
      factors++;
    }
    if (page1.make === page2.make) {
      similarity += 0.2;
      factors++;
    }
    if (page1.model === page2.model) {
      similarity += 0.2;
      factors++;
    }
    if (page1.year === page2.year) {
      similarity += 0.1;
      factors++;
    }
    if (page1.stateSlug === page2.stateSlug) {
      similarity += 0.2;
      factors++;
    }

    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * Выбор лучшего canonical на основе метрик
   */
  selectBestCanonical(pages) {
    // Сортируем по метрикам (traffic, quality, age)
    return pages.sort((a, b) => {
      const scoreA = this.calculateCanonicalScore(a);
      const scoreB = this.calculateCanonicalScore(b);
      return scoreB - scoreA;
    })[0] || pages[0];
  }

  /**
   * Вычисление score для canonical
   */
  calculateCanonicalScore(page) {
    const metrics = this.urlMetrics.get(page.url) || {};
    let score = 0;

    // Traffic (40%)
    score += (metrics.traffic || 0) * 0.4;

    // Quality (30%)
    score += (page.qualityScore || 0) * 0.3;

    // Age (10%) - старше лучше
    const age = metrics.age || 0;
    score += Math.min(age / 365, 1) * 0.1;

    // Indexed (20%)
    if (metrics.isIndexed) {
      score += 0.2;
    }

    return score;
  }

  /**
   * Обновление метрик для URL
   */
  updateMetrics(url, metrics) {
    this.urlMetrics.set(url, {
      ...this.urlMetrics.get(url),
      ...metrics,
      lastUpdated: new Date().toISOString()
    });
  }

  /**
   * Добавление canonical в HTML
   */
  addCanonicalToHTML(html, canonicalUrl) {
    if (!JSDOM) {
      // Fallback: добавляем через regex
      if (!html.includes('rel="canonical"')) {
        return html.replace(
          '</head>',
          `<link rel="canonical" href="${canonicalUrl}">\n</head>`
        );
      }
      return html;
    }

    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;
      const head = document.head;

      // Удаляем существующий canonical
      const existing = head.querySelector('link[rel="canonical"]');
      if (existing) {
        existing.remove();
      }

      // Добавляем новый
      const canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      canonical.setAttribute('href', canonicalUrl);
      head.appendChild(canonical);

      return dom.serialize();
    } catch (e) {
      log('SMART-CANONICAL', `Error adding canonical: ${e.message}`);
      // Fallback: добавляем через regex
      if (!html.includes('rel="canonical"')) {
        return html.replace(
          '</head>',
          `<link rel="canonical" href="${canonicalUrl}">\n</head>`
        );
      }
      return html;
    }
  }

  /**
   * Обработка батча страниц
   */
  processBatch(pages) {
    // Безопасная проверка на массив
    if (!pages || !Array.isArray(pages)) {
      log('SMART-CANONICAL', 'No pages provided for canonical processing');
      return [];
    }
    
    const processed = [];

    for (const page of pages) {
      const canonical = this.determineCanonical(page, pages);
      
      if (canonical !== page.url) {
        page.canonicalUrl = canonical;
        page.isCanonical = false;
      } else {
        page.canonicalUrl = page.url;
        page.isCanonical = true;
      }

      // Добавляем canonical в HTML
      if (page.html) {
        page.html = this.addCanonicalToHTML(page.html, page.canonicalUrl);
      }

      processed.push(page);
    }

    log('SMART-CANONICAL', `Processed ${processed.length} pages, ${processed.filter(p => !p.isCanonical).length} with canonical`);
    return processed;
  }
}

module.exports = { SmartCanonicalEngine };


