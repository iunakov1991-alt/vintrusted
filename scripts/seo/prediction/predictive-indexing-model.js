const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Predictive Indexing Model
 * ML модель предсказывает вероятность индексации страницы
 */
class PredictiveIndexingModel {
  constructor(config) {
    this.config = config;
    this.model = {
      weights: {
        quality: 0.25,
        contentLength: 0.15,
        internalLinks: 0.10,
        externalLinks: 0.05,
        structuredData: 0.10,
        mobileFriendly: 0.15,
        coreWebVitals: 0.10,
        age: 0.05,
        sitemapPriority: 0.05
      },
      threshold: 0.6 // Минимальная вероятность для индексации
    };
    this.trainingData = [];
  }

  /**
   * Предсказание вероятности индексации
   */
  predict(page) {
    const features = this.extractFeatures(page);
    const probability = this.calculateProbability(features);
    
    return {
      probability,
      willBeIndexed: probability >= this.model.threshold,
      features,
      confidence: this.calculateConfidence(probability)
    };
  }

  /**
   * Извлечение features из страницы
   */
  extractFeatures(page) {
    return {
      quality: page.qualityScore || 0,
      contentLength: (page.content || page.html || '').length,
      internalLinks: (page.internalLinks || []).length,
      externalLinks: (page.externalLinks || []).length,
      structuredData: page.hasStructuredData ? 1 : 0,
      mobileFriendly: page.isMobileFriendly !== false ? 1 : 0,
      coreWebVitals: page.coreWebVitals?.score || 0,
      age: this.calculateAge(page),
      sitemapPriority: page.sitemapPriority || 0.5
    };
  }

  /**
   * Вычисление вероятности
   */
  calculateProbability(features) {
    const weights = this.model.weights;
    let score = 0;

    // Нормализуем features
    const normalized = {
      quality: features.quality,
      contentLength: Math.min(features.contentLength / 5000, 1), // 5000+ символов = 1.0
      internalLinks: Math.min(features.internalLinks / 10, 1), // 10+ ссылок = 1.0
      externalLinks: Math.min(features.externalLinks / 5, 1), // 5+ ссылок = 1.0
      structuredData: features.structuredData,
      mobileFriendly: features.mobileFriendly,
      coreWebVitals: features.coreWebVitals,
      age: Math.min(features.age / 30, 1), // 30+ дней = 1.0
      sitemapPriority: features.sitemapPriority
    };

    // Взвешенная сумма
    score += normalized.quality * weights.quality;
    score += normalized.contentLength * weights.contentLength;
    score += normalized.internalLinks * weights.internalLinks;
    score += normalized.externalLinks * weights.externalLinks;
    score += normalized.structuredData * weights.structuredData;
    score += normalized.mobileFriendly * weights.mobileFriendly;
    score += normalized.coreWebVitals * weights.coreWebVitals;
    score += normalized.age * weights.age;
    score += normalized.sitemapPriority * weights.sitemapPriority;

    return Math.min(Math.max(score, 0), 1); // 0-1
  }

  /**
   * Вычисление возраста страницы
   */
  calculateAge(page) {
    if (page.createdAt) {
      const age = (Date.now() - new Date(page.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return age;
    }
    return 0;
  }

  /**
   * Вычисление уверенности
   */
  calculateConfidence(probability) {
    if (probability >= 0.8) return 'high';
    if (probability >= 0.6) return 'medium';
    if (probability >= 0.4) return 'low';
    return 'very-low';
  }

  /**
   * Обучение модели на основе реальных данных
   */
  train(trainingData) {
    if (trainingData.length === 0) {
      log('PREDICTIVE-INDEXING', 'No training data, using default model');
      return;
    }

    // Простое обучение: корректировка весов на основе ошибок
    let totalError = 0;
    let adjustments = {};

    for (const sample of trainingData) {
      const prediction = this.predict(sample.page);
      const error = Math.abs(prediction.probability - (sample.actualIndexed ? 1 : 0));
      totalError += error;

      // Корректируем веса на основе ошибки
      const features = this.extractFeatures(sample.page);
      for (const [feature, value] of Object.entries(features)) {
        if (!adjustments[feature]) adjustments[feature] = 0;
        const normalized = this.normalizeFeature(feature, value);
        adjustments[feature] += error * normalized * 0.01; // Небольшая корректировка
      }
    }

    // Применяем корректировки
    const avgError = totalError / trainingData.length;
    if (avgError > 0.1) { // Если средняя ошибка > 10%
      for (const [feature, adjustment] of Object.entries(adjustments)) {
        if (this.model.weights[feature]) {
          this.model.weights[feature] += adjustment / trainingData.length;
          // Нормализуем веса
          this.model.weights[feature] = Math.max(0, Math.min(1, this.model.weights[feature]));
        }
      }
      log('PREDICTIVE-INDEXING', `Model updated, avg error: ${avgError.toFixed(3)}`);
    }
  }

  /**
   * Нормализация feature
   */
  normalizeFeature(feature, value) {
    const maxValues = {
      quality: 1,
      contentLength: 5000,
      internalLinks: 10,
      externalLinks: 5,
      structuredData: 1,
      mobileFriendly: 1,
      coreWebVitals: 1,
      age: 30,
      sitemapPriority: 1
    };

    const max = maxValues[feature] || 1;
    return Math.min(value / max, 1);
  }

  /**
   * Приоритизация страниц для индексации
   */
  prioritizePages(pages) {
    // Безопасная проверка на массив
    if (!pages || !Array.isArray(pages)) {
      log('PREDICTIVE-INDEXING', 'No pages provided for prioritization');
      return { highPriority: [], mediumPriority: [], lowPriority: [] };
    }
    
    const predictions = pages.map(page => ({
      page,
      prediction: this.predict(page)
    }));

    // Сортируем по вероятности индексации
    predictions.sort((a, b) => b.prediction.probability - a.prediction.probability);

    return {
      highPriority: predictions.filter(p => p.prediction.probability >= 0.8).map(p => p.page),
      mediumPriority: predictions.filter(p => p.prediction.probability >= 0.6 && p.prediction.probability < 0.8).map(p => p.page),
      lowPriority: predictions.filter(p => p.prediction.probability < 0.6).map(p => p.page),
      predictions: predictions
    };
  }
}

module.exports = { PredictiveIndexingModel };


