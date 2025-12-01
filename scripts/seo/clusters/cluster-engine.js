const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Cluster Engine
 * Кластеризация страниц по типам и управление кластерами
 */
class ClusterEngine {
  constructor() {
    this.clusters = new Map();
  }

  /**
   * Построить ID кластера
   */
  buildClusterId({ type, stateSlug, makeSlug, intent }) {
    return `${type}_${stateSlug}_${makeSlug}_${intent}`;
  }

  /**
   * Регистрация страницы в кластере
   */
  registerPage(page) {
    const clusterId = page.clusterId || this.buildClusterId({
      type: 'vin',
      stateSlug: page.stateSlug,
      makeSlug: page.make,
      intent: page.intent
    });

    if (!this.clusters.has(clusterId)) {
      this.clusters.set(clusterId, {
        id: clusterId,
        pages: [],
        metrics: {
          totalPages: 0,
          avgQuality: 0,
          totalTraffic: 0,
          avgCTR: 0
        }
      });
    }

    const cluster = this.clusters.get(clusterId);
    cluster.pages.push(page);
    cluster.metrics.totalPages = cluster.pages.length;

    return clusterId;
  }

  /**
   * Обновление метрик кластера
   */
  updateClusterMetrics(clusterId, metrics) {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) return;

    cluster.metrics = {
      ...cluster.metrics,
      ...metrics
    };

    // Пересчет avgQuality
    if (cluster.pages && Array.isArray(cluster.pages) && cluster.pages.length > 0) {
      const totalQuality = cluster.pages.reduce((sum, p) => sum + (p.qualityScore || 0), 0);
      cluster.metrics.avgQuality = totalQuality / cluster.pages.length;
    }
  }

  /**
   * Получить все кластеры
   */
  getAllClusters() {
    return Array.from(this.clusters.values());
  }

  /**
   * Получить кластер по ID
   */
  getCluster(clusterId) {
    return this.clusters.get(clusterId);
  }

  /**
   * Вычисление priority score для кластера
   */
  computePriorityScore(cluster) {
    const metrics = cluster.metrics;
    
    // Базовая формула приоритета
    const qualityWeight = metrics.avgQuality || 0.5;
    const trafficWeight = Math.min(metrics.totalTraffic || 0, 1000) / 1000;
    const ctrWeight = Math.min(metrics.avgCTR || 0, 0.1) / 0.1;
    
    const priority = qualityWeight * 0.5 + trafficWeight * 0.3 + ctrWeight * 0.2;
    
    return Math.max(0, Math.min(1, priority));
  }
}

module.exports = { ClusterEngine };

