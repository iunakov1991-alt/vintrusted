const { log } = require('../logger');
const { BuildHistory } = require('./build-history');

/**
 * SEO MONSTER 6.0: Forecast Engine
 * Прогнозирование будущих метрик
 */
class ForecastEngine {
  constructor(config) {
    this.config = config;
    this.buildHistory = new BuildHistory(config);
  }

  /**
   * Простое линейное прогнозирование
   */
  linearForecast(values, periods = 5) {
    if (values.length < 2) return [];

    const n = values.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, val, idx) => sum + (idx + 1) * val, 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const forecasts = [];
    for (let i = 1; i <= periods; i++) {
      forecasts.push(intercept + slope * (n + i));
    }

    return forecasts;
  }

  /**
   * Прогнозирование количества страниц
   */
  forecastPagesGenerated(periods = 5) {
    const history = this.buildHistory.getHistory(30);
    if (history.length < 2) return null;

    const values = history.map(r => r.pagesGenerated || 0);
    const forecasts = this.linearForecast(values, periods);

    return {
      current: values[values.length - 1],
      forecasts: forecasts,
      trend: forecasts[0] > values[values.length - 1] ? 'increasing' : 'decreasing'
    };
  }

  /**
   * Прогнозирование качества
   */
  forecastQuality(periods = 5) {
    const history = this.buildHistory.getHistory(30);
    if (history.length < 2) return null;

    const values = history.map(r => r.avgQuality || 0);
    const forecasts = this.linearForecast(values, periods);

    return {
      current: values[values.length - 1],
      forecasts: forecasts,
      trend: forecasts[0] > values[values.length - 1] ? 'improving' : 'declining',
      target: this.config.minQualityScore || 0.75
    };
  }

  /**
   * Прогнозирование длительности билда
   */
  forecastDuration(periods = 5) {
    const history = this.buildHistory.getHistory(30);
    if (history.length < 2) return null;

    const values = history.map(r => r.duration || 0);
    const forecasts = this.linearForecast(values, periods);

    return {
      current: values[values.length - 1],
      forecasts: forecasts,
      trend: forecasts[0] > values[values.length - 1] ? 'increasing' : 'decreasing',
      warning: forecasts[0] > 300000 // 5 минут
    };
  }

  /**
   * Полный прогноз
   */
  generateForecast(periods = 5) {
    const pagesForecast = this.forecastPagesGenerated(periods);
    const qualityForecast = this.forecastQuality(periods);
    const durationForecast = this.forecastDuration(periods);

    return {
      timestamp: new Date().toISOString(),
      periods: periods,
      pagesGenerated: pagesForecast,
      quality: qualityForecast,
      duration: durationForecast,
      recommendations: this.generateForecastRecommendations(pagesForecast, qualityForecast, durationForecast)
    };
  }

  /**
   * Генерация рекомендаций на основе прогноза
   */
  generateForecastRecommendations(pagesForecast, qualityForecast, durationForecast) {
    const recommendations = [];

    if (qualityForecast && qualityForecast.trend === 'declining') {
      recommendations.push({
        type: 'quality',
        priority: 'high',
        message: 'Quality trend is declining. Consider reviewing content generation parameters.'
      });
    }

    if (durationForecast && durationForecast.warning) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'Build duration is forecasted to exceed 5 minutes. Consider optimizing build process.'
      });
    }

    if (pagesForecast && pagesForecast.trend === 'decreasing') {
      recommendations.push({
        type: 'volume',
        priority: 'low',
        message: 'Page generation trend is decreasing. Review URL planning and cluster configuration.'
      });
    }

    return recommendations;
  }
}

module.exports = { ForecastEngine };

