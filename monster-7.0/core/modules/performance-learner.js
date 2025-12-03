/**
 * [I] BEST-PERFORMANCE LEARNING ENGINE
 * 
 * Обучение на лучших результатах.
 * Сравнение лучших/средних/худших страниц.
 */

const fs = require('fs');
const path = require('path');

class PerformanceLearner {
  constructor(config) {
    this.config = config;
    this.performancePath = path.join(process.cwd(), 'data/performance');
  }

  async execute(params = {}) {
    const { results } = params;

    // Проверка наличия результатов
    if (!results) {
      return {
        analysis: {
          best: [],
          average: [],
          worst: [],
          total: 0,
          stats: {
            bestPercent: 0,
            averagePercent: 0,
            worstPercent: 0,
            averageScore: 0,
            bestAverageScore: 0,
            worstAverageScore: 0
          }
        },
        bestPractices: [],
        comparison: {
          bestCount: 0,
          averageCount: 0,
          worstCount: 0,
          bestQuality: 0,
          worstQuality: 0
        },
        insights: []
      };
    }

    // Анализ результатов
    const analysis = await this.analyzePerformance(results);

    // Выделение лучших практик
    const bestPractices = this.extractBestPractices(analysis);

    // Сравнение
    const comparison = this.compareResults(analysis);

    // Выводы и предложения
    const insights = this.generateInsights(analysis, bestPractices, comparison);

    return {
      analysis,
      bestPractices,
      comparison,
      insights
    };
  }

  async analyzePerformance(results) {
    // Группировка по качеству
    const best = [];
    const average = [];
    const worst = [];

    const pages = this.extractPages(results);

    pages.forEach(page => {
      const score = this.calculatePageScore(page);
      page.qualityScore = score;
      
      if (score >= 0.8) {
        best.push(page);
      } else if (score >= 0.6) {
        average.push(page);
      } else {
        worst.push(page);
      }
    });

    // Статистика
    const stats = this.calculateStats(best, average, worst);

    return {
      best,
      average,
      worst,
      total: pages.length,
      stats
    };
  }

  extractPages(results) {
    const pages = [];
    
    if (!results) {
      return pages;
    }
    
    // Извлечение страниц из различных источников
    if (results.pages && Array.isArray(results.pages)) {
      pages.push(...results.pages);
    }
    
    // Извлечение из content generator результата
    if (results.content && results.content.result) {
      const contentResult = results.content.result;
      if (contentResult.pages && Array.isArray(contentResult.pages)) {
        pages.push(...contentResult.pages);
      }
    }
    
    // Извлечение из semantic map
    if (results.semanticMap) {
      const semanticMap = results.semanticMap.result || results.semanticMap;
      if (semanticMap && semanticMap.clusters && Array.isArray(semanticMap.clusters)) {
        semanticMap.clusters.forEach(cluster => {
          if (cluster.pages && Array.isArray(cluster.pages)) {
            cluster.pages.forEach(pagePath => {
              pages.push({
                path: pagePath,
                cluster: cluster.name,
                type: 'cluster'
              });
            });
          }
        });
      }
    }
    
    return pages;
  }

  calculatePageScore(page) {
    let score = 0.5; // Базовый score
    
    // Факторы качества
    if (page.qualityScore) {
      score = page.qualityScore;
    }
    
    if (page.length && page.length > 1000) {
      score += 0.1; // Бонус за длину
    }
    
    if (page.structure && page.structure.h1 && page.structure.h2) {
      score += 0.1; // Бонус за структуру
    }
    
    if (page.keywords && page.keywords.length > 0) {
      score += 0.1; // Бонус за ключевые слова
    }
    
    if (page.internalLinks && page.internalLinks.length > 0) {
      score += 0.1; // Бонус за внутренние ссылки
    }
    
    return Math.min(1.0, score);
  }

  calculateStats(best, average, worst) {
    const total = best.length + average.length + worst.length;
    
    return {
      bestPercent: total > 0 ? Math.round((best.length / total) * 100) : 0,
      averagePercent: total > 0 ? Math.round((average.length / total) * 100) : 0,
      worstPercent: total > 0 ? Math.round((worst.length / total) * 100) : 0,
      averageScore: this.calculateAverageScore(best, average, worst),
      bestAverageScore: this.calculateAverageScore(best),
      worstAverageScore: this.calculateAverageScore(worst)
    };
  }

  calculateAverageScore(...groups) {
    const allPages = groups.flat();
    if (allPages.length === 0) return 0;
    
    const sum = allPages.reduce((acc, page) => acc + (page.qualityScore || 0), 0);
    return sum / allPages.length;
  }

  extractBestPractices(analysis) {
    const practices = [];

    // Анализ лучших страниц
    analysis.best.forEach(page => {
      practices.push({
        pattern: page.pattern || 'unknown',
        quality: page.qualityScore,
        factors: page.factors || []
      });
    });

    return practices;
  }

  compareResults(analysis) {
    return {
      bestCount: analysis.best.length,
      averageCount: analysis.average.length,
      worstCount: analysis.worst.length,
      bestQuality: analysis.best.length > 0 
        ? analysis.best.reduce((sum, p) => sum + (p.qualityScore || 0), 0) / analysis.best.length 
        : 0,
      worstQuality: analysis.worst.length > 0
        ? analysis.worst.reduce((sum, p) => sum + (p.qualityScore || 0), 0) / analysis.worst.length
        : 0
    };
  }

  generateInsights(analysis, bestPractices, comparison) {
    const insights = [];

    // Выводы
    if (comparison.bestQuality > 0.8) {
      insights.push({
        type: 'success',
        message: 'High quality pages identified',
        action: 'apply-best-practices-everywhere'
      });
    }

    if (comparison.worstQuality < 0.6) {
      insights.push({
        type: 'warning',
        message: 'Low quality pages need improvement',
        action: 'regenerate-with-better-prompts'
      });
    }

    return insights;
  }
}

module.exports = PerformanceLearner;

