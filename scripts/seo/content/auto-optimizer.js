const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Auto-Optimizer
 * Автоматическое улучшение качества текста
 */
class AutoOptimizer {
  constructor(config) {
    this.config = config;
  }

  /**
   * Оптимизация читаемости текста
   */
  optimizeReadability(text) {
    if (!text || typeof text !== 'string') return text;

    let optimized = text;

    // Удаление множественных пробелов
    optimized = optimized.replace(/\s+/g, ' ');

    // Исправление множественных точек/запятых
    optimized = optimized.replace(/\.{3,}/g, '...');
    optimized = optimized.replace(/,{2,}/g, ',');

    // Улучшение структуры предложений
    optimized = this.improveSentenceStructure(optimized);

    // Оптимизация длины предложений
    optimized = this.optimizeSentenceLength(optimized);

    return optimized.trim();
  }

  /**
   * Улучшение структуры предложений
   */
  improveSentenceStructure(text) {
    const sentences = text.split(/([.!?]+\s+)/);
    const improved = [];

    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i];
      const punctuation = sentences[i + 1] || '';

      if (!sentence) continue;

      let improvedSentence = sentence.trim();

      // Удаление лишних слов в начале предложения
      improvedSentence = improvedSentence.replace(/^(and|but|or|so|then)\s+/i, '');

      // Улучшение заглавных букв
      if (improvedSentence.length > 0) {
        improvedSentence = improvedSentence.charAt(0).toUpperCase() + 
                           improvedSentence.slice(1);
      }

      improved.push(improvedSentence + punctuation);
    }

    return improved.join('');
  }

  /**
   * Оптимизация длины предложений
   */
  optimizeSentenceLength(text) {
    const sentences = text.split(/([.!?]+\s+)/);
    const optimized = [];

    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i];
      const punctuation = sentences[i + 1] || '';

      if (!sentence) continue;

      // Если предложение слишком длинное (>150 символов), пытаемся разбить
      if (sentence.length > 150) {
        const parts = this.splitLongSentence(sentence);
        optimized.push(...parts.map(p => p + punctuation));
      } else {
        optimized.push(sentence + punctuation);
      }
    }

    return optimized.join(' ');
  }

  /**
   * Разбиение длинного предложения
   */
  splitLongSentence(sentence) {
    // Ищем точки с запятой, запятые, союзы для разбиения
    const splitPoints = [
      /;\s+/,
      /,\s+(and|but|or|so|then)\s+/i,
      /,\s+/
    ];

    for (const pattern of splitPoints) {
      if (pattern.test(sentence)) {
        const parts = sentence.split(pattern);
        if (parts.length >= 2 && parts.every(p => p.length > 20)) {
          return parts;
        }
      }
    }

    // Если не удалось разбить, возвращаем как есть
    return [sentence];
  }

  /**
   * Оптимизация плотности ключевых слов
   */
  optimizeKeywordDensity(text, keywords) {
    if (!text || !keywords || keywords.length === 0) return text;

    const keywordWords = keywords.map(kw => 
      typeof kw === 'string' ? kw.toLowerCase() : kw.word.toLowerCase()
    );

    // Подсчитываем плотность каждого ключевого слова
    const textLower = text.toLowerCase();
    const wordCount = text.split(/\s+/).length;
    const densities = {};

    for (const keyword of keywordWords) {
      const matches = (textLower.match(new RegExp(keyword, 'g')) || []).length;
      densities[keyword] = (matches / wordCount) * 100;
    }

    // Если плотность слишком низкая (<0.5%), добавляем ключевые слова
    let optimized = text;
    for (const keyword of keywordWords) {
      if (densities[keyword] < 0.5 && keyword.length >= 4) {
        // Добавляем ключевое слово в подходящее место
        const sentences = optimized.split(/[.!?]+\s+/);
        if (sentences.length > 0) {
          const insertIndex = Math.floor(sentences.length / 2);
          const sentence = sentences[insertIndex];
          if (sentence && !sentence.toLowerCase().includes(keyword)) {
            const insertPos = optimized.indexOf(sentence) + Math.floor(sentence.length / 2);
            optimized = optimized.slice(0, insertPos) + ` ${keyword} ` + optimized.slice(insertPos);
          }
        }
      }
    }

    return optimized;
  }

  /**
   * Оптимизация метаданных
   */
  optimizeMetadata(page) {
    const optimized = { ...page };

    // Оптимизация title (50-60 символов)
    if (optimized.title && optimized.title.length > 60) {
      optimized.title = optimized.title.substring(0, 57) + '...';
    }

    // Оптимизация description (150-160 символов)
    if (optimized.description && optimized.description.length > 160) {
      optimized.description = optimized.description.substring(0, 157) + '...';
    }

    // Оптимизация H1 (до 60 символов)
    if (optimized.h1 && optimized.h1.length > 60) {
      optimized.h1 = optimized.h1.substring(0, 57) + '...';
    }

    return optimized;
  }

  /**
   * Полная оптимизация страницы
   */
  optimizePage(page, keywords = null) {
    const optimized = { ...page };

    // Оптимизация текстовых полей
    if (optimized.intro) {
      optimized.intro = this.optimizeReadability(optimized.intro);
      if (keywords) {
        optimized.intro = this.optimizeKeywordDensity(optimized.intro, keywords.keywords || []);
      }
    }

    if (optimized.aiSection) {
      optimized.aiSection = this.optimizeReadability(optimized.aiSection);
    }

    if (optimized.localInsights) {
      optimized.localInsights = this.optimizeReadability(optimized.localInsights);
    }

    // Оптимизация FAQ
    if (optimized.faq && Array.isArray(optimized.faq)) {
      optimized.faq = optimized.faq.map(item => ({
        q: this.optimizeReadability(item.q),
        a: this.optimizeReadability(item.a)
      }));
    }

    // Оптимизация метаданных
    const metadataOptimized = this.optimizeMetadata(optimized);

    log('OPTIMIZER', `Page optimized: ${page.url || 'unknown'}`);

    return metadataOptimized;
  }
}

module.exports = { AutoOptimizer };

