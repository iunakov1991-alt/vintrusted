const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Quality Engine
 * Оценка качества страниц по множественным критериям
 */
class QualityEngine {
  constructor(config) {
    this.config = config;
    this.minScore = config.minQualityScore || 0.75;
  }

  /**
   * Оценка качества страницы
   */
  scorePage(page) {
    const html = page.html || '';
    const text = this.stripHtml(html);
    
    // 1. Length score (0-1)
    const lenScore = Math.max(0, Math.min(1, text.length / 4000));

    // 2. Structure score (0-1)
    const hasH2 = /<h2[^>]*>/i.test(html);
    const hasH3 = /<h3[^>]*>/i.test(html);
    const hasFaq = /class="faq"/i.test(html);
    const hasCta = /class="cta"/i.test(html);
    const hasKeyFacts = /class="key-facts"/i.test(html);
    const hasLocal = /class="local-insights"/i.test(html);
    const hasTable = /<table/i.test(html);
    
    const structureScore = (
      (hasH2 ? 0.15 : 0) +
      (hasH3 ? 0.1 : 0) +
      (hasFaq ? 0.15 : 0) +
      (hasCta ? 0.15 : 0) +
      (hasKeyFacts ? 0.15 : 0) +
      (hasLocal ? 0.15 : 0) +
      (hasTable ? 0.15 : 0)
    );

    // 3. Keyword score (0-1)
    const keywords = [page.vin, page.stateSlug, page.make, page.intent].filter(Boolean);
    let kwHits = 0;
    for (const kw of keywords) {
      if (kw && text.toLowerCase().includes(kw.toLowerCase())) kwHits++;
    }
    const keywordScore = Math.min(1, kwHits / Math.max(keywords.length, 1));

    // 4. Content diversity score (0-1)
    const uniqueWords = new Set(text.toLowerCase().split(/\s+/));
    const diversityScore = Math.min(1, uniqueWords.size / 200);

    // Итоговый score
    const score = (
      0.25 * lenScore +
      0.30 * structureScore +
      0.25 * keywordScore +
      0.20 * diversityScore
    );

    return {
      score,
      breakdown: {
        length: lenScore,
        structure: structureScore,
        keywords: keywordScore,
        diversity: diversityScore
      },
      isAccepted: score >= this.minScore
    };
  }

  stripHtml(html) {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Batch scoring
   */
  scorePages(pages) {
    const scored = pages.map(page => {
      const quality = this.scorePage(page);
      return {
        ...page,
        qualityScore: quality.score,
        qualityBreakdown: quality.breakdown,
        isAccepted: quality.isAccepted
      };
    });

    const accepted = scored.filter(p => p.isAccepted);
    const avgQuality = scored.reduce((sum, p) => sum + p.qualityScore, 0) / scored.length;

    log('QUALITY', `Scored ${scored.length} pages`, {
      accepted: accepted.length,
      avgQuality: avgQuality.toFixed(3),
      minScore: this.minScore
    });

    return { scored, accepted, avgQuality };
  }
}

module.exports = { QualityEngine };

