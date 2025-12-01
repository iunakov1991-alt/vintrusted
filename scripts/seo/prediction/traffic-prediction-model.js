const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Traffic Prediction Model
 * ML модель предсказывает потенциальный трафик для страницы
 */
class TrafficPredictionModel {
  constructor(config) {
    this.config = config;
    this.model = {
      weights: {
        keywordVolume: 0.25,
        keywordDifficulty: 0.15,
        contentQuality: 0.20,
        contentLength: 0.10,
        internalLinks: 0.10,
        externalLinks: 0.05,
        structuredData: 0.05,
        mobileFriendly: 0.05,
        coreWebVitals: 0.05
      }
    };
    this.trainingData = [];
  }

  /**
   * Предсказание потенциального трафика
   */
  predict(page) {
    const features = this.extractFeatures(page);
    const potentialTraffic = this.calculatePotentialTraffic(features);
    
    return {
      potentialTraffic: Math.round(potentialTraffic),
      confidence: this.calculateConfidence(features),
      features,
      factors: this.analyzeFactors(features)
    };
  }

  /**
   * Извлечение features
   */
  extractFeatures(page) {
    return {
      keywordVolume: page.keywordVolume || 0,
      keywordDifficulty: page.keywordDifficulty || 0.5,
      contentQuality: page.qualityScore || 0,
      contentLength: (page.content || page.html || '').length,
      internalLinks: (page.internalLinks || []).length,
      externalLinks: (page.externalLinks || []).length,
      structuredData: page.hasStructuredData ? 1 : 0,
      mobileFriendly: page.isMobileFriendly !== false ? 1 : 0,
      coreWebVitals: page.coreWebVitals?.score || 0
    };
  }

  /**
   * Вычисление потенциального трафика
   */
  calculatePotentialTraffic(features) {
    const weights = this.model.weights;
    let baseTraffic = 0;

    // Базовый трафик от keyword volume
    baseTraffic = features.keywordVolume * 0.1; // 10% от volume

    // Модификаторы
    let modifier = 1.0;

    // Keyword difficulty (обратная зависимость)
    modifier *= (1 - features.keywordDifficulty * 0.5);

    // Content quality
    modifier *= (0.5 + features.contentQuality * 0.5);

    // Content length (оптимально 2000-5000 символов)
    const lengthScore = features.contentLength >= 2000 && features.contentLength <= 5000
      ? 1.0
      : features.contentLength < 2000
        ? features.contentLength / 2000
        : 1.0 - (features.contentLength - 5000) / 5000;
    modifier *= (0.7 + lengthScore * 0.3);

    // Internal links
    modifier *= (1 + Math.min(features.internalLinks / 10, 1) * 0.2);

    // External links
    modifier *= (1 + Math.min(features.externalLinks / 5, 1) * 0.1);

    // Structured data
    if (features.structuredData) {
      modifier *= 1.15;
    }

    // Mobile friendly
    if (features.mobileFriendly) {
      modifier *= 1.1;
    }

    // Core Web Vitals
    modifier *= (0.9 + features.coreWebVitals * 0.1);

    const predictedTraffic = baseTraffic * modifier;
    return Math.max(0, predictedTraffic);
  }

  /**
   * Вычисление уверенности
   */
  calculateConfidence(features) {
    let confidence = 0.5; // Базовая уверенность

    // Больше данных = больше уверенность
    if (features.keywordVolume > 0) confidence += 0.2;
    if (features.contentLength > 1000) confidence += 0.1;
    if (features.contentQuality > 0.7) confidence += 0.1;
    if (features.internalLinks > 0) confidence += 0.1;

    return Math.min(1, confidence);
  }

  /**
   * Анализ факторов
   */
  analyzeFactors(features) {
    const factors = [];

    if (features.keywordVolume > 1000) {
      factors.push({ type: 'positive', message: 'High keyword search volume' });
    } else if (features.keywordVolume < 100) {
      factors.push({ type: 'negative', message: 'Low keyword search volume' });
    }

    if (features.keywordDifficulty > 0.7) {
      factors.push({ type: 'negative', message: 'High keyword difficulty' });
    }

    if (features.contentLength < 1000) {
      factors.push({ type: 'negative', message: 'Content too short' });
    } else if (features.contentLength > 5000) {
      factors.push({ type: 'warning', message: 'Content may be too long' });
    }

    if (features.internalLinks < 3) {
      factors.push({ type: 'negative', message: 'Not enough internal links' });
    }

    if (!features.structuredData) {
      factors.push({ type: 'warning', message: 'Missing structured data' });
    }

    return factors;
  }

  /**
   * Приоритизация страниц по потенциальному трафику
   */
  prioritizePages(pages) {
    // Безопасная проверка на массив
    if (!pages || !Array.isArray(pages)) {
      log('TRAFFIC-PREDICTION', 'No pages provided for prioritization');
      return { highPotential: [], mediumPotential: [] };
    }
    
    const predictions = pages.map(page => ({
      page,
      prediction: this.predict(page)
    }));

    // Сортируем по потенциальному трафику
    predictions.sort((a, b) => b.prediction.potentialTraffic - a.prediction.potentialTraffic);

    return {
      highPotential: predictions.filter(p => p.prediction.potentialTraffic > 100).map(p => p.page),
      mediumPotential: predictions.filter(p => p.prediction.potentialTraffic > 10 && p.prediction.potentialTraffic <= 100).map(p => p.page),
      lowPotential: predictions.filter(p => p.prediction.potentialTraffic <= 10).map(p => p.page),
      predictions: predictions
    };
  }
}

module.exports = { TrafficPredictionModel };


