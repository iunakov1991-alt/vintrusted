const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Quality Engine
 * Оценка качества страниц по множественным критериям
 */
class QualityEngine {
  constructor(config) {
    this.config = config;
    this.minScore = config.minQualityScore || 0.75;
    // Опциональная интеграция с Conversion Predictor
    try {
      const { ConversionPredictor } = require('../analytics/conversion-predictor');
      this.conversionPredictor = new ConversionPredictor(config);
      this.useConversionPrediction = true;
    } catch (e) {
      this.useConversionPrediction = false;
    }
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

    // 6. Traffic Conversion Potential score (0-1) - ВТОРИЧНЫЙ фактор
    // ПРИОРИТЕТ 1: SEO факторы (качество, semantic, structure) - уже учтены выше
    // ПРИОРИТЕТ 2: Conversion potential - учитываем, но с меньшим весом
    let trafficConversionScore = 0.5; // Нейтральный score по умолчанию
    if (this.useConversionPrediction && this.conversionPredictor) {
      try {
        const prediction = this.conversionPredictor.predictConversion(page, {
          traffic: page.gscMetrics?.clicks || 0,
          ctr: page.gscMetrics?.ctr || 0,
          position: page.gscMetrics?.position || 0,
          bounceRate: page.externalMetrics?.bounceRate || 0,
          timeOnPage: page.externalMetrics?.timeOnPage || 0
        });
        // Используем Traffic Conversion Potential как ВТОРИЧНЫЙ фактор
        trafficConversionScore = prediction.trafficConversionPotential || prediction.predictedRate;
      } catch (e) {
        // Если ошибка, используем нейтральный score
        trafficConversionScore = 0.5;
      }
    }

    // Итоговый score
    // ПРИОРИТЕТ 1: SEO факторы (85% веса) - чтобы Google нравился
    // ПРИОРИТЕТ 2: Conversion potential (5% веса) - вторичный фактор
    const trafficConversionWeight = this.useConversionPrediction ? 0.05 : 0; // Снижен до 5% (вторичный)
    const baseWeight = 1 - trafficConversionWeight;
    
    const score = (
      (baseWeight * 0.20) * lenScore +           // SEO: длина контента
      (baseWeight * 0.25) * structureScore +     // SEO: структура (Google любит)
      (baseWeight * 0.20) * keywordScore +       // SEO: ключевые слова
      (baseWeight * 0.15) * diversityScore +     // SEO: разнообразие
      (baseWeight * 0.20) * semanticScore +       // SEO: semantic (Google понимает)
      (trafficConversionWeight) * trafficConversionScore  // ВТОРИЧНО: conversion potential
    );

    return {
      score,
      breakdown: {
        length: lenScore,
        structure: structureScore,
        keywords: keywordScore,
        diversity: diversityScore,
        semantic: semanticScore,
        conversionPotential: this.useConversionPrediction ? trafficConversionScore : undefined // Вторичный фактор
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

