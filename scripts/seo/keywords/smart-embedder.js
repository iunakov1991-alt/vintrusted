const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Smart Embedder
 * Умное встраивание ключевых слов в контент
 */
class SmartEmbedder {
  constructor(config) {
    this.config = config;
  }

  /**
   * Встраивание ключевых слов в текст естественным образом
   */
  embedKeywords(text, keywords, options = {}) {
    if (!text || !keywords || keywords.length === 0) return text;

    const {
      maxEmbeddings = 3,
      minDistance = 50 // минимальное расстояние между встраиваниями
    } = options;

    let result = text;
    const embeddings = [];
    const keywordWords = keywords.slice(0, maxEmbeddings).map(kw => 
      typeof kw === 'string' ? kw : kw.word
    );

    for (const keyword of keywordWords) {
      const keywordLower = keyword.toLowerCase();
      const textLower = result.toLowerCase();

      // Проверяем, не присутствует ли уже ключевое слово
      if (textLower.includes(keywordLower)) {
        continue;
      }

      // Находим подходящее место для встраивания
      const positions = this.findEmbeddingPositions(result, keyword, embeddings, minDistance);
      
      if (positions.length > 0) {
        const position = positions[0];
        result = this.insertKeyword(result, keyword, position);
        embeddings.push({ keyword, position });
        log('EMBEDDER', `Embedded keyword "${keyword}" at position ${position}`);
      }
    }

    return result;
  }

  /**
   * Поиск подходящих позиций для встраивания
   */
  findEmbeddingPositions(text, keyword, existingEmbeddings, minDistance) {
    const positions = [];
    const sentences = text.split(/[.!?]+\s+/);

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceStart = text.indexOf(sentence);
      
      // Проверяем, что позиция не слишком близко к существующим встраиваниям
      const tooClose = existingEmbeddings.some(emb => 
        Math.abs(emb.position - sentenceStart) < minDistance
      );

      if (!tooClose && sentence.length > 20 && sentence.length < 150) {
        // Находим подходящее место в предложении (после запятой или в середине)
        const commaIndex = sentence.lastIndexOf(',');
        if (commaIndex > 10) {
          positions.push(sentenceStart + commaIndex + 1);
        } else {
          // Вставляем в середину предложения
          positions.push(sentenceStart + Math.floor(sentence.length / 2));
        }
      }
    }

    return positions;
  }

  /**
   * Вставка ключевого слова в текст
   */
  insertKeyword(text, keyword, position) {
    const before = text.slice(0, position);
    const after = text.slice(position);
    
    // Пытаемся вставить естественным образом
    const insertion = ` ${keyword} `;
    
    return before + insertion + after;
  }

  /**
   * Встраивание ключевых слов в различные блоки страницы
   */
  embedInPage(page, keywords) {
    const embedded = { ...page };

    if (!keywords || !keywords.keywords || keywords.keywords.length === 0) {
      return embedded;
    }

    const keywordList = keywords.keywords.map(kw => kw.word);

    // Встраивание в intro
    if (embedded.intro) {
      embedded.intro = this.embedKeywords(embedded.intro, keywordList, { maxEmbeddings: 2 });
    }

    // Встраивание в localInsights
    if (embedded.localInsights) {
      embedded.localInsights = this.embedKeywords(embedded.localInsights, keywordList, { maxEmbeddings: 1 });
    }

    // Встраивание в AI секцию (осторожно, чтобы не нарушить смысл)
    if (embedded.aiSection) {
      embedded.aiSection = this.embedKeywords(embedded.aiSection, keywordList, { maxEmbeddings: 1 });
    }

    return embedded;
  }

  /**
   * Встраивание ключевых фраз
   */
  embedPhrases(text, phrases, options = {}) {
    if (!text || !phrases || phrases.length === 0) return text;

    const { maxEmbeddings = 2 } = options;
    let result = text;

    const phraseList = phrases.slice(0, maxEmbeddings).map(ph => 
      typeof ph === 'string' ? ph : ph.phrase
    );

    for (const phrase of phraseList) {
      const phraseLower = phrase.toLowerCase();
      const textLower = result.toLowerCase();

      // Если фраза уже присутствует, пропускаем
      if (textLower.includes(phraseLower)) {
        continue;
      }

      // Находим подходящее место для встраивания фразы
      const sentences = result.split(/[.!?]+\s+/);
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        if (sentence.length > 30 && sentence.length < 120) {
          const sentenceIndex = result.indexOf(sentence);
          const insertPos = sentenceIndex + Math.floor(sentence.length / 2);
          result = this.insertKeyword(result, phrase, insertPos);
          log('EMBEDDER', `Embedded phrase "${phrase}"`);
          break;
        }
      }
    }

    return result;
  }
}

module.exports = { SmartEmbedder };

