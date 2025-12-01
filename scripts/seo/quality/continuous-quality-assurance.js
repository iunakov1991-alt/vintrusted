const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Continuous Quality Assurance
 * Непрерывная проверка качества (ТРИЗ приоритет #8)
 */
class ContinuousQualityAssurance {
  constructor(config) {
    this.config = config;
    this.qualityChecks = [];
    this.qualityHistory = [];
    this.maxHistorySize = 200;
    this.thresholds = {
      minQuality: config.minQualityScore || 0.7,
      minAcceptanceRate: 0.8, // 80% страниц должны проходить проверку
      maxDegradationRate: 0.1 // Качество не должно падать более чем на 10%
    };
  }

  /**
   * Регистрация проверки качества
   */
  registerCheck(check) {
    this.qualityChecks.push({
      ...check,
      enabled: check.enabled !== false,
      lastRun: null,
      runCount: 0,
      passCount: 0,
      failCount: 0
    });
    log('CQA', `Registered quality check: ${check.name}`);
  }

  /**
   * Выполнение всех проверок
   */
  async runChecks(pages, context = {}) {
    const results = [];

    for (const check of this.qualityChecks) {
      if (!check.enabled) {
        continue;
      }

      try {
        const result = await this.executeCheck(check, pages, context);
        results.push(result);
        
        check.lastRun = Date.now();
        check.runCount++;
        
        if (result.passed) {
          check.passCount++;
        } else {
          check.failCount++;
        }
      } catch (e) {
        log('CQA', `Error executing check ${check.name}: ${e.message}`);
        results.push({
          check: check.name,
          passed: false,
          error: e.message
        });
      }
    }

    // Сохраняем историю
    const summary = this.summarizeResults(results);
    this.qualityHistory.push({
      timestamp: Date.now(),
      results,
      summary,
      context
    });

    if (this.qualityHistory.length > this.maxHistorySize) {
      this.qualityHistory = this.qualityHistory.slice(-this.maxHistorySize);
    }

    log('CQA', `Quality checks completed: ${summary.passed}/${summary.total} passed`);

    return {
      results,
      summary,
      shouldProceed: summary.passed >= summary.total * this.thresholds.minAcceptanceRate
    };
  }

  /**
   * Выполнение конкретной проверки
   */
  async executeCheck(check, pages, context) {
    switch (check.type) {
      case 'min_quality':
        return this.checkMinQuality(check, pages);
      
      case 'quality_distribution':
        return this.checkQualityDistribution(check, pages);
      
      case 'content_completeness':
        return this.checkContentCompleteness(check, pages);
      
      case 'seo_requirements':
        return this.checkSEORequirements(check, pages);
      
      case 'technical_quality':
        return this.checkTechnicalQuality(check, pages);
      
      case 'quality_trend':
        return this.checkQualityTrend(check);
      
      default:
        return {
          check: check.name,
          passed: false,
          error: `Unknown check type: ${check.type}`
        };
    }
  }

  /**
   * Проверка минимального качества
   */
  checkMinQuality(check, pages) {
    const { threshold = this.thresholds.minQuality } = check;
    const belowThreshold = pages.filter(p => (p.qualityScore || 0) < threshold);
    const passRate = 1 - (belowThreshold.length / pages.length);

    return {
      check: check.name,
      type: 'min_quality',
      passed: passRate >= 0.8, // 80% должны быть выше порога
      passRate,
      belowThreshold: belowThreshold.length,
      threshold
    };
  }

  /**
   * Проверка распределения качества
   */
  checkQualityDistribution(check, pages) {
    if (pages.length === 0) {
      return {
        check: check.name,
        passed: false,
        error: 'No pages to check'
      };
    }

    const scores = pages.map(p => p.qualityScore || 0);
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const stdDev = this.calculateStdDev(scores);

    // Проверяем, что распределение не слишком широкое
    const passed = stdDev < 0.2 && avg >= this.thresholds.minQuality;

    return {
      check: check.name,
      type: 'quality_distribution',
      passed,
      avg,
      min,
      max,
      stdDev
    };
  }

  /**
   * Проверка полноты контента
   */
  checkContentCompleteness(check, pages) {
    const incomplete = pages.filter(p => {
      const hasTitle = !!p.title;
      const hasDescription = !!p.description;
      const hasH1 = !!p.h1;
      const hasContent = !!(p.aiText || p.baseline);
      return !(hasTitle && hasDescription && hasH1 && hasContent);
    });

    const passRate = 1 - (incomplete.length / pages.length);

    return {
      check: check.name,
      type: 'content_completeness',
      passed: passRate >= 0.95, // 95% должны быть полными
      passRate,
      incomplete: incomplete.length
    };
  }

  /**
   * Проверка SEO требований
   */
  checkSEORequirements(check, pages) {
    const violations = pages.filter(p => {
      const titleLength = (p.title || '').length;
      const descLength = (p.description || '').length;
      const h1Length = (p.h1 || '').length;
      
      return titleLength < 30 || titleLength > 60 ||
             descLength < 120 || descLength > 160 ||
             h1Length < 20 || h1Length > 100;
    });

    const passRate = 1 - (violations.length / pages.length);

    return {
      check: check.name,
      type: 'seo_requirements',
      passed: passRate >= 0.9, // 90% должны соответствовать
      passRate,
      violations: violations.length
    };
  }

  /**
   * Проверка технического качества
   */
  checkTechnicalQuality(check, pages) {
    const issues = pages.filter(p => {
      // Проверяем наличие обязательных полей
      return !p.url || !p.layout || !p.blocks || p.blocks.length === 0;
    });

    const passRate = 1 - (issues.length / pages.length);

    return {
      check: check.name,
      type: 'technical_quality',
      passed: passRate >= 0.95, // 95% должны быть технически корректными
      passRate,
      issues: issues.length
    };
  }

  /**
   * Проверка тренда качества
   */
  checkQualityTrend(check) {
    if (this.qualityHistory.length < 3) {
      return {
        check: check.name,
        passed: true,
        reason: 'Insufficient history'
      };
    }

    const recent = this.qualityHistory.slice(-5);
    const older = this.qualityHistory.slice(-10, -5);

    if (older.length === 0) {
      return {
        check: check.name,
        passed: true,
        reason: 'Insufficient history'
      };
    }

    const recentAvg = recent.reduce((sum, h) => sum + (h.summary.avgQuality || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, h) => sum + (h.summary.avgQuality || 0), 0) / older.length;

    const degradation = (olderAvg - recentAvg) / olderAvg;
    const passed = degradation <= this.thresholds.maxDegradationRate;

    return {
      check: check.name,
      type: 'quality_trend',
      passed,
      recentAvg,
      olderAvg,
      degradation,
      trend: degradation > 0 ? 'declining' : 'improving'
    };
  }

  /**
   * Суммаризация результатов
   */
  summarizeResults(results) {
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const avgQuality = results
      .filter(r => r.avg !== undefined)
      .reduce((sum, r) => sum + (r.avg || 0), 0) / results.length || 0;

    return {
      passed,
      total,
      passRate: total > 0 ? passed / total : 0,
      avgQuality
    };
  }

  /**
   * Расчет стандартного отклонения
   */
  calculateStdDev(values) {
    if (values.length === 0) return 0;
    
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Инициализация проверок по умолчанию
   */
  initializeDefaultChecks() {
    this.registerCheck({
      name: 'min_quality_check',
      type: 'min_quality',
      threshold: this.thresholds.minQuality,
      enabled: true
    });

    this.registerCheck({
      name: 'quality_distribution_check',
      type: 'quality_distribution',
      enabled: true
    });

    this.registerCheck({
      name: 'content_completeness_check',
      type: 'content_completeness',
      enabled: true
    });

    this.registerCheck({
      name: 'seo_requirements_check',
      type: 'seo_requirements',
      enabled: true
    });

    this.registerCheck({
      name: 'technical_quality_check',
      type: 'technical_quality',
      enabled: true
    });

    this.registerCheck({
      name: 'quality_trend_check',
      type: 'quality_trend',
      enabled: true
    });

    log('CQA', 'Default quality checks initialized');
  }

  /**
   * Получение статистики
   */
  getStats() {
    return {
      checksCount: this.qualityChecks.length,
      enabledChecks: this.qualityChecks.filter(c => c.enabled).length,
      totalRuns: this.qualityHistory.length,
      recentPassRate: this.qualityHistory.length > 0
        ? this.qualityHistory.slice(-10).reduce((sum, h) => sum + (h.summary.passRate || 0), 0) / Math.min(10, this.qualityHistory.length)
        : 0,
      checks: this.qualityChecks.map(c => ({
        name: c.name,
        type: c.type,
        runCount: c.runCount,
        passRate: c.runCount > 0 ? c.passCount / c.runCount : 0
      }))
    };
  }
}

module.exports = { ContinuousQualityAssurance };


