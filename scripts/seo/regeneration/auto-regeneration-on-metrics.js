const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Auto-regeneration on Metrics Change
 * Автоматическая регенерация страниц при изменении метрик (GSC/GA)
 */
class AutoRegenerationOnMetrics {
  constructor(config) {
    this.config = config;
    this.metricsHistory = new Map(); // URL -> metrics history
    this.regenerationThresholds = {
      trafficDrop: 0.3, // 30% падение трафика
      qualityDrop: 0.1, // 10% падение качества
      ctrDrop: 0.2, // 20% падение CTR
      bounceRateIncrease: 0.2 // 20% увеличение bounce rate
    };
  }

  /**
   * Анализ метрик и определение страниц для регенерации
   */
  analyzeMetrics(pages) {
    const needsRegeneration = [];

    for (const page of pages) {
      const analysis = this.analyzePageMetrics(page);
      if (analysis.needsRegeneration) {
        needsRegeneration.push({
          page,
          reason: analysis.reason,
          severity: analysis.severity,
          metrics: analysis.metrics
        });
      }
    }

    // Сортируем по severity
    needsRegeneration.sort((a, b) => {
      const severityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

    log('AUTO-REGENERATION', `Found ${needsRegeneration.length} pages needing regeneration`);
    return needsRegeneration;
  }

  /**
   * Анализ метрик страницы
   */
  analyzePageMetrics(page) {
    const url = page.url;
    const currentMetrics = page.metrics || {};
    const history = this.metricsHistory.get(url) || [];

    if (history.length === 0) {
      // Сохраняем текущие метрики как baseline
      this.metricsHistory.set(url, [{
        timestamp: new Date().toISOString(),
        ...currentMetrics
      }]);
      return {
        needsRegeneration: false,
        reason: 'no-history'
      };
    }

    const baseline = history[0]; // Первая запись как baseline
    const changes = this.calculateChanges(baseline, currentMetrics);
    const needsRegeneration = this.shouldRegenerate(changes);

    // Сохраняем текущие метрики
    history.push({
      timestamp: new Date().toISOString(),
      ...currentMetrics
    });
    // Храним только последние 10 записей
    if (history.length > 10) {
      history.shift();
    }
    this.metricsHistory.set(url, history);

    return {
      needsRegeneration,
      reason: needsRegeneration ? this.getRegenerationReason(changes) : null,
      severity: needsRegeneration ? this.calculateSeverity(changes) : null,
      metrics: changes
    };
  }

  /**
   * Вычисление изменений
   */
  calculateChanges(baseline, current) {
    return {
      trafficChange: current.traffic && baseline.traffic 
        ? (current.traffic - baseline.traffic) / baseline.traffic 
        : 0,
      qualityChange: current.quality && baseline.quality
        ? current.quality - baseline.quality
        : 0,
      ctrChange: current.ctr && baseline.ctr
        ? (current.ctr - baseline.ctr) / baseline.ctr
        : 0,
      bounceRateChange: current.bounceRate && baseline.bounceRate
        ? (current.bounceRate - baseline.bounceRate) / baseline.bounceRate
        : 0
    };
  }

  /**
   * Определение необходимости регенерации
   */
  shouldRegenerate(changes) {
    const thresholds = this.regenerationThresholds;

    // Падение трафика
    if (changes.trafficChange < -thresholds.trafficDrop) {
      return true;
    }

    // Падение качества
    if (changes.qualityChange < -thresholds.qualityDrop) {
      return true;
    }

    // Падение CTR
    if (changes.ctrChange < -thresholds.ctrDrop) {
      return true;
    }

    // Увеличение bounce rate
    if (changes.bounceRateChange > thresholds.bounceRateIncrease) {
      return true;
    }

    return false;
  }

  /**
   * Причина регенерации
   */
  getRegenerationReason(changes) {
    const reasons = [];

    if (changes.trafficChange < -this.regenerationThresholds.trafficDrop) {
      reasons.push(`traffic-drop-${Math.abs(changes.trafficChange * 100).toFixed(0)}%`);
    }
    if (changes.qualityChange < -this.regenerationThresholds.qualityDrop) {
      reasons.push(`quality-drop-${Math.abs(changes.qualityChange * 100).toFixed(0)}%`);
    }
    if (changes.ctrChange < -this.regenerationThresholds.ctrDrop) {
      reasons.push(`ctr-drop-${Math.abs(changes.ctrChange * 100).toFixed(0)}%`);
    }
    if (changes.bounceRateChange > this.regenerationThresholds.bounceRateIncrease) {
      reasons.push(`bounce-rate-increase-${(changes.bounceRateChange * 100).toFixed(0)}%`);
    }

    return reasons.join(', ');
  }

  /**
   * Вычисление severity
   */
  calculateSeverity(changes) {
    let severityScore = 0;

    if (Math.abs(changes.trafficChange) > 0.5) severityScore += 3;
    else if (Math.abs(changes.trafficChange) > 0.3) severityScore += 2;
    else if (Math.abs(changes.trafficChange) > 0.1) severityScore += 1;

    if (Math.abs(changes.qualityChange) > 0.2) severityScore += 2;
    else if (Math.abs(changes.qualityChange) > 0.1) severityScore += 1;

    if (severityScore >= 4) return 'high';
    if (severityScore >= 2) return 'medium';
    return 'low';
  }

  /**
   * Получение статистики
   */
  getStats() {
    const totalPages = this.metricsHistory.size;
    let pagesWithHistory = 0;

    for (const [url, history] of this.metricsHistory.entries()) {
      if (history.length > 1) {
        pagesWithHistory++;
      }
    }

    return {
      totalPages,
      pagesWithHistory,
      avgHistoryLength: totalPages > 0 
        ? Array.from(this.metricsHistory.values()).reduce((sum, h) => sum + h.length, 0) / totalPages 
        : 0
    };
  }
}

module.exports = { AutoRegenerationOnMetrics };


