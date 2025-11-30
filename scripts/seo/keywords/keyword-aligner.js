const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Keyword Aligner
 * Выравнивает ключевые слова с контентом и метаданными
 */
class KeywordAligner {
  constructor(config) {
    this.config = config;
  }

  /**
   * Выравнивание ключевых слов с title
   */
  alignWithTitle(keywords, title) {
    if (!title || !keywords.length) return title;

    // Находим наиболее релевантные ключевые слова
    const titleLower = title.toLowerCase();
    const relevantKeywords = keywords
      .filter(kw => {
        const word = kw.word.toLowerCase();
        return !titleLower.includes(word);
      })
      .slice(0, 2);

    // Если title уже содержит ключевые слова, возвращаем как есть
    if (relevantKeywords.length === 0) return title;

    // Добавляем ключевые слова в title, если они не нарушают читаемость
    // (в реальной реализации это должно быть более умным)
    return title;
  }

  /**
   * Выравнивание ключевых слов с description
   */
  alignWithDescription(keywords, description) {
    if (!description || !keywords.length) return description;

    const descLower = description.toLowerCase();
    const missingKeywords = keywords
      .filter(kw => {
        const word = kw.word.toLowerCase();
        return !descLower.includes(word) && word.length >= 4;
      })
      .slice(0, 3);

    if (missingKeywords.length === 0) return description;

    // Добавляем ключевые слова в описание естественным образом
    const keywordsToAdd = missingKeywords.map(kw => kw.word).join(', ');
    const enhanced = `${description} ${keywordsToAdd}.`;

    // Ограничиваем длину description (обычно до 160 символов)
    return enhanced.length > 160 ? description : enhanced;
  }

  /**
   * Выравнивание ключевых слов с H1
   */
  alignWithH1(keywords, h1) {
    if (!h1 || !keywords.length) return h1;

    const h1Lower = h1.toLowerCase();
    const primaryKeyword = keywords[0];

    // Если H1 уже содержит основное ключевое слово, возвращаем как есть
    if (primaryKeyword && h1Lower.includes(primaryKeyword.word.toLowerCase())) {
      return h1;
    }

    // В реальной реализации здесь была бы более сложная логика
    // для естественного включения ключевых слов в H1
    return h1;
  }

  /**
   * Выравнивание ключевых слов с контентом страницы
   */
  alignWithContent(keywords, content) {
    if (!content || !keywords.length) return content;

    // Проверяем, какие ключевые слова уже присутствуют в контенте
    const contentLower = content.toLowerCase();
    const presentKeywords = keywords.filter(kw => 
      contentLower.includes(kw.word.toLowerCase())
    );

    // Если большинство ключевых слов уже присутствуют, возвращаем контент как есть
    if (presentKeywords.length >= keywords.length * 0.5) {
      return content;
    }

    // В реальной реализации здесь была бы логика для естественного
    // добавления недостающих ключевых слов в контент
    return content;
  }

  /**
   * Полное выравнивание ключевых слов со страницей
   */
  alignWithPage(page, extractedKeywords) {
    const aligned = { ...page };

    if (extractedKeywords && extractedKeywords.keywords) {
      const keywords = extractedKeywords.keywords.map(kw => kw.word);

      // Выравнивание с title
      if (aligned.title) {
        aligned.title = this.alignWithTitle(extractedKeywords.keywords, aligned.title);
      }

      // Выравнивание с description
      if (aligned.description) {
        aligned.description = this.alignWithDescription(extractedKeywords.keywords, aligned.description);
      }

      // Выравнивание с H1
      if (aligned.h1) {
        aligned.h1 = this.alignWithH1(extractedKeywords.keywords, aligned.h1);
      }

      // Выравнивание с intro
      if (aligned.intro) {
        aligned.intro = this.alignWithContent(extractedKeywords.keywords, aligned.intro);
      }
    }

    // Сохраняем извлеченные ключевые слова в метаданных страницы
    aligned.keywords = extractedKeywords;

    return aligned;
  }
}

module.exports = { KeywordAligner };

