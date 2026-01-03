const { log, error } = require('../logger');
const path = require('path');
const fs = require('fs');

/**
 * ЕДИНЫЙ ЗАГРУЗЧИК REFERENCE ARTICLES
 * 
 * Устраняет дублирование загрузки reference articles
 * Добавляет кеширование для производительности
 */
class ReferenceArticlesLoader {
  constructor() {
    this.cache = null;
    this.cacheTime = null;
    this.CACHE_TTL = 5 * 60 * 1000; // 5 минут
  }

  /**
   * Загрузка reference articles с кешированием
   */
  loadReferenceArticles(forceReload = false) {
    // Проверяем кеш
    if (!forceReload && this.cache && this.cacheTime) {
      const cacheAge = Date.now() - this.cacheTime;
      if (cacheAge < this.CACHE_TTL) {
        log('REF-LOADER', 'Using cached reference articles');
        return this.cache;
      }
    }

    try {
      const refPath = path.join(process.cwd(), 'data/seo/ai-training/reference-articles');
      
      const highVolume = JSON.parse(
        fs.readFileSync(path.join(refPath, 'high-volume-california-vin.json'), 'utf8')
      );
      
      const variability = JSON.parse(
        fs.readFileSync(path.join(refPath, 'variability-system.json'), 'utf8')
      );

      // Кешируем результат
      this.cache = { highVolume, variability };
      this.cacheTime = Date.now();

      log('REF-LOADER', 'Reference articles loaded and cached');
      return this.cache;
    } catch (e) {
      error('REF-LOADER', `Error loading reference articles: ${e.message}`);
      return { highVolume: null, variability: null };
    }
  }

  /**
   * Получение reference для конкретного блока
   */
  getReferenceForBlock(blockType, referenceArticles = null) {
    const refs = referenceArticles || this.loadReferenceArticles();
    if (!refs.highVolume) return null;

    // Маппинг типов блоков на структуру reference
    const blockMapping = {
      'hero': refs.highVolume.hero,
      'key_facts': refs.highVolume.keyFacts,
      'vin_decoder': refs.highVolume.vinDecoder,
      'nmvtis': refs.highVolume.nmvtis,
      'deep_explanation': refs.highVolume.deepExplanation || refs.highVolume.structure?.deep_explanation,
      'state_specific': refs.highVolume.stateSpecific || refs.highVolume.structure?.state_specific_insights,
      'accident_intelligence': refs.highVolume.accidentIntelligence || refs.highVolume.structure?.accident_intelligence,
      'fraud_patterns': refs.highVolume.fraudPatterns || refs.highVolume.structure?.fraud_patterns,
      'market_value': refs.highVolume.marketValue || refs.highVolume.structure?.market_value,
      'insurance_risk': refs.highVolume.insuranceRisk || refs.highVolume.structure?.insurance_risk,
      'buyer_guide': refs.highVolume.buyerGuide || refs.highVolume.structure?.buyer_guide,
      'faq': refs.highVolume.faq || refs.highVolume.structure?.faq,
      'internal_links': refs.highVolume.internalLinks || refs.highVolume.structure?.internal_links,
      'cta': refs.highVolume.cta || refs.highVolume.structure?.cta
    };

    const reference = blockMapping[blockType];
    if (reference) {
      return typeof reference === 'string' ? reference : reference.content || reference;
    }

    return null;
  }

  /**
   * Очистка кеша
   */
  clearCache() {
    this.cache = null;
    this.cacheTime = null;
    log('REF-LOADER', 'Cache cleared');
  }
}

// Singleton instance
let instance = null;

module.exports = {
  ReferenceArticlesLoader,
  getReferenceArticlesLoader: () => {
    if (!instance) {
      instance = new ReferenceArticlesLoader();
    }
    return instance;
  }
};


















