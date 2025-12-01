const crypto = require('crypto');
const { log } = require('./logger');

/**
 * SEO MONSTER 6.0: Uniqueness Engine
 * Гарантия неповторяемости контента и структуры
 */
class UniquenessEngine {
  constructor(config) {
    this.config = config;
    this.structureFingerprints = new Set();
    this.contentHashes = new Set();
    this.threshold = config.uniquenessThreshold || 0.85;
  }

  /**
   * Вычислить fingerprint структуры DOM
   */
  computeStructureFingerprint(layout, blocks) {
    // Безопасная обработка: проверяем наличие layout и blocks
    const layoutName = (layout && layout.name) ? layout.name : 'DEFAULT';
    const blocksArray = (blocks && Array.isArray(blocks)) ? blocks : (layout && layout.blocks && Array.isArray(layout.blocks)) ? layout.blocks : [];
    const structure = `${layoutName}|${blocksArray.join('|')}`;
    return crypto.createHash('sha256').update(structure).digest('hex').substring(0, 16);
  }

  /**
   * Вычислить hash контента ключевых блоков
   * Включает VIN и state для уникальности
   */
  computeContentHash(page) {
    // keyBlocks всегда массив, так что join безопасен
    const keyBlocks = ['h1', 'intro', 'aiSection'].map(key => {
      if (key === 'h1') return page.h1 || '';
      if (key === 'intro') return page.intro || '';
      if (key === 'aiSection') return page.aiText || '';
      return '';
    });
    // Добавляем VIN и state для уникальности
    const uniqueIdentifiers = `${page.vin || ''}|${page.stateSlug || ''}`;
    const content = (Array.isArray(keyBlocks) ? keyBlocks.join('|') : '') + '|' + uniqueIdentifiers;
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Проверить уникальность структуры
   */
  isStructureUnique(fingerprint) {
    if (this.structureFingerprints.has(fingerprint)) {
      return false;
    }
    this.structureFingerprints.add(fingerprint);
    return true;
  }

  /**
   * Проверить уникальность контента
   */
  isContentUnique(contentHash) {
    if (this.contentHashes.has(contentHash)) {
      return false;
    }
    this.contentHashes.add(contentHash);
    return true;
  }

  /**
   * Вычислить similarity score между двумя контентами
   */
  computeSimilarity(content1, content2) {
    // Упрощенная версия - можно улучшить с помощью более сложных алгоритмов
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Проверить страницу на уникальность
   */
  validateUniqueness(page) {
    // Безопасная передача: используем page.blocks или layout.blocks или пустой массив
    const blocks = page.blocks || (page.layout && page.layout.blocks) || [];
    const structureFp = this.computeStructureFingerprint(page.layout, blocks);
    const contentHash = this.computeContentHash(page);

    // Для страниц с разными VIN/state считаем уникальными по структуре
    // Проверяем только дубликаты структуры для одинаковых VIN+state
    const vinStateKey = `${page.vin}|${page.stateSlug}`;
    const structureKey = `${vinStateKey}|${structureFp}`;
    
    const isStructUnique = !this.structureFingerprints.has(structureKey);
    if (isStructUnique) {
      this.structureFingerprints.add(structureKey);
    }

    const isContUnique = this.isContentUnique(contentHash);
    const isUnique = isStructUnique && isContUnique;

    if (!isUnique) {
      log('UNIQUENESS', `Page not unique: ${page.url}`, {
        structureUnique: isStructUnique,
        contentUnique: isContUnique
      });
    }

    return {
      isUnique,
      structureFingerprint: structureFp,
      contentHash,
      structureUnique: isStructUnique,
      contentUnique: isContUnique
    };
  }

  /**
   * Сброс кеша (для нового билда)
   */
  reset() {
    this.structureFingerprints.clear();
    this.contentHashes.clear();
    log('UNIQUENESS', 'Uniqueness cache reset');
  }
}

module.exports = { UniquenessEngine };

