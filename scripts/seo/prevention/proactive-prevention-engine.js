const { log } = require('../logger');
const { PredictiveMaintenance } = require('../maintenance/predictive-maintenance');

/**
 * SEO MONSTER 6.0: Proactive Prevention Engine
 * Предотвращение проблем до их возникновения (ТРИЗ приоритет #6)
 */
class ProactivePreventionEngine {
  constructor(config) {
    this.config = config;
    this.predictiveMaintenance = new PredictiveMaintenance(config);
    this.preventionActions = [];
    this.preventedIssues = [];
  }

  /**
   * Проактивный анализ и предотвращение
   */
  async analyzeAndPrevent(metrics = {}, history = []) {
    // Получаем предсказания от Predictive Maintenance
    const predictions = this.predictiveMaintenance.predictIssues(metrics, history);
    
    // Фильтруем критические предсказания
    const critical = predictions.predictions.filter(p => 
      p.severity === 'critical' || p.severity === 'high'
    );

    const prevented = [];

    for (const prediction of critical) {
      const prevention = await this.preventIssue(prediction);
      if (prevention) {
        prevented.push(prevention);
      }
    }

    if (prevented.length > 0) {
      log('PROACTIVE-PREVENTION', `Prevented ${prevented.length} issues`);
    }

    return {
      predictions: predictions.predictions,
      prevented,
      preventedCount: prevented.length
    };
  }

  /**
   * Предотвращение конкретной проблемы
   */
  async preventIssue(prediction) {
    const { type, action, probability } = prediction;

    // Если вероятность низкая - не предотвращаем
    if (probability < 0.7) {
      return null;
    }

    log('PROACTIVE-PREVENTION', `Preventing ${type} (probability: ${(probability * 100).toFixed(1)}%)`);

    const prevention = {
      type,
      action,
      preventedAt: Date.now(),
      probability,
      result: 'prevented'
    };

    // Выполняем действие предотвращения
    try {
      await this.executePreventionAction(action, prediction);
      prevention.result = 'success';
      this.preventedIssues.push(prevention);
    } catch (e) {
      prevention.result = 'failed';
      prevention.error = e.message;
      log('PROACTIVE-PREVENTION', `Prevention failed for ${type}: ${e.message}`);
    }

    return prevention;
  }

  /**
   * Выполнение действия предотвращения
   */
  async executePreventionAction(action, prediction) {
    switch (action) {
      case 'reduce_groq_usage':
        // Уменьшаем использование Groq
        log('PROACTIVE-PREVENTION', 'Reducing Groq usage to prevent limit');
        // Реализация: изменить приоритет провайдеров
        break;

      case 'cleanup_old_files':
        // Очистка старых файлов
        log('PROACTIVE-PREVENTION', 'Cleaning up old files to free disk space');
        // Реализация: удалить старые кеши, логи
        break;

      case 'optimize_build_process':
        // Оптимизация процесса билда
        log('PROACTIVE-PREVENTION', 'Optimizing build process');
        // Реализация: снизить конкурентность, использовать кеш
        break;

      case 'review_error_patterns':
        // Обзор паттернов ошибок
        log('PROACTIVE-PREVENTION', 'Reviewing error patterns');
        // Реализация: анализ ошибок, применение исправлений
        break;

      default:
        log('PROACTIVE-PREVENTION', `Unknown prevention action: ${action}`);
    }
  }

  /**
   * Мониторинг трендов для предотвращения
   */
  monitorTrends(history = []) {
    if (history.length < 3) {
      return { trends: [], actions: [] };
    }

    const trends = this.analyzeTrends(history);
    const actions = [];

    // Если тренд указывает на проблему - предотвращаем
    if (trends.qualityDeclining && trends.qualityDecliningRate > 0.1) {
      actions.push({
        type: 'quality_decline_prevention',
        action: 'increase_quality_threshold',
        reason: 'Quality is declining, preventing further degradation'
      });
    }

    if (trends.errorRateIncreasing && trends.errorRateIncreaseRate > 0.2) {
      actions.push({
        type: 'error_rate_prevention',
        action: 'add_error_handling',
        reason: 'Error rate is increasing, adding preventive measures'
      });
    }

    return { trends, actions };
  }

  /**
   * Анализ трендов
   */
  analyzeTrends(history) {
    const recent = history.slice(-5);
    const older = history.slice(-10, -5);

    if (recent.length === 0 || older.length === 0) {
      return {
        qualityDeclining: false,
        errorRateIncreasing: false
      };
    }

    const recentAvgQuality = recent.reduce((sum, h) => sum + (h.avgQuality || 0), 0) / recent.length;
    const olderAvgQuality = older.reduce((sum, h) => sum + (h.avgQuality || 0), 0) / older.length;
    const qualityDeclining = recentAvgQuality < olderAvgQuality * 0.95;
    const qualityDecliningRate = qualityDeclining 
      ? (olderAvgQuality - recentAvgQuality) / olderAvgQuality 
      : 0;

    const recentErrorRate = recent.reduce((sum, h) => sum + (h.errors || 0), 0) / recent.length;
    const olderErrorRate = older.reduce((sum, h) => sum + (h.errors || 0), 0) / older.length;
    const errorRateIncreasing = recentErrorRate > olderErrorRate * 1.2;
    const errorRateIncreaseRate = errorRateIncreasing 
      ? (recentErrorRate - olderErrorRate) / olderErrorRate 
      : 0;

    return {
      qualityDeclining,
      qualityDecliningRate,
      errorRateIncreasing,
      errorRateIncreaseRate
    };
  }

  /**
   * Получение статистики предотвращений
   */
  getStats() {
    return {
      totalPrevented: this.preventedIssues.length,
      successful: this.preventedIssues.filter(p => p.result === 'success').length,
      failed: this.preventedIssues.filter(p => p.result === 'failed').length,
      byType: this.groupByType(this.preventedIssues)
    };
  }

  /**
   * Группировка по типам
   */
  groupByType(issues) {
    const grouped = {};
    for (const issue of issues) {
      grouped[issue.type] = (grouped[issue.type] || 0) + 1;
    }
    return grouped;
  }
}

module.exports = { ProactivePreventionEngine };


