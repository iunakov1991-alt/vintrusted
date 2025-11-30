const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Learning-to-Rank Weight Engine
 * Вычисление весов для intents, languages, clusters на основе метрик
 */
class WeightEngine {
  constructor() {
    this.weights = {
      intents: {},
      languages: {},
      clusters: {},
      layouts: {}
    };
  }

  /**
   * Обновление весов на основе метрик страниц
   */
  updateWeights(pages, metrics = {}) {
    // Обновление весов для intents
    const byIntent = {};
    pages.forEach(page => {
      const intent = page.intent;
      if (!byIntent[intent]) {
        byIntent[intent] = { scoreSum: 0, count: 0, traffic: 0 };
      }
      byIntent[intent].scoreSum += page.qualityScore || 0;
      byIntent[intent].count++;
      byIntent[intent].traffic += page.traffic || 0;
    });

    for (const [intent, data] of Object.entries(byIntent)) {
      const avgQuality = data.scoreSum / data.count;
      const trafficNorm = Math.min(data.traffic / 1000, 1);
      
      // Формула веса: качество * 0.6 + трафик * 0.4
      const weight = avgQuality * 0.6 + trafficNorm * 0.4;
      
      // Плавное обновление (exponential moving average)
      const current = this.weights.intents[intent] || 0.5;
      this.weights.intents[intent] = current * 0.7 + weight * 0.3;
    }

    // Обновление весов для languages
    const byLang = {};
    pages.forEach(page => {
      const lang = page.lang;
      if (!byLang[lang]) {
        byLang[lang] = { scoreSum: 0, count: 0 };
      }
      byLang[lang].scoreSum += page.qualityScore || 0;
      byLang[lang].count++;
    });

    for (const [lang, data] of Object.entries(byLang)) {
      const avgQuality = data.scoreSum / data.count;
      const current = this.weights.languages[lang] || 0.5;
      this.weights.languages[lang] = current * 0.7 + avgQuality * 0.3;
    }

    // Обновление весов для layouts
    const byLayout = {};
    pages.forEach(page => {
      const layout = page.layout?.name || 'A';
      if (!byLayout[layout]) {
        byLayout[layout] = { scoreSum: 0, count: 0 };
      }
      byLayout[layout].scoreSum += page.qualityScore || 0;
      byLayout[layout].count++;
    });

    for (const [layout, data] of Object.entries(byLayout)) {
      const avgQuality = data.scoreSum / data.count;
      const current = this.weights.layouts[layout] || 1.0;
      this.weights.layouts[layout] = current * 0.8 + avgQuality * 0.2;
    }

    log('LTR', 'Weights updated', {
      intents: Object.keys(this.weights.intents).length,
      languages: Object.keys(this.weights.languages).length,
      layouts: Object.keys(this.weights.layouts).length
    });

    return this.weights;
  }

  /**
   * Получить текущие веса
   */
  getWeights() {
    return this.weights;
  }

  /**
   * Нормализация весов
   */
  normalizeWeights(weights) {
    const entries = Object.entries(weights);
    const sum = entries.reduce((acc, [, v]) => acc + v, 0);
    if (!sum) return weights;
    const res = {};
    for (const [k, v] of entries) res[k] = v / sum;
    return res;
  }
}

module.exports = { WeightEngine };

