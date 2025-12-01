const { log } = require('../logger');
const { getErrorHandler } = require('../utils/error-handler');

/**
 * SEO MONSTER 6.0: Predictive Maintenance
 * Предсказательное обслуживание (ТРИЗ оптимизация)
 */
class PredictiveMaintenance {
  constructor(config) {
    this.config = config;
    this.errorHandler = getErrorHandler();
    this.predictions = [];
    this.maxPredictions = 100;
  }

  /**
   * Анализ и предсказание проблем
   */
  predictIssues(metrics = {}, history = []) {
    const predictions = [];

    // Анализ трендов
    const trends = this.analyzeTrends(history);
    
    // Предсказание на основе трендов
    if (trends.qualityDeclining) {
      predictions.push({
        type: 'quality_decline',
        severity: 'medium',
        probability: trends.qualityDecliningRate,
        message: 'Quality score is declining, may need content review',
        action: 'review_content_quality',
        estimatedTime: '1-2 builds'
      });
    }

    if (trends.errorRateIncreasing) {
      predictions.push({
        type: 'error_rate_increase',
        severity: 'high',
        probability: trends.errorRateIncreaseRate,
        message: 'Error rate is increasing, may need system review',
        action: 'review_error_patterns',
        estimatedTime: 'immediate'
      });
    }

    if (trends.buildTimeIncreasing) {
      predictions.push({
        type: 'performance_degradation',
        severity: 'low',
        probability: trends.buildTimeIncreaseRate,
        message: 'Build time is increasing, may need optimization',
        action: 'optimize_build_process',
        estimatedTime: 'next build'
      });
    }

    // Анализ ресурсов
    const resourceIssues = this.predictResourceIssues(metrics);
    predictions.push(...resourceIssues);

    // Сохраняем предсказания
    this.predictions = predictions.slice(0, this.maxPredictions);

    if (predictions.length > 0) {
      log('PREDICTIVE-MAINT', `Generated ${predictions.length} predictions`);
    }

    return {
      predictions,
      trends,
      recommendations: this.generateMaintenanceRecommendations(predictions)
    };
  }

  /**
   * Анализ трендов
   */
  analyzeTrends(history) {
    if (history.length < 3) {
      return {
        qualityDeclining: false,
        errorRateIncreasing: false,
        buildTimeIncreasing: false
      };
    }

    const recent = history.slice(-5);
    const older = history.slice(-10, -5);

    if (recent.length === 0 || older.length === 0) {
      return {
        qualityDeclining: false,
        errorRateIncreasing: false,
        buildTimeIncreasing: false
      };
    }

    // Анализ качества
    const recentAvgQuality = recent.reduce((sum, h) => sum + (h.avgQuality || 0), 0) / recent.length;
    const olderAvgQuality = older.reduce((sum, h) => sum + (h.avgQuality || 0), 0) / older.length;
    const qualityDeclining = recentAvgQuality < olderAvgQuality * 0.95;
    const qualityDecliningRate = qualityDeclining 
      ? (olderAvgQuality - recentAvgQuality) / olderAvgQuality 
      : 0;

    // Анализ ошибок
    const recentErrorRate = recent.reduce((sum, h) => sum + (h.errors || 0), 0) / recent.length;
    const olderErrorRate = older.reduce((sum, h) => sum + (h.errors || 0), 0) / older.length;
    const errorRateIncreasing = recentErrorRate > olderErrorRate * 1.2;
    const errorRateIncreaseRate = errorRateIncreasing 
      ? (recentErrorRate - olderErrorRate) / olderErrorRate 
      : 0;

    // Анализ времени билда
    const recentAvgTime = recent.reduce((sum, h) => sum + (h.duration || 0), 0) / recent.length;
    const olderAvgTime = older.reduce((sum, h) => sum + (h.duration || 0), 0) / older.length;
    const buildTimeIncreasing = recentAvgTime > olderAvgTime * 1.1;
    const buildTimeIncreaseRate = buildTimeIncreasing 
      ? (recentAvgTime - olderAvgTime) / olderAvgTime 
      : 0;

    return {
      qualityDeclining,
      qualityDecliningRate,
      errorRateIncreasing,
      errorRateIncreaseRate,
      buildTimeIncreasing,
      buildTimeIncreaseRate
    };
  }

  /**
   * Предсказание проблем с ресурсами
   */
  predictResourceIssues(metrics = {}) {
    const predictions = [];

    // Предсказание исчерпания Groq лимитов
    if (metrics.groqUsage && metrics.groqLimit) {
      const usageRate = metrics.groqUsage / metrics.groqLimit;
      if (usageRate > 0.8) {
        predictions.push({
          type: 'resource_limit',
          severity: 'high',
          probability: usageRate,
          message: `Groq usage at ${(usageRate * 100).toFixed(1)}%, may hit limit soon`,
          action: 'reduce_groq_usage',
          estimatedTime: 'next build'
        });
      }
    }

    // Предсказание проблем с дисковым пространством
    if (metrics.diskUsage && metrics.diskLimit) {
      const usageRate = metrics.diskUsage / metrics.diskLimit;
      if (usageRate > 0.9) {
        predictions.push({
          type: 'disk_space',
          severity: 'critical',
          probability: usageRate,
          message: `Disk usage at ${(usageRate * 100).toFixed(1)}%, cleanup needed`,
          action: 'cleanup_old_files',
          estimatedTime: 'immediate'
        });
      }
    }

    return predictions;
  }

  /**
   * Генерация рекомендаций по обслуживанию
   */
  generateMaintenanceRecommendations(predictions) {
    const recommendations = [];

    const critical = predictions.filter(p => p.severity === 'critical');
    const high = predictions.filter(p => p.severity === 'high');
    const medium = predictions.filter(p => p.severity === 'medium');

    if (critical.length > 0) {
      recommendations.push({
        priority: 'critical',
        actions: critical.map(p => p.action),
        message: `${critical.length} critical issues require immediate attention`
      });
    }

    if (high.length > 0) {
      recommendations.push({
        priority: 'high',
        actions: high.map(p => p.action),
        message: `${high.length} high-priority issues should be addressed soon`
      });
    }

    if (medium.length > 0) {
      recommendations.push({
        priority: 'medium',
        actions: medium.map(p => p.action),
        message: `${medium.length} medium-priority issues can be addressed when convenient`
      });
    }

    return recommendations;
  }
}

module.exports = { PredictiveMaintenance };


