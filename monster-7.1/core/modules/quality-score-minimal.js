/**
 * MONSTER 7.1 — MINIMAL QUALITY SCORE
 * 
 * Минимальная система оценки качества для ядра.
 * Быстрые базовые проверки без сложной логики.
 */

class QualityScoreMinimal {
  constructor(config) {
    this.config = config;
  }

  async execute(params = {}) {
    try {
      const pages = params.pages || [];
      const results = [];

      for (const page of pages) {
        const score = this.calculateScore(page);
        results.push({
          page: page.slug || page.path,
          score,
          passed: score >= 0.7
        });
      }

      return {
        result: {
          scores: results,
          average: this.calculateAverage(results),
          passed: results.filter(r => r.passed).length,
          total: results.length
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`QualityScore failed: ${error.message}`);
    }
  }

  /**
   * Расчёт базового score
   */
  calculateScore(page) {
    let score = 0;

    // Проверка наличия основных элементов
    if (page.title) score += 0.2;
    if (page.h1) score += 0.2;
    if (page.metaDescription) score += 0.1;
    if (page.sections && page.sections.length >= 8) score += 0.3;
    if (page.wordCount && page.wordCount >= 3000) score += 0.2;

    return Math.min(score, 1.0);
  }

  /**
   * Расчёт среднего score
   */
  calculateAverage(results) {
    if (results.length === 0) return 0;
    
    const sum = results.reduce((acc, r) => acc + r.score, 0);
    return sum / results.length;
  }
}

module.exports = QualityScoreMinimal;











