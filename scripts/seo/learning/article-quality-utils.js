const { log } = require('../logger');

/**
 * УТИЛИТЫ ДЛЯ АНАЛИЗА КАЧЕСТВА СТАТЕЙ
 * 
 * Централизованные методы для избежания дублирования
 */
class ArticleQualityUtils {
  /**
   * Подсчет слов в тексте
   * Унифицированный метод для всех модулей
   */
  static countWords(text) {
    if (!text || typeof text !== 'string') return 0;
    // Используем split для консистентности с другими модулями
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  }

  /**
   * Нормализация заголовка H2 для сравнения
   * Убирает префикс ##, точку в конце, приводит к нижнему регистру
   */
  static normalizeH2Heading(heading) {
    if (!heading || typeof heading !== 'string') return '';
    return heading.replace(/^##\s+/, '').replace(/\.$/, '').toLowerCase().trim();
  }

  /**
   * Проверка структуры контента
   */
  static hasGoodStructure(content) {
    if (!content || typeof content !== 'string') return false;
    
    const hasHeadings = /#{1,3}\s+.+/.test(content) || /<h[1-3]/.test(content);
    const hasLists = /[-*]\s+/.test(content) || /<[uo]l/.test(content);
    const hasParagraphs = content.split('\n\n').length > 5;
    
    return hasHeadings && hasLists && hasParagraphs;
  }

  /**
   * Проверка экспертного тона
   */
  static hasExpertTone(content) {
    if (!content || typeof content !== 'string') return false;
    
    const expertTerms = [
      'analysis', 'evaluate', 'assess', 'recommend', 'consider', 
      'expert', 'professional', 'technical', 'comprehensive', 
      'detailed', 'systematic', 'methodology'
    ];
    
    const lowerContent = content.toLowerCase();
    return expertTerms.some(term => lowerContent.includes(term));
  }

  /**
   * Проверка практических советов
   */
  static hasActionableAdvice(content) {
    if (!content || typeof content !== 'string') return false;
    
    const actionTerms = [
      'check', 'verify', 'inspect', 'review', 'ensure', 
      'should', 'must', 'recommend', 'suggest', 'consider',
      'action', 'step', 'guide', 'process'
    ];
    
    const lowerContent = content.toLowerCase();
    return actionTerms.some(term => lowerContent.includes(term));
  }

  /**
   * Проверка покрытия семантических тиров
   */
  static coversSemanticTiers(content) {
    if (!content || typeof content !== 'string') return false;
    
    const tier1Terms = [
      'vin', 'accident', 'ownership', 'title', 'fraud',
      'history', 'report', 'vehicle', 'check', 'verification'
    ];
    
    const lowerContent = content.toLowerCase();
    const foundTerms = tier1Terms.filter(term => lowerContent.includes(term));
    
    return foundTerms.length >= 3;
  }

  /**
   * Базовый расчет качества (fallback метод)
   * Используется только если оптимизированный анализатор недоступен
   */
  static calculateBasicQualityScore(content) {
    if (!content || typeof content !== 'string') return 0.2;
    
    let score = 0.2; // Базовый score
    
    // Длина контента (0-0.25)
    const wordCount = this.countWords(content);
    if (wordCount > 2000) score += 0.25;
    else if (wordCount > 1500) score += 0.2;
    else if (wordCount > 1000) score += 0.15;
    else if (wordCount > 500) score += 0.1;
    else score += 0.05;
    
    // Структура (0-0.2)
    if (this.hasGoodStructure(content)) score += 0.2;
    else score += 0.1;
    
    // Экспертный тон (0-0.15)
    const expertScore = this.hasExpertTone(content) ? 0.15 : 0.05;
    score += expertScore;
    
    // Практические советы (0-0.15)
    const actionableScore = this.hasActionableAdvice(content) ? 0.15 : 0.05;
    score += actionableScore;
    
    // Семантическое покрытие (0-0.1)
    if (this.coversSemanticTiers(content)) score += 0.1;
    else score += 0.05;
    
    // Детализация (0-0.05)
    const hasDetails = content.includes('specific') || 
                      content.includes('detailed') || 
                      content.includes('comprehensive');
    if (hasDetails) score += 0.05;
    
    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * Генерация базовых улучшений (fallback)
   */
  static suggestBasicImprovements(analysis) {
    const improvements = [];
    
    if (analysis.wordCount < 1000) {
      improvements.push('Increase content length to 1500+ words');
    }
    if (!analysis.hasStructure) {
      improvements.push('Add better structure with headings and lists');
    }
    if (!analysis.hasExpertTone) {
      improvements.push('Use more expert terminology and analytical language');
    }
    if (!analysis.hasActionableAdvice) {
      improvements.push('Add more actionable checklists and recommendations');
    }
    if (!analysis.coversSemanticTiers) {
      improvements.push('Cover more semantic Tier 1 themes');
    }
    
    return improvements.length > 0 ? improvements : ['Maintain current quality standards'];
  }
}

module.exports = { ArticleQualityUtils };

