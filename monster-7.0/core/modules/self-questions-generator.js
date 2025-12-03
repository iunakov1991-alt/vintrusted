/**
 * SELF-QUESTIONS GENERATOR
 * 
 * Генерирует вопросы для Human Feedback Loop.
 * Анализирует результаты и задает вопросы человеку.
 */

class SelfQuestionsGenerator {
  constructor(config) {
    this.config = config;
  }

  /**
   * Генерация вопросов на основе результатов
   */
  async generateQuestions(results) {
    const questions = [];

    // Анализ результатов
    const analysis = this.analyzeResults(results);

    // Генерация вопросов на основе анализа
    if (analysis.quality < 0.7) {
      questions.push({
        type: 'quality',
        question: 'Quality score is below 0.7. Should we change the content strategy? Add more depth? Focus on different topics?',
        context: {
          currentScore: analysis.quality,
          targetScore: 0.8,
          suggestions: [
            'Increase content depth',
            'Focus on E-E-A-T',
            'Improve structure',
            'Add more examples'
          ]
        },
        priority: 'high'
      });
    }

    if (analysis.performance < 0.8) {
      questions.push({
        type: 'performance',
        question: 'Performance metrics are below target. Should we optimize page speed? Reduce content size? Change generation strategy?',
        context: {
          currentScore: analysis.performance,
          targetScore: 0.8,
          suggestions: [
            'Optimize images',
            'Reduce JavaScript',
            'Improve caching',
            'Streamline content'
          ]
        },
        priority: 'high'
      });
    }

    if (analysis.coverage < 0.6) {
      questions.push({
        type: 'coverage',
        question: 'Topic coverage is incomplete. Should we expand to more topics? Add more clusters? Focus on gaps?',
        context: {
          currentCoverage: analysis.coverage,
          targetCoverage: 0.8,
          suggestions: [
            'Expand topic clusters',
            'Add missing topics',
            'Fill content gaps',
            'Increase depth'
          ]
        },
        priority: 'medium'
      });
    }

    // Вопросы о стратегии
    if (results.strategy) {
      questions.push({
        type: 'strategy',
        question: 'Current strategy generated ' + (results.strategy.pages || 0) + ' pages. Should we adjust the target? Change priorities?',
        context: {
          currentPages: results.strategy.pages || 0,
          targetPages: 1000000,
          suggestions: [
            'Increase page count',
            'Focus on quality over quantity',
            'Adjust priorities',
            'Change cluster strategy'
          ]
        },
        priority: 'medium'
      });
    }

    // Вопросы о лучших результатах
    if (analysis.bestPages && analysis.bestPages.length > 0) {
      questions.push({
        type: 'best-practices',
        question: 'We identified ' + analysis.bestPages.length + ' high-performing pages. Should we apply these patterns everywhere? Make this the baseline strategy?',
        context: {
          bestPagesCount: analysis.bestPages.length,
          averageScore: analysis.bestPages.reduce((sum, p) => sum + (p.score || 0), 0) / analysis.bestPages.length,
          suggestions: [
            'Apply best patterns everywhere',
            'Make this the baseline',
            'Analyze what makes them successful',
            'Replicate the structure'
          ]
        },
        priority: 'high'
      });
    }

    return questions;
  }

  /**
   * Анализ результатов
   */
  analyzeResults(results) {
    const analysis = {
      quality: 0,
      performance: 0,
      coverage: 0,
      bestPages: [],
      worstPages: []
    };

    if (results.pages) {
      const scores = results.pages.map(p => p.qualityScore || 0).filter(s => s > 0);
      if (scores.length > 0) {
        analysis.quality = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      }

      // Лучшие страницы
      analysis.bestPages = results.pages
        .filter(p => (p.qualityScore || 0) >= 0.8)
        .sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0))
        .slice(0, 10);

      // Худшие страницы
      analysis.worstPages = results.pages
        .filter(p => (p.qualityScore || 0) < 0.6)
        .sort((a, b) => (a.qualityScore || 0) - (b.qualityScore || 0))
        .slice(0, 10);
    }

    if (results.performance) {
      analysis.performance = results.performance.score || 0;
    }

    if (results.coverage) {
      analysis.coverage = results.coverage.percent || 0;
    }

    return analysis;
  }

  /**
   * Генерация объяснений
   */
  generateExplanations(results) {
    const explanations = [];

    // Объяснение качества
    const qualityScore = this.extractQualityScore(results);
    if (qualityScore !== null) {
      explanations.push({
        type: 'quality',
        title: 'Quality Analysis',
        content: `Average quality score: ${qualityScore.toFixed(2)}. ` +
          (qualityScore >= 0.8 
            ? 'Excellent quality! Pages meet high standards.' 
            : qualityScore >= 0.6 
              ? 'Good quality, but there\'s room for improvement.' 
              : 'Quality needs improvement. Consider revising strategy.'),
        factors: [
          'Content depth',
          'E-E-A-T signals',
          'Structure and organization',
          'Keyword optimization'
        ]
      });
    }

    // Объяснение производительности
    const performanceScore = this.extractPerformanceScore(results);
    if (performanceScore !== null) {
      explanations.push({
        type: 'performance',
        title: 'Performance Analysis',
        content: `Performance score: ${performanceScore.toFixed(2)}. ` +
          (performanceScore >= 0.8 
            ? 'Great performance! Pages load quickly.' 
            : 'Performance could be better. Consider optimization.'),
        factors: [
          'Page load time',
          'Core Web Vitals',
          'Resource optimization',
          'Caching efficiency'
        ]
      });
    }

    // Объяснение стратегии
    if (results.strategy) {
      explanations.push({
        type: 'strategy',
        title: 'Strategy Overview',
        content: `Generated ${results.strategy.pages || 0} pages across ${results.strategy.clusters?.length || 0} clusters. ` +
          'Strategy focuses on high-priority topics and fills content gaps.',
        factors: [
          'Topic coverage',
          'Cluster distribution',
          'Priority alignment',
          'Gap filling'
        ]
      });
    }

    return explanations;
  }

  /**
   * Извлечение score качества из результатов
   */
  extractQualityScore(results) {
    if (!results) return null;
    
    // Прямое значение
    if (typeof results.quality === 'number') {
      return results.quality;
    }
    
    // Из performance learner
    if (results.performance && results.performance.result) {
      const perf = results.performance.result;
      if (perf.comparison && typeof perf.comparison.bestQuality === 'number') {
        return perf.comparison.bestQuality;
      }
      if (perf.analysis && typeof perf.analysis.stats?.averageScore === 'number') {
        return perf.analysis.stats.averageScore;
      }
    }
    
    // Из content generator
    if (results.content && results.content.result) {
      const content = results.content.result;
      if (content.pages && content.pages.length > 0) {
        const scores = content.pages.map(p => p.qualityScore || 0).filter(s => s > 0);
        if (scores.length > 0) {
          return scores.reduce((a, b) => a + b, 0) / scores.length;
        }
      }
    }
    
    return null;
  }

  /**
   * Извлечение score производительности из результатов
   */
  extractPerformanceScore(results) {
    if (!results) return null;
    
    // Прямое значение
    if (typeof results.performance === 'number') {
      return results.performance;
    }
    
    // Из evolution engine
    if (results.evolution && results.evolution.result) {
      const evolution = results.evolution.result;
      if (evolution.analysis && typeof evolution.analysis.performance === 'number') {
        return evolution.analysis.performance;
      }
    }
    
    // Дефолтное значение на основе успешности
    if (results.content && results.content.result) {
      const content = results.content.result;
      const stats = content.stats || {};
      const total = (stats.generated || 0) + (stats.errors || 0);
      if (total > 0) {
        return (stats.generated || 0) / total;
      }
    }
    
    return null;
  }
}

module.exports = SelfQuestionsGenerator;

