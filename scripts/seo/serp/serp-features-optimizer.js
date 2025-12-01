const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: SERP Features Optimization
 * Оптимизация контента для SERP features (Featured Snippets, People Also Ask)
 */
class SERPFeaturesOptimizer {
  constructor(config) {
    this.config = config;
    this.featureTypes = ['featured-snippet', 'people-also-ask', 'related-searches', 'knowledge-panel'];
  }

  /**
   * Оптимизация для Featured Snippets
   */
  optimizeForFeaturedSnippet(page) {
    const optimizations = {
      hasFAQ: false,
      hasList: false,
      hasTable: false,
      hasDefinition: false,
      recommendedStructure: null
    };

    const content = page.content || page.html || '';
    const lower = content.toLowerCase();

    // Проверяем наличие FAQ
    if (lower.includes('question') || lower.includes('faq') || lower.includes('?')) {
      optimizations.hasFAQ = true;
    }

    // Проверяем наличие списков
    if (content.includes('<ul>') || content.includes('<ol>') || lower.includes('first') || lower.includes('second')) {
      optimizations.hasList = true;
    }

    // Проверяем наличие таблиц
    if (content.includes('<table>')) {
      optimizations.hasTable = true;
    }

    // Рекомендации
    if (!optimizations.hasFAQ) {
      optimizations.recommendedStructure = 'Add FAQ section for Featured Snippet eligibility';
    } else if (!optimizations.hasList) {
      optimizations.recommendedStructure = 'Add numbered or bulleted list';
    }

    return {
      ...page,
      serpOptimization: {
        ...optimizations,
        featureType: 'featured-snippet'
      }
    };
  }

  /**
   * Оптимизация для People Also Ask
   */
  optimizeForPeopleAlsoAsk(page) {
    // Извлекаем вопросы из контента
    const questions = this.extractQuestions(page);

    return {
      ...page,
      serpOptimization: {
        questions,
        questionCount: questions.length,
        featureType: 'people-also-ask',
        recommendation: questions.length < 3 
          ? 'Add more question-answer pairs'
          : 'Good question coverage'
      }
    };
  }

  /**
   * Извлечение вопросов
   */
  extractQuestions(page) {
    const content = page.content || page.html || '';
    const questions = [];

    // Ищем вопросы (строки с ?)
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes('?') && line.length < 200) {
        const question = line.trim().replace(/[^\w\s?]/g, '');
        if (question.length > 10) {
          questions.push(question);
        }
      }
    }

    return questions.slice(0, 10); // Максимум 10 вопросов
  }

  /**
   * Генерация FAQ структуры
   */
  generateFAQStructure(page) {
    const questions = this.extractQuestions(page);
    
    if (questions.length === 0) {
      // Генерируем вопросы на основе контента
      const content = page.content || '';
      const generatedQuestions = this.generateQuestionsFromContent(content);
      return generatedQuestions;
    }

    return questions.map(q => ({
      question: q,
      answer: this.generateAnswer(q, page)
    }));
  }

  /**
   * Генерация вопросов из контента
   */
  generateQuestionsFromContent(content) {
    const questions = [];

    // Простые паттерны для генерации вопросов
    if (content.includes('VIN')) {
      questions.push('What is a VIN?');
      questions.push('How to decode a VIN?');
    }
    if (content.includes('accident')) {
      questions.push('How to check accident history?');
    }
    if (content.includes('title')) {
      questions.push('What are title records?');
    }

    return questions;
  }

  /**
   * Генерация ответа на вопрос
   */
  generateAnswer(question, page) {
    // В реальности здесь был бы AI для генерации ответа
    // Для now возвращаем краткий ответ на основе контента
    const content = page.content || '';
    const sentences = content.split('.').filter(s => s.length > 20);
    
    // Ищем релевантное предложение
    const lowerQuestion = question.toLowerCase();
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      const questionWords = lowerQuestion.split(/\s+/).filter(w => w.length > 3);
      const matchCount = questionWords.filter(w => lowerSentence.includes(w)).length;
      
      if (matchCount >= 2) {
        return sentence.trim() + '.';
      }
    }

    return sentences[0] || 'Answer based on content.';
  }

  /**
   * Оптимизация страницы для SERP features
   */
  optimizePage(page) {
    let optimized = page;

    // Оптимизация для Featured Snippets
    optimized = this.optimizeForFeaturedSnippet(optimized);

    // Оптимизация для People Also Ask
    optimized = this.optimizeForPeopleAlsoAsk(optimized);

    // Генерация FAQ если нужно
    if (!optimized.faq) {
      optimized.faq = this.generateFAQStructure(optimized);
    }

    log('SERP-FEATURES', `Optimized ${page.url} for SERP features`);
    return optimized;
  }

  /**
   * Обработка батча
   */
  processBatch(pages) {
    const processed = [];

    for (const page of pages) {
      processed.push(this.optimizePage(page));
    }

    const withFAQ = processed.filter(p => p.faq && p.faq.length > 0).length;
    log('SERP-FEATURES', `Processed ${processed.length} pages, ${withFAQ} with FAQ`);

    return processed;
  }
}

module.exports = { SERPFeaturesOptimizer };


