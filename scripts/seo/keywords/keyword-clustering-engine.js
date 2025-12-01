const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Keyword Clustering & Topic Modeling
 * Автоматическая группировка ключевых слов и построение topic clusters
 */
class KeywordClusteringEngine {
  constructor(config) {
    this.config = config;
    this.clusters = new Map(); // clusterId -> keywords
    this.topicModel = new Map(); // topic -> keywords
  }

  /**
   * Кластеризация ключевых слов
   */
  clusterKeywords(keywords) {
    const clusters = new Map();
    const processed = new Set();

    for (const keyword of keywords) {
      if (processed.has(keyword)) continue;

      const cluster = this.findOrCreateCluster(keyword, keywords, clusters);
      cluster.keywords.push(keyword);
      processed.add(keyword);
    }

    log('KEYWORD-CLUSTERING', `Created ${clusters.size} clusters from ${keywords.length} keywords`);
    return Array.from(clusters.values());
  }

  /**
   * Поиск или создание кластера
   */
  findOrCreateCluster(keyword, allKeywords, clusters) {
    // Ищем похожий кластер
    for (const [clusterId, cluster] of clusters.entries()) {
      if (this.isSimilar(keyword, cluster.keywords[0])) {
        return cluster;
      }
    }

    // Создаем новый кластер
    const clusterId = `cluster-${clusters.size + 1}`;
    const cluster = {
      id: clusterId,
      keywords: [],
      topic: this.extractTopic(keyword),
      primaryKeyword: keyword
    };
    clusters.set(clusterId, cluster);
    return cluster;
  }

  /**
   * Проверка похожести ключевых слов
   */
  isSimilar(keyword1, keyword2) {
    const words1 = keyword1.toLowerCase().split(/\s+/);
    const words2 = keyword2.toLowerCase().split(/\s+/);

    // Вычисляем Jaccard similarity
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    const similarity = intersection.size / union.size;
    return similarity > 0.5; // 50% похожести
  }

  /**
   * Извлечение темы из ключевого слова
   */
  extractTopic(keyword) {
    const lower = keyword.toLowerCase();
    
    // Определяем тему на основе ключевых слов
    if (lower.includes('vin') || lower.includes('vehicle identification')) {
      return 'vin-check';
    }
    if (lower.includes('accident') || lower.includes('crash')) {
      return 'accident-history';
    }
    if (lower.includes('title') || lower.includes('ownership')) {
      return 'title-records';
    }
    if (lower.includes('recall') || lower.includes('safety')) {
      return 'recall-information';
    }
    if (lower.includes('fraud') || lower.includes('scam')) {
      return 'fraud-prevention';
    }

    return 'general';
  }

  /**
   * Построение topic clusters
   */
  buildTopicClusters(pages) {
    const topicClusters = new Map();

    for (const page of pages) {
      const topic = this.extractTopic(page.primaryKeyword || page.url);
      
      if (!topicClusters.has(topic)) {
        topicClusters.set(topic, {
          topic,
          pages: [],
          keywords: new Set(),
          avgQuality: 0,
          totalTraffic: 0
        });
      }

      const cluster = topicClusters.get(topic);
      cluster.pages.push(page);
      if (page.primaryKeyword) {
        cluster.keywords.add(page.primaryKeyword);
      }

      // Обновляем метрики
      cluster.avgQuality = (cluster.avgQuality * (cluster.pages.length - 1) + (page.qualityScore || 0)) / cluster.pages.length;
      cluster.totalTraffic += page.metrics?.traffic || 0;
    }

    log('KEYWORD-CLUSTERING', `Built ${topicClusters.size} topic clusters`);
    return Array.from(topicClusters.values());
  }

  /**
   * Получение рекомендаций по кластерам
   */
  getClusterRecommendations(clusters) {
    const recommendations = [];

    for (const cluster of clusters) {
      if (cluster.pages.length < 5) {
        recommendations.push({
          type: 'cluster-expansion',
          topic: cluster.topic,
          message: `Topic cluster "${cluster.topic}" has only ${cluster.pages.length} pages`,
          action: 'Consider expanding content for this topic'
        });
      }

      if (cluster.avgQuality < 0.7) {
        recommendations.push({
          type: 'cluster-quality',
          topic: cluster.topic,
          message: `Topic cluster "${cluster.topic}" has low average quality (${cluster.avgQuality.toFixed(2)})`,
          action: 'Improve content quality for this topic'
        });
      }
    }

    return recommendations;
  }
}

module.exports = { KeywordClusteringEngine };


