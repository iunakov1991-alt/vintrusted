const fs = require('fs');
const path = require('path');
const { log } = require('../logger');
const { BuildHistory } = require('./build-history');

/**
 * SEO MONSTER 6.0: Dashboard
 * Генерация данных для дашборда
 */
class Dashboard {
  constructor(config) {
    this.config = config;
    this.buildHistory = new BuildHistory(config);
    this.dashboardPath = path.join(process.cwd(), 'public/internal/seo-dashboard.json');
  }

  /**
   * Генерация данных дашборда
   */
  generateDashboardData(buildData = {}) {
    const history = this.buildHistory.getHistory(100);
    const stats = this.buildHistory.getStatistics(30);
    const lastBuild = this.buildHistory.getLastBuild();
    const comparison = lastBuild ? this.buildHistory.compareWithPrevious(buildData) : null;

    const dashboard = {
      timestamp: new Date().toISOString(),
      currentBuild: buildData,
      lastBuild: lastBuild,
      comparison: comparison,
      statistics: stats,
      recentBuilds: history.slice(0, 10),
      trends: this.calculateTrends(history),
      health: this.calculateHealth(stats, history),
      recommendations: this.generateRecommendations(stats, buildData)
    };

    return dashboard;
  }

  /**
   * Расчет трендов
   */
  calculateTrends(history) {
    if (history.length < 2) return null;

    const recent = history.slice(-10);
    const older = history.slice(-20, -10);

    if (older.length === 0) return null;

    const recentAvg = {
      pagesGenerated: recent.reduce((sum, r) => sum + (r.pagesGenerated || 0), 0) / recent.length,
      pagesAccepted: recent.reduce((sum, r) => sum + (r.pagesAccepted || 0), 0) / recent.length,
      avgQuality: recent.reduce((sum, r) => sum + (r.avgQuality || 0), 0) / recent.length
    };

    const olderAvg = {
      pagesGenerated: older.reduce((sum, r) => sum + (r.pagesGenerated || 0), 0) / older.length,
      pagesAccepted: older.reduce((sum, r) => sum + (r.pagesAccepted || 0), 0) / older.length,
      avgQuality: older.reduce((sum, r) => sum + (r.avgQuality || 0), 0) / older.length
    };

    return {
      pagesGenerated: {
        trend: recentAvg.pagesGenerated > olderAvg.pagesGenerated ? 'up' : 'down',
        change: ((recentAvg.pagesGenerated - olderAvg.pagesGenerated) / olderAvg.pagesGenerated) * 100
      },
      pagesAccepted: {
        trend: recentAvg.pagesAccepted > olderAvg.pagesAccepted ? 'up' : 'down',
        change: ((recentAvg.pagesAccepted - olderAvg.pagesAccepted) / olderAvg.pagesAccepted) * 100
      },
      avgQuality: {
        trend: recentAvg.avgQuality > olderAvg.avgQuality ? 'up' : 'down',
        change: ((recentAvg.avgQuality - olderAvg.avgQuality) / olderAvg.avgQuality) * 100
      }
    };
  }

  /**
   * Расчет здоровья системы
   */
  calculateHealth(stats, history) {
    const health = {
      score: 100,
      issues: []
    };

    // Проверка успешности билдов
    if (stats.successRate < 0.8) {
      health.score -= 20;
      health.issues.push('Low build success rate');
    }

    // Проверка качества страниц
    if (stats.avgQuality < 0.7) {
      health.score -= 15;
      health.issues.push('Low average quality score');
    }

    // Проверка количества принятых страниц
    if (stats.avgPagesAccepted < stats.avgPagesGenerated * 0.8) {
      health.score -= 10;
      health.issues.push('Low acceptance rate');
    }

    // Проверка стабильности
    if (history.length >= 5) {
      const recent = history.slice(-5);
      const durations = recent.map(r => r.duration || 0);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const variance = durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / durations.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev > avgDuration * 0.5) {
        health.score -= 10;
        health.issues.push('Unstable build durations');
      }
    }

    health.score = Math.max(0, health.score);
    health.status = health.score >= 80 ? 'healthy' : health.score >= 60 ? 'warning' : 'critical';

    return health;
  }

  /**
   * Генерация рекомендаций
   */
  generateRecommendations(stats, buildData) {
    const recommendations = [];

    if (stats.avgQuality < 0.75) {
      recommendations.push({
        type: 'quality',
        priority: 'high',
        message: 'Average quality score is below threshold. Consider adjusting content generation parameters.'
      });
    }

    if (stats.successRate < 0.9) {
      recommendations.push({
        type: 'reliability',
        priority: 'medium',
        message: 'Build success rate could be improved. Check for common failure patterns.'
      });
    }

    if (buildData.pagesAccepted && buildData.pagesGenerated) {
      const acceptanceRate = buildData.pagesAccepted / buildData.pagesGenerated;
      if (acceptanceRate < 0.8) {
        recommendations.push({
          type: 'acceptance',
          priority: 'medium',
          message: 'Low page acceptance rate. Review quality scoring criteria.'
        });
      }
    }

    if (stats.avgDuration > 300000) { // 5 минут
      recommendations.push({
        type: 'performance',
        priority: 'low',
        message: 'Build duration is high. Consider optimizing concurrency or reducing target pages.'
      });
    }

    return recommendations;
  }

  /**
   * Сохранение данных дашборда
   */
  saveDashboard(dashboard) {
    try {
      const dir = path.dirname(this.dashboardPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.dashboardPath, JSON.stringify(dashboard, null, 2), 'utf8');
      log('DASHBOARD', `Dashboard saved: ${this.dashboardPath}`);
    } catch (e) {
      log('DASHBOARD', `Error saving dashboard: ${e.message}`);
    }
  }
}

module.exports = { Dashboard };

