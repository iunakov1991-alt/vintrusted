const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Pattern-Based Prediction
 * Предсказание на основе паттернов успешных страниц (ТРИЗ приоритет #7)
 */
class PatternBasedPrediction {
  constructor(config) {
    this.config = config;
    this.patterns = new Map(); // patternId -> { features: {}, successRate: 0, samples: [] }
    this.minSamples = 10; // Минимум образцов для паттерна
  }

  /**
   * Обучение на основе успешных страниц
   */
  learnFromSuccess(pages, metrics = {}) {
    for (const page of pages) {
      const pattern = this.extractPattern(page);
      const patternId = this.getPatternId(pattern);
      
      if (!this.patterns.has(patternId)) {
        this.patterns.set(patternId, {
          pattern,
          successCount: 0,
          totalCount: 0,
          samples: [],
          features: this.extractFeatures(page)
        });
      }

      const patternData = this.patterns.get(patternId);
      patternData.totalCount++;
      
      // Определяем успешность по метрикам
      const isSuccess = this.isSuccessful(page, metrics);
      if (isSuccess) {
        patternData.successCount++;
      }

      // Сохраняем образец
      patternData.samples.push({
        page: this.sanitizePage(page),
        metrics: this.sanitizeMetrics(metrics),
        isSuccess,
        timestamp: Date.now()
      });

      // Ограничиваем размер образцов
      if (patternData.samples.length > 100) {
        patternData.samples = patternData.samples.slice(-100);
      }

      // Обновляем success rate
      patternData.successRate = patternData.successCount / patternData.totalCount;
    }

    log('PATTERN-PREDICTION', `Learned from ${pages.length} pages, ${this.patterns.size} patterns`);
  }

  /**
   * Предсказание успешности страницы
   */
  predictSuccess(page) {
    const pattern = this.extractPattern(page);
    const patternId = this.getPatternId(pattern);
    
    const patternData = this.patterns.get(patternId);
    if (!patternData || patternData.totalCount < this.minSamples) {
      return {
        predicted: false,
        confidence: 0,
        reason: 'Insufficient data'
      };
    }

    const confidence = this.calculateConfidence(patternData);
    const predictedSuccess = patternData.successRate > 0.6; // Порог успешности

    return {
      predicted: predictedSuccess,
      confidence,
      successRate: patternData.successRate,
      patternId,
      features: patternData.features
    };
  }

  /**
   * Извлечение паттерна из страницы
   */
  extractPattern(page) {
    return {
      layout: page.layout?.name || 'unknown',
      intent: page.intent || 'generic',
      make: page.make || '',
      year: page.year || '',
      stateSlug: page.stateSlug || '',
      lang: page.lang || 'en',
      hasAI: !!page.aiText,
      aiLength: page.aiText?.length || 0,
      h1Variants: page.h1Variants?.length || 0,
      keywords: page.keywords?.length || 0
    };
  }

  /**
   * Извлечение признаков страницы
   */
  extractFeatures(page) {
    return {
      contentLength: (page.aiText || '').length + (page.baseline || '').length,
      keywordDensity: this.calculateKeywordDensity(page),
      structureScore: this.calculateStructureScore(page),
      semanticCoverage: this.calculateSemanticCoverage(page)
    };
  }

  /**
   * Расчет плотности ключевых слов
   */
  calculateKeywordDensity(page) {
    if (!page.keywords || page.keywords.length === 0) return 0;
    const text = ((page.aiText || '') + (page.baseline || '')).toLowerCase();
    const keywordCount = page.keywords.reduce((sum, kw) => {
      const regex = new RegExp(kw.toLowerCase(), 'g');
      return sum + (text.match(regex) || []).length;
    }, 0);
    return keywordCount / (text.length || 1);
  }

  /**
   * Расчет оценки структуры
   */
  calculateStructureScore(page) {
    let score = 0;
    if (page.h1) score += 0.3;
    if (page.title) score += 0.2;
    if (page.description) score += 0.2;
    if (page.blocks && page.blocks.length > 0) score += 0.3;
    return score;
  }

  /**
   * Расчет семантического покрытия
   */
  calculateSemanticCoverage(page) {
    const tier1Keywords = [
      'vin structure', 'model lineage', 'recalls', 'manufacturing',
      'accident', 'frame damage', 'salvage', 'rebuilt', 'airbag', 'inspection',
      'vin check', 'ownership', 'fleet', 'rental', 'title transfer',
      'odometer', 'mileage', 'fraud', 'rollback',
      'curbstoning', 'title washing', 'cloned', 'fake vin',
      'state specific', 'dmv', 'emissions', 'smog', 'title brand'
    ];
    
    const text = ((page.aiText || '') + (page.baseline || '')).toLowerCase();
    const hits = tier1Keywords.filter(kw => text.includes(kw)).length;
    return hits / tier1Keywords.length;
  }

  /**
   * Получение ID паттерна
   */
  getPatternId(pattern) {
    const key = `${pattern.layout}-${pattern.intent}-${pattern.make}-${pattern.year}-${pattern.stateSlug}-${pattern.lang}`;
    return require('crypto').createHash('md5').update(key).digest('hex').substring(0, 16);
  }

  /**
   * Определение успешности страницы
   */
  isSuccessful(page, metrics = {}) {
    // Критерии успешности:
    // 1. Высокое качество
    const qualityScore = page.qualityScore || 0;
    if (qualityScore < 0.7) return false;

    // 2. Хорошие метрики (если доступны)
    if (metrics.clicks && metrics.clicks > 10) return true;
    if (metrics.ctr && metrics.ctr > 0.05) return true;
    if (metrics.position && metrics.position < 20) return true;

    // 3. Базовая успешность по качеству
    return qualityScore >= 0.8;
  }

  /**
   * Расчет уверенности в предсказании
   */
  calculateConfidence(patternData) {
    // Уверенность растет с количеством образцов
    const sampleConfidence = Math.min(1, patternData.totalCount / 50);
    
    // Уверенность растет с четкостью паттерна (высокий или низкий success rate)
    const clarityConfidence = Math.abs(patternData.successRate - 0.5) * 2;
    
    return (sampleConfidence * 0.6 + clarityConfidence * 0.4);
  }

  /**
   * Очистка страницы для хранения
   */
  sanitizePage(page) {
    return {
      url: page.url,
      layout: page.layout?.name,
      intent: page.intent,
      make: page.make,
      year: page.year,
      stateSlug: page.stateSlug,
      qualityScore: page.qualityScore
    };
  }

  /**
   * Очистка метрик
   */
  sanitizeMetrics(metrics) {
    return {
      clicks: metrics.clicks || 0,
      ctr: metrics.ctr || 0,
      position: metrics.position || 0,
      impressions: metrics.impressions || 0
    };
  }

  /**
   * Получение статистики паттернов
   */
  getStats() {
    const patterns = Array.from(this.patterns.values());
    return {
      totalPatterns: patterns.length,
      avgSuccessRate: patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length || 0,
      topPatterns: patterns
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, 10)
        .map(p => ({
          successRate: p.successRate,
          totalCount: p.totalCount,
          features: p.features
        }))
    };
  }
}

module.exports = { PatternBasedPrediction };


