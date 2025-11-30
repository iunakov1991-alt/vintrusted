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
    // Поддержка старых и новых классов
    const hasFaq = /class="(seo-)?faq/i.test(html);
    const hasCta = /class="(seo-)?(hero-)?cta/i.test(html);
    const hasKeyFacts = /class="(seo-)?key-facts/i.test(html);
    const hasLocal = /class="(seo-)?(state-insights|local-insights)/i.test(html);
    const hasTable = /<table/i.test(html);
    const hasHero = /class="seo-hero/i.test(html);
    
    const structureScore = (
      (hasH2 ? 0.12 : 0) +
      (hasH3 ? 0.08 : 0) +
      (hasFaq ? 0.12 : 0) +
      (hasCta ? 0.12 : 0) +
      (hasKeyFacts ? 0.12 : 0) +
      (hasLocal ? 0.12 : 0) +
      (hasTable ? 0.12 : 0) +
      (hasHero ? 0.2 : 0) // Бонус за новый дизайн
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

    // 5. Semantic coverage score (Tier 1 themes) (0-1)
    const tier1Keywords = [
      'vin structure', 'model lineage', 'recalls', 'manufacturing',
      'accident', 'frame damage', 'salvage', 'rebuilt', 'airbag', 'inspection',
      'ownership', 'fleet', 'rental', 'personal use', 'title transfer',
      'odometer', 'mileage', 'fraud', 'rollback',
      'curbstoning', 'title washing', 'cloned', 'fake vin',
      'state specific', 'dmv', 'emissions', 'smog', 'title brand'
    ];
    let semanticHits = 0;
    const textLower = text.toLowerCase();
    for (const kw of tier1Keywords) {
      if (textLower.includes(kw)) semanticHits++;
    }
    const semanticScore = Math.min(1, semanticHits / tier1Keywords.length);

    // Итоговый score
    const score = (
      0.20 * lenScore +
      0.25 * structureScore +
      0.20 * keywordScore +
      0.15 * diversityScore +
      0.20 * semanticScore  // Новый фактор: семантическое покрытие Tier 1
    );

    return {
      score,
      breakdown: {
        length: lenScore,
        structure: structureScore,
        keywords: keywordScore,
        diversity: diversityScore,
        semantic: semanticScore
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

