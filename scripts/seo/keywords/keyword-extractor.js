const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Keyword Extractor
 * Извлекает ключевые слова из контента страницы
 */
class KeywordExtractor {
  constructor(config) {
    this.config = config;
    this.stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how'
    ]);
  }

  /**
   * Извлечение ключевых слов из текста
   */
  extractKeywords(text, options = {}) {
    if (!text || typeof text !== 'string') return [];

    const {
      minLength = 3,
      maxLength = 50,
      minFrequency = 1,
      maxKeywords = 20
    } = options;

    // Нормализация текста
    const normalized = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Разбиение на слова
    const words = normalized.split(/\s+/)
      .filter(word => {
        const len = word.length;
        return len >= minLength && len <= maxLength && !this.stopWords.has(word);
      });

    // Подсчет частоты
    const frequency = new Map();
    for (const word of words) {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    }

    // Фильтрация по минимальной частоте и сортировка
    const keywords = Array.from(frequency.entries())
      .filter(([, count]) => count >= minFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word, count]) => ({ word, frequency: count }));

    return keywords;
  }

  /**
   * Извлечение ключевых фраз (биграммы и триграммы)
   */
  extractPhrases(text, options = {}) {
    if (!text || typeof text !== 'string') return [];

    const {
      minFrequency = 1,
      maxPhrases = 10,
      maxLength = 3 // биграммы или триграммы
    } = options;

    const normalized = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = normalized.split(/\s+/).filter(w => w.length >= 2 && !this.stopWords.has(w));
    const phrases = new Map();

    // Генерация фраз разной длины
    for (let len = 2; len <= maxLength; len++) {
      for (let i = 0; i <= words.length - len; i++) {
        const phrase = words.slice(i, i + len).join(' ');
        if (phrase.length >= 5 && phrase.length <= 50) {
          phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
        }
      }
    }

    // Фильтрация и сортировка
    return Array.from(phrases.entries())
      .filter(([, count]) => count >= minFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxPhrases)
      .map(([phrase, count]) => ({ phrase, frequency: count }));
  }

  /**
   * Извлечение ключевых слов из страницы
   */
  extractFromPage(page) {
    const keywords = [];
    const phrases = [];

    // Извлечение из различных полей страницы
    const textFields = [
      page.h1,
      page.intro,
      page.aiSection,
      page.localInsights,
      page.title,
      page.description
    ].filter(Boolean).join(' ');

    if (textFields) {
      keywords.push(...this.extractKeywords(textFields, { maxKeywords: 15 }));
      phrases.push(...this.extractPhrases(textFields, { maxPhrases: 10 }));
    }

    // Извлечение из FAQ
    if (page.faq && Array.isArray(page.faq)) {
      const faqText = page.faq.map(item => `${item.q} ${item.a}`).join(' ');
      keywords.push(...this.extractKeywords(faqText, { maxKeywords: 10 }));
    }

    // Дедупликация и сортировка
    const uniqueKeywords = new Map();
    for (const kw of keywords) {
      const existing = uniqueKeywords.get(kw.word);
      if (!existing || existing.frequency < kw.frequency) {
        uniqueKeywords.set(kw.word, kw);
      }
    }

    const uniquePhrases = new Map();
    for (const ph of phrases) {
      const existing = uniquePhrases.get(ph.phrase);
      if (!existing || existing.frequency < ph.frequency) {
        uniquePhrases.set(ph.phrase, ph);
      }
    }

    return {
      keywords: Array.from(uniqueKeywords.values()).slice(0, 20),
      phrases: Array.from(uniquePhrases.values()).slice(0, 10)
    };
  }
}

module.exports = { KeywordExtractor };

