const fs = require('fs');
const path = require('path');
const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Conversion Prediction Model
 * Предсказание конверсий на основе исторических данных и метрик
 */
class ConversionPredictor {
  constructor(config) {
    this.config = config;
    this.modelPath = path.join(process.cwd(), 'data/seo/conversion-model.json');
    this.historyPath = path.join(process.cwd(), 'data/seo/conversion-history.jsonl');
    this.loadModel();
  }

  loadModel() {
    try {
      if (fs.existsSync(this.modelPath)) {
        this.model = JSON.parse(fs.readFileSync(this.modelPath, 'utf8'));
      } else {
        // Инициализация модели с базовыми весами
        // ПРИОРИТЕТ 1: Максимизация SEO (чтобы Google нравился и вел трафик)
        // ПРИОРИТЕТ 2: Максимизация конвертирующего трафика
        this.model = {
          version: '1.0',
          weights: {
            // ПРИОРИТЕТ 1: SEO факторы (чтобы Google нравился)
            qualityScore: 0.30,       // Качество контента - КРИТИЧНО для Google
            semanticScore: 0.25,      // Semantic релевантность - КРИТИЧНО для ранжирования
            position: 0.15,           // Позиции в поиске (результат хорошего SEO)
            ctr: 0.10,                // CTR (результат хорошего SEO)
            trafficVolume: 0.10,      // Трафик (результат хорошего SEO)
            // ПРИОРИТЕТ 2: Conversion potential (вторичный фактор)
            timeOnPage: 0.04,         // Время на странице (engagement)
            bounceRate: -0.03,        // Низкий bounce (engagement)
            internalLinks: 0.02,      // Внутренние ссылки (SEO + UX)
            layoutType: 0.01,         // Layout
            intentType: 0.01          // Intent
          },
          intercept: 0.02, // Низкий базовый CR для SEO страниц (нормально)
          trainingData: {
            totalSamples: 0,
            lastUpdated: null,
            accuracy: 0
          },
          factors: {
            // Факторы, влияющие на конверсии
            highQualityThreshold: 0.85,
            lowBounceThreshold: 30,
            optimalTimeOnPage: 180, // 3 минуты
            optimalCTR: 5.0
          }
        };
        this.saveModel();
      }
    } catch (e) {
      log('CONVERSION', 'Failed to load model, using defaults', e);
      this.model = this.getDefaultModel();
    }
  }

  getDefaultModel() {
    return {
      version: '1.0',
      weights: {
        // ПРИОРИТЕТ 1: SEO факторы (чтобы Google нравился)
        qualityScore: 0.30,
        semanticScore: 0.25,
        position: 0.15,
        ctr: 0.10,
        trafficVolume: 0.10,
        // ПРИОРИТЕТ 2: Conversion potential (вторичный)
        timeOnPage: 0.04,
        bounceRate: -0.03,
        internalLinks: 0.02,
        layoutType: 0.01,
        intentType: 0.01
      },
      intercept: 0.02, // Низкий базовый CR для SEO страниц
      trainingData: {
        totalSamples: 0,
        lastUpdated: null,
        accuracy: 0
      },
      factors: {
        highQualityThreshold: 0.85,
        lowBounceThreshold: 30,
        optimalTimeOnPage: 180,
        optimalCTR: 5.0
      }
    };
  }

  saveModel() {
    try {
      const dir = path.dirname(this.modelPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.modelPath, JSON.stringify(this.model, null, 2), 'utf8');
    } catch (e) {
      log('CONVERSION', 'Failed to save model', e);
    }
  }

  /**
   * Загрузка истории конверсий
   */
  loadHistory() {
    const history = [];
    if (fs.existsSync(this.historyPath)) {
      const lines = fs.readFileSync(this.historyPath, 'utf8')
        .split('\n')
        .filter(line => line.trim());
      
      for (const line of lines) {
        try {
          history.push(JSON.parse(line));
        } catch (e) {
          // Skip invalid lines
        }
      }
    }
    return history;
  }

  /**
   * Сохранение записи о конверсии
   */
  recordConversion(pageData, conversionData) {
    const record = {
      timestamp: new Date().toISOString(),
      page: {
        url: pageData.url,
        qualityScore: pageData.qualityScore,
        semanticScore: pageData.qualityBreakdown?.semantic || 0,
        layout: pageData.layout?.name || 'unknown',
        intent: pageData.intent,
        state: pageData.stateSlug,
        make: pageData.make
      },
      metrics: {
        traffic: conversionData.traffic || 0,
        ctr: conversionData.ctr || 0,
        position: conversionData.position || 0,
        bounceRate: conversionData.bounceRate || 0,
        timeOnPage: conversionData.timeOnPage || 0,
        internalLinks: pageData.internalLinks?.length || 0
      },
      conversion: {
        rate: conversionData.conversionRate || 0,
        count: conversionData.conversions || 0,
        revenue: conversionData.revenue || 0
      }
    };

    // Добавляем в историю
    try {
      fs.appendFileSync(this.historyPath, JSON.stringify(record) + '\n', 'utf8');
    } catch (e) {
      log('CONVERSION', 'Failed to record conversion', e);
    }

    return record;
  }

  /**
   * Предсказание конверсии для страницы
   * Для SEO страниц: предсказываем не только CR, но и Traffic Conversion Potential
   */
  predictConversion(pageData, metrics = {}) {
    const features = this.extractFeatures(pageData, metrics);
    const prediction = this.calculatePrediction(features);
    
    // Для SEO страниц важнее Traffic Conversion Potential, чем сам CR
    // TCP = предсказанный CR × потенциал трафика
    const trafficPotential = this.calculateTrafficPotential(features, metrics);
    const trafficConversionPotential = prediction.rate * trafficPotential;
    
    return {
      predictedRate: prediction.rate,
      trafficConversionPotential: trafficConversionPotential, // Новый метрика
      trafficPotential: trafficPotential,
      confidence: prediction.confidence,
      factors: prediction.factors,
      recommendations: this.generateRecommendations(features, prediction)
    };
  }

  /**
   * Расчет потенциала трафика (0-1)
   * Учитывает SEO факторы, которые влияют на объем трафика
   */
  calculateTrafficPotential(features, metrics = {}) {
    // Факторы, влияющие на трафик:
    // 1. CTR в поиске (высокий CTR = больше кликов)
    // 2. Позиция (лучшая позиция = больше трафика)
    // 3. Quality Score (высокое качество = лучше ранжирование)
    // 4. Semantic Score (релевантность = больше показов)
    
    const ctrScore = features.ctr; // Уже нормализован
    const positionScore = features.position; // Уже нормализован (инвертирован)
    const qualityScore = features.qualityScore;
    const semanticScore = features.semanticScore;
    
    // Комбинированный потенциал трафика
    const trafficPotential = (
      ctrScore * 0.35 +        // CTR - самый важный для трафика
      positionScore * 0.30 +   // Позиция - очень важна
      qualityScore * 0.20 +    // Качество влияет на ранжирование
      semanticScore * 0.15     // Semantic для релевантности
    );
    
    return Math.max(0, Math.min(1, trafficPotential));
  }

  /**
   * Извлечение признаков для модели
   */
  extractFeatures(pageData, metrics = {}) {
    const qualityScore = pageData.qualityScore || 0;
    const semanticScore = pageData.qualityBreakdown?.semantic || 0;
    const traffic = metrics.traffic || metrics.clicks || 0;
    const ctr = metrics.ctr || 0;
    const position = metrics.position || 0;
    const bounceRate = metrics.bounceRate || 0;
    const timeOnPage = metrics.timeOnPage || 0;
    const internalLinks = pageData.internalLinks?.length || 0;
    
    // Нормализация layout (0-1)
    const layoutTypes = ['DMV', 'APPLE', 'LEGAL', 'RISK', 'HYBRID', 'ANALYTIC'];
    const layoutType = layoutTypes.indexOf(pageData.layout?.name || 'DMV') / layoutTypes.length;
    
    // Нормализация intent (0-1)
    const intents = ['vin_check', 'accident_check', 'ownership_history', 'market_value', 
                     'dmv_records', 'title_brand', 'odometer_rollback', 'theft_records'];
    const intentType = intents.indexOf(pageData.intent || 'vin_check') / intents.length;

    return {
      qualityScore: Math.min(1, qualityScore),
      semanticScore: Math.min(1, semanticScore),
      trafficVolume: Math.min(1, traffic / 1000), // Нормализация: 1000 = максимум
      ctr: Math.min(1, ctr / 10), // Нормализация: 10% = максимум
      position: Math.max(0, Math.min(1, (21 - position) / 20)), // Инвертированная позиция
      bounceRate: Math.min(1, bounceRate / 100), // Нормализация: 100% = максимум
      timeOnPage: Math.min(1, timeOnPage / 300), // Нормализация: 5 минут = максимум
      internalLinks: Math.min(1, internalLinks / 5), // Нормализация: 5 ссылок = максимум
      layoutType,
      intentType
    };
  }

  /**
   * Расчет предсказания конверсии
   */
  calculatePrediction(features) {
    const weights = this.model.weights;
    const intercept = this.model.intercept;

    // Линейная комбинация признаков
    let prediction = intercept;
    
    prediction += features.qualityScore * weights.qualityScore;
    prediction += features.semanticScore * weights.semanticScore;
    prediction += features.trafficVolume * weights.trafficVolume;
    prediction += features.ctr * weights.ctr;
    prediction += features.position * weights.position;
    prediction += features.bounceRate * weights.bounceRate; // Отрицательный вес
    prediction += features.timeOnPage * weights.timeOnPage;
    prediction += features.internalLinks * weights.internalLinks;
    prediction += features.layoutType * weights.layoutType;
    prediction += features.intentType * weights.intentType;

    // Ограничение диапазона (0-1)
    prediction = Math.max(0, Math.min(1, prediction));

    // Расчет уверенности на основе количества данных
    const confidence = Math.min(1, 0.5 + (this.model.trainingData.totalSamples / 100) * 0.5);

    // Анализ факторов
    const factors = {
      positive: [],
      negative: [],
      neutral: []
    };

    if (features.qualityScore > this.model.factors.highQualityThreshold) {
      factors.positive.push('Высокое качество контента');
    }
    if (features.bounceRate < this.model.factors.lowBounceThreshold / 100) {
      factors.positive.push('Низкий bounce rate');
    }
    if (features.timeOnPage > this.model.factors.optimalTimeOnPage / 300) {
      factors.positive.push('Высокое время на странице');
    }
    if (features.ctr > this.model.factors.optimalCTR / 10) {
      factors.positive.push('Высокий CTR');
    }
    if (features.bounceRate > 0.5) {
      factors.negative.push('Высокий bounce rate');
    }
    if (features.qualityScore < 0.7) {
      factors.negative.push('Низкое качество контента');
    }
    if (features.timeOnPage < 0.3) {
      factors.negative.push('Низкое время на странице');
    }

    return {
      rate: prediction,
      confidence,
      factors
    };
  }

  /**
   * Генерация рекомендаций
   * ПРИОРИТЕТ 1: SEO факторы (чтобы Google нравился)
   * ПРИОРИТЕТ 2: Conversion potential
   */
  generateRecommendations(features, prediction) {
    const recommendations = [];

    // ПРИОРИТЕТ 1: SEO факторы (чтобы Google нравился и вел трафик)
    if (features.qualityScore < 0.75) {
      recommendations.push({
        type: 'seo',
        priority: 'critical',
        message: 'КРИТИЧНО: Улучшите качество контента - это основа для того, чтобы Google нравился ваш SEO',
        expectedImpact: '+50-100% трафика через лучшее ранжирование в Google'
      });
    }

    if (features.semanticScore < 0.7) {
      recommendations.push({
        type: 'seo',
        priority: 'critical',
        message: 'КРИТИЧНО: Улучшите Semantic Score - покройте все Tier 1 темы для релевантности в Google',
        expectedImpact: '+40-80% трафика через лучшую релевантность и понимание Google'
      });
    }

    if (features.position < 0.5) {
      recommendations.push({
        type: 'seo',
        priority: 'high',
        message: 'Улучшите позиции в поиске - результат хорошего SEO',
        expectedImpact: '+30-60% трафика при улучшении позиций'
      });
    }

    if (features.ctr < 0.3) {
      recommendations.push({
        type: 'seo',
        priority: 'high',
        message: 'Улучшите CTR в поиске - оптимизируйте title и description',
        expectedImpact: '+20-40% трафика через лучший CTR'
      });
    }

    // ПРИОРИТЕТ 2: Conversion potential (вторичный фактор)
    if (features.bounceRate > 0.5) {
      recommendations.push({
        type: 'engagement',
        priority: 'medium',
        message: 'Снизьте bounce rate - улучшите релевантность для удержания трафика',
        expectedImpact: 'Больше трафика останется на сайте и конвертируется'
      });
    }

    if (features.timeOnPage < 0.3) {
      recommendations.push({
        type: 'engagement',
        priority: 'low',
        message: 'Увеличьте время на странице - улучшите контент для удержания',
        expectedImpact: 'Больше engagement = выше conversion potential'
      });
    }

    if (features.internalLinks < 0.4) {
      recommendations.push({
        type: 'linking',
        priority: 'low',
        message: 'Добавьте больше внутренних ссылок для улучшения SEO и навигации',
        expectedImpact: '+5-10% трафика через внутренние ссылки'
      });
    }

    return recommendations;
  }

  /**
   * Обучение модели на исторических данных
   */
  trainModel() {
    const history = this.loadHistory();
    if (history.length < 10) {
      log('CONVERSION', 'Not enough data for training (need at least 10 samples)');
      return;
    }

    log('CONVERSION', `Training model on ${history.length} samples`);

    // Простое обучение через градиентный спуск
    const learningRate = 0.01;
    const iterations = 100;
    let bestError = Infinity;
    let bestWeights = { ...this.model.weights };

    for (let iter = 0; iter < iterations; iter++) {
      let totalError = 0;
      const gradients = {};

      // Инициализация градиентов
      for (const key of Object.keys(this.model.weights)) {
        gradients[key] = 0;
      }
      let interceptGradient = 0;

      // Проход по всем примерам
      for (const record of history) {
        const features = this.extractFeatures(record.page, record.metrics);
        const actualRate = record.conversion.rate;
        const predictedRate = this.calculatePrediction(features).rate;
        const error = actualRate - predictedRate;

        totalError += error * error;

        // Вычисление градиентов
        interceptGradient += error;
        gradients.qualityScore += error * features.qualityScore;
        gradients.semanticScore += error * features.semanticScore;
        gradients.trafficVolume += error * features.trafficVolume;
        gradients.ctr += error * features.ctr;
        gradients.position += error * features.position;
        gradients.bounceRate += error * features.bounceRate;
        gradients.timeOnPage += error * features.timeOnPage;
        gradients.internalLinks += error * features.internalLinks;
        gradients.layoutType += error * features.layoutType;
        gradients.intentType += error * features.intentType;
      }

      // Обновление весов
      const avgError = totalError / history.length;
      if (avgError < bestError) {
        bestError = avgError;
        bestWeights = { ...this.model.weights };
      }

      // Обновление весов
      for (const key of Object.keys(this.model.weights)) {
        this.model.weights[key] += learningRate * (gradients[key] / history.length);
      }
      this.model.intercept += learningRate * (interceptGradient / history.length);

      // Нормализация весов (чтобы сумма была ~1)
      const sum = Object.values(this.model.weights).reduce((a, b) => a + Math.abs(b), 0) + Math.abs(this.model.intercept);
      if (sum > 1.5) {
        const scale = 1.0 / sum;
        for (const key of Object.keys(this.model.weights)) {
          this.model.weights[key] *= scale;
        }
        this.model.intercept *= scale;
      }
    }

    // Используем лучшие веса
    this.model.weights = bestWeights;
    this.model.trainingData = {
      totalSamples: history.length,
      lastUpdated: new Date().toISOString(),
      accuracy: 1 - Math.sqrt(bestError / history.length) // RMSE-based accuracy
    };

    this.saveModel();
    log('CONVERSION', `Model trained: accuracy=${this.model.trainingData.accuracy.toFixed(3)}, error=${bestError.toFixed(4)}`);
  }

  /**
   * Получение статистики модели
   */
  getStatistics() {
    const history = this.loadHistory();
    const predictions = history.map(record => {
      const features = this.extractFeatures(record.page, record.metrics);
      return this.calculatePrediction(features);
    });

    const avgPredicted = predictions.reduce((sum, p) => sum + p.rate, 0) / predictions.length || 0;
    const avgActual = history.reduce((sum, r) => sum + r.conversion.rate, 0) / history.length || 0;

    return {
      modelVersion: this.model.version,
      trainingSamples: this.model.trainingData.totalSamples,
      accuracy: this.model.trainingData.accuracy,
      lastTrained: this.model.trainingData.lastUpdated,
      avgPredictedRate: avgPredicted,
      avgActualRate: avgActual,
      weights: this.model.weights
    };
  }

  /**
   * Предсказание конверсий для множества страниц
   */
  predictBatch(pages, metricsMap = {}) {
    const predictions = [];
    
    for (const page of pages) {
      const metrics = metricsMap[page.url] || {};
      const prediction = this.predictConversion(page, metrics);
      predictions.push({
        url: page.url,
        ...prediction
      });
    }

    return predictions;
  }

  /**
   * Ранжирование страниц по предсказанным конверсиям
   */
  rankByConversion(pages, metricsMap = {}) {
    const predictions = this.predictBatch(pages, metricsMap);
    
    return predictions
      .sort((a, b) => b.predictedRate - a.predictedRate)
      .map((p, index) => ({
        ...p,
        rank: index + 1
      }));
  }
}

module.exports = { ConversionPredictor };

