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
   * Использует реальные метрики из GSC если доступны
   */
  updateWeights(pages, metrics = {}) {
    // Обновление весов для intents
    const byIntent = {};
    pages.forEach(page => {
      const intent = page.intent;
      if (!byIntent[intent]) {
        byIntent[intent] = { 
          scoreSum: 0, 
          count: 0, 
          traffic: 0,
          clicks: 0,
          impressions: 0,
          ctr: 0,
          position: 0,
          pagesWithGSC: 0
        };
      }
      byIntent[intent].scoreSum += page.qualityScore || 0;
      byIntent[intent].count++;
      byIntent[intent].traffic += page.traffic || 0;
      
      // GSC метрики если доступны
      if (page.gscMetrics) {
        byIntent[intent].clicks += page.gscMetrics.clicks || 0;
        byIntent[intent].impressions += page.gscMetrics.impressions || 0;
        byIntent[intent].ctr += page.gscMetrics.ctr || 0;
        byIntent[intent].position += page.gscMetrics.position || 0;
        byIntent[intent].pagesWithGSC++;
      }

      // Внешние метрики (bounce rate, time on page)
      if (page.externalMetrics) {
        byIntent[intent].bounceRate = (byIntent[intent].bounceRate || 0) + (page.externalMetrics.bounceRate || 0);
        byIntent[intent].timeOnPage = (byIntent[intent].timeOnPage || 0) + (page.externalMetrics.timeOnPage || 0);
        byIntent[intent].pagesWithExternalMetrics = (byIntent[intent].pagesWithExternalMetrics || 0) + 1;
      }
    });

    for (const [intent, data] of Object.entries(byIntent)) {
      const avgQuality = data.count > 0 ? data.scoreSum / data.count : 0;
      
      // Используем GSC метрики если доступны, иначе quality score
      let weight = avgQuality; // Fallback на quality
      
      if (data.pagesWithGSC > 0 && data.impressions > 0) {
        // Реальные метрики из GSC
        const avgCTR = data.ctr / data.pagesWithGSC;
        const avgPosition = data.position / data.pagesWithGSC;
        const totalClicks = data.clicks;
        
        // Внешние метрики если доступны
        let bounceScore = 0.5;
        let timeScore = 0.5;
        if (data.pagesWithExternalMetrics > 0) {
          const avgBounceRate = data.bounceRate / data.pagesWithExternalMetrics;
          const avgTimeOnPage = data.timeOnPage / data.pagesWithExternalMetrics;
          bounceScore = 1 - (avgBounceRate / 100); // Инвертируем bounce rate
          timeScore = Math.min(avgTimeOnPage / 300, 1); // 5 минут = максимум
        }
        
        // Нормализация метрик
        const ctrScore = Math.min(avgCTR / 10, 1); // CTR 10% = максимум
        const positionScore = Math.max(0, Math.min(1, (21 - avgPosition) / 20)); // Позиция 1 = максимум
        const trafficScore = Math.min(totalClicks / 1000, 1); // 1000 кликов = максимум
        
        // Комбинированная формула с учетом всех метрик
        weight = (
          ctrScore * 0.25 +
          positionScore * 0.25 +
          trafficScore * 0.15 +
          bounceScore * 0.20 +
          timeScore * 0.15
        );
        log('LTR', `Using GSC + external metrics for ${intent}: CTR=${avgCTR.toFixed(2)}%, Position=${avgPosition.toFixed(1)}, Bounce=${(data.bounceRate / data.pagesWithExternalMetrics || 0).toFixed(1)}%, Time=${(data.timeOnPage / data.pagesWithExternalMetrics || 0).toFixed(1)}s`);
      } else {
        // Fallback на quality score если нет GSC данных
        const trafficNorm = Math.min(data.traffic / 1000, 1);
        weight = avgQuality * 0.6 + trafficNorm * 0.4;
        log('LTR', `Using quality score for ${intent}: Quality=${avgQuality.toFixed(3)}, Traffic=${data.traffic}`);
      }
      
      // Плавное обновление (exponential moving average)
      const current = this.weights.intents[intent] || 0.5;
      this.weights.intents[intent] = current * 0.7 + weight * 0.3;
    }

    // Обновление весов для languages
    const byLang = {};
    pages.forEach(page => {
      const lang = page.lang;
      if (!byLang[lang]) {
        byLang[lang] = { 
          scoreSum: 0, 
          count: 0,
          clicks: 0,
          impressions: 0,
          ctr: 0,
          pagesWithGSC: 0
        };
      }
      byLang[lang].scoreSum += page.qualityScore || 0;
      byLang[lang].count++;
      
      if (page.gscMetrics) {
        byLang[lang].clicks += page.gscMetrics.clicks || 0;
        byLang[lang].impressions += page.gscMetrics.impressions || 0;
        byLang[lang].ctr += page.gscMetrics.ctr || 0;
        byLang[lang].pagesWithGSC++;
      }
    });

    for (const [lang, data] of Object.entries(byLang)) {
      const avgQuality = data.count > 0 ? data.scoreSum / data.count : 0;
      
      let weight = avgQuality;
      if (data.pagesWithGSC > 0 && data.impressions > 0) {
        const avgCTR = data.ctr / data.pagesWithGSC;
        const ctrScore = Math.min(avgCTR / 10, 1);
        weight = ctrScore * 0.7 + avgQuality * 0.3;
      }
      
      const current = this.weights.languages[lang] || 0.5;
      this.weights.languages[lang] = current * 0.7 + weight * 0.3;
    }

    // Обновление весов для layouts
    const byLayout = {};
    pages.forEach(page => {
      const layout = page.layout?.name || 'A';
      if (!byLayout[layout]) {
        byLayout[layout] = { 
          scoreSum: 0, 
          count: 0,
          clicks: 0,
          impressions: 0,
          ctr: 0,
          pagesWithGSC: 0
        };
      }
      byLayout[layout].scoreSum += page.qualityScore || 0;
      byLayout[layout].count++;
      
      if (page.gscMetrics) {
        byLayout[layout].clicks += page.gscMetrics.clicks || 0;
        byLayout[layout].impressions += page.gscMetrics.impressions || 0;
        byLayout[layout].ctr += page.gscMetrics.ctr || 0;
        byLayout[layout].pagesWithGSC++;
      }
    });

    for (const [layout, data] of Object.entries(byLayout)) {
      const avgQuality = data.count > 0 ? data.scoreSum / data.count : 0;
      
      let weight = avgQuality;
      if (data.pagesWithGSC > 0 && data.impressions > 0) {
        const avgCTR = data.ctr / data.pagesWithGSC;
        const ctrScore = Math.min(avgCTR / 10, 1);
        weight = ctrScore * 0.6 + avgQuality * 0.4;
      }
      
      const current = this.weights.layouts[layout] || 1.0;
      this.weights.layouts[layout] = current * 0.8 + weight * 0.2;
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

