const fs = require('fs');
const path = require('path');
const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: VIN Collection Training
 * Обучение AI на собранных VIN кодах
 * ТРИЗ: Максимальное использование ресурсов - каждый VIN становится источником обучения
 */
class VINCollectionTraining {
  constructor(config) {
    this.config = config;
    this.collectedVinsPath = path.join(process.cwd(), 'data/vin-collection');
    this.trainingDataPath = path.join(process.cwd(), 'data/seo/ai-training');
  }

  /**
   * ТРИЗ: Определение, чему AI обучится из собранных VIN
   * Принцип: Эффективность через анализ паттернов
   */
  async trainFromCollectedVINs() {
    log('VIN-COLLECTION-TRAINING', 'Starting training from collected VINs');

    const paidVINs = this.loadPaidVINs();
    const unpaidVINs = this.loadUnpaidVINs();

    // ТРИЗ анализ: что можно извлечь из VIN кодов
    const trainingData = {
      paidVINs: this.analyzePaidVINs(paidVINs),
      unpaidVINs: this.analyzeUnpaidVINs(unpaidVINs),
      patterns: this.extractPatterns(paidVINs, unpaidVINs),
      insights: this.generateInsights(paidVINs, unpaidVINs)
    };

    // Сохранение для AI Training Pipeline
    await this.saveTrainingData(trainingData);

    log('VIN-COLLECTION-TRAINING', `Training completed: ${paidVINs.length} paid, ${unpaidVINs.length} unpaid VINs`);
    return trainingData;
  }

  /**
   * Загрузка оплаченных VIN
   */
  loadPaidVINs() {
    const filePath = path.join(this.collectedVinsPath, 'paid-vins.jsonl');
    if (!fs.existsSync(filePath)) {
      return [];
    }

    try {
      const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
      return lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
    } catch (e) {
      log('VIN-COLLECTION-TRAINING', `Error loading paid VINs: ${e.message}`);
      return [];
    }
  }

  /**
   * Загрузка неоплаченных VIN
   */
  loadUnpaidVINs() {
    const filePath = path.join(this.collectedVinsPath, 'unpaid-vins.jsonl');
    if (!fs.existsSync(filePath)) {
      return [];
    }

    try {
      const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
      return lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
    } catch (e) {
      log('VIN-COLLECTION-TRAINING', `Error loading unpaid VINs: ${e.message}`);
      return [];
    }
  }

  /**
   * ТРИЗ: Анализ оплаченных VIN
   * Чему AI обучится: какие VIN коды конвертируются в оплаты
   */
  analyzePaidVINs(vins) {
    const analysis = {
      total: vins.length,
      patterns: {
        makeDistribution: {},
        yearDistribution: {},
        stateDistribution: {},
        timePatterns: {}
      },
      conversionInsights: []
    };

    for (const vinData of vins) {
      const vin = vinData.vin || '';
      
      // Извлекаем информацию из VIN (первые 3 символа - WMI, 10-й символ - год)
      if (vin.length === 17) {
        const wmi = vin.substring(0, 3);
        const yearCode = vin.charAt(9);
        
        // Анализируем паттерны
        this.analyzeVINPattern(vin, analysis.patterns);
      }

      // Анализируем время оплаты
      if (vinData.paidAt) {
        const date = new Date(vinData.paidAt);
        const hour = date.getHours();
        analysis.patterns.timePatterns[hour] = (analysis.patterns.timePatterns[hour] || 0) + 1;
      }
    }

    return analysis;
  }

  /**
   * ТРИЗ: Анализ неоплаченных VIN
   * Чему AI обучится: какие VIN коды не конвертируются и почему
   */
  analyzeUnpaidVINs(vins) {
    const analysis = {
      total: vins.length,
      patterns: {
        makeDistribution: {},
        yearDistribution: {},
        stateDistribution: {},
        abandonmentReasons: []
      },
      optimizationInsights: []
    };

    for (const vinData of vins) {
      const vin = vinData.vin || '';
      
      // Анализируем паттерны неоплаченных VIN
      if (vin.length === 17) {
        this.analyzeVINPattern(vin, analysis.patterns);
      }

      // Анализируем время просмотра
      if (vinData.viewedAt) {
        const date = new Date(vinData.viewedAt);
        const hour = date.getHours();
        // Можно добавить анализ времени просмотра
      }
    }

    return analysis;
  }

  /**
   * Анализ паттернов VIN
   */
  analyzeVINPattern(vin, patterns) {
    // Извлекаем информацию из VIN
    // WMI (первые 3 символа) - производитель
    const wmi = vin.substring(0, 3);
    
    // Год (10-й символ)
    const yearCode = vin.charAt(9);
    const year = this.decodeYear(yearCode);

    // Обновляем распределения
    patterns.makeDistribution[wmi] = (patterns.makeDistribution[wmi] || 0) + 1;
    if (year) {
      patterns.yearDistribution[year] = (patterns.yearDistribution[year] || 0) + 1;
    }
  }

  /**
   * Декодирование года из VIN
   */
  decodeYear(code) {
    const yearMap = {
      'A': 1980, 'B': 1981, 'C': 1982, 'D': 1983, 'E': 1984,
      'F': 1985, 'G': 1986, 'H': 1987, 'J': 1988, 'K': 1989,
      'L': 1990, 'M': 1991, 'N': 1992, 'P': 1993, 'R': 1994,
      'S': 1995, 'T': 1996, 'V': 1997, 'W': 1998, 'X': 1999,
      'Y': 2000, '1': 2001, '2': 2002, '3': 2003, '4': 2004,
      '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009,
      'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014,
      'F': 2015, 'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019,
      'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024,
      'S': 2025
    };
    return yearMap[code] || null;
  }

  /**
   * ТРИЗ: Извлечение паттернов
   * Чему AI обучится: различия между оплаченными и неоплаченными VIN
   */
  extractPatterns(paidVINs, unpaidVINs) {
    const patterns = {
      conversionFactors: [],
      abandonmentFactors: [],
      recommendations: []
    };

    // Анализируем различия
    const paidMakes = this.getMakeDistribution(paidVINs);
    const unpaidMakes = this.getMakeDistribution(unpaidVINs);

    // Находим паттерны конверсии
    for (const make in paidMakes) {
      const paidCount = paidMakes[make] || 0;
      const unpaidCount = unpaidMakes[make] || 0;
      const total = paidCount + unpaidCount;
      
      if (total > 0) {
        const conversionRate = paidCount / total;
        patterns.conversionFactors.push({
          make,
          conversionRate,
          paidCount,
          unpaidCount
        });
      }
    }

    // Сортируем по конверсии
    patterns.conversionFactors.sort((a, b) => b.conversionRate - a.conversionRate);

    // Генерируем рекомендации
    patterns.recommendations = this.generateRecommendations(patterns);

    return patterns;
  }

  /**
   * Получение распределения по производителям
   */
  getMakeDistribution(vins) {
    const distribution = {};
    
    for (const vinData of vins) {
      const vin = vinData.vin || '';
      if (vin.length >= 3) {
        const wmi = vin.substring(0, 3);
        distribution[wmi] = (distribution[wmi] || 0) + 1;
      }
    }
    
    return distribution;
  }

  /**
   * ТРИЗ: Генерация инсайтов
   * Чему AI обучится: как оптимизировать конверсию
   */
  generateInsights(paidVINs, unpaidVINs) {
    const insights = [];

    // Инсайт 1: Популярные производители среди оплаченных
    const paidMakes = this.getMakeDistribution(paidVINs);
    const topPaidMakes = Object.entries(paidMakes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    insights.push({
      type: 'popular-paid-makes',
      message: `Top 5 производителей среди оплаченных: ${topPaidMakes.map(([make]) => make).join(', ')}`,
      action: 'Фокусироваться на этих производителях в SEO контенте'
    });

    // Инсайт 2: Конверсия по времени
    const paidHours = this.getHourDistribution(paidVINs);
    const unpaidHours = this.getHourDistribution(unpaidVINs);
    
    const bestHours = this.findBestConversionHours(paidHours, unpaidHours);
    if (bestHours.length > 0) {
      insights.push({
        type: 'time-optimization',
        message: `Лучшее время для конверсии: ${bestHours.join(', ')} часов`,
        action: 'Оптимизировать контент и CTA для этих часов'
      });
    }

    // Инсайт 3: Различия в паттернах
    if (paidVINs.length > 0 && unpaidVINs.length > 0) {
      insights.push({
        type: 'conversion-patterns',
        message: `Конверсия: ${((paidVINs.length / (paidVINs.length + unpaidVINs.length)) * 100).toFixed(1)}%`,
        action: 'Анализировать различия между оплаченными и неоплаченными VIN'
      });
    }

    return insights;
  }

  /**
   * Получение распределения по часам
   */
  getHourDistribution(vins) {
    const distribution = {};
    
    for (const vinData of vins) {
      const timestamp = vinData.paidAt || vinData.viewedAt;
      if (timestamp) {
        const date = new Date(timestamp);
        const hour = date.getHours();
        distribution[hour] = (distribution[hour] || 0) + 1;
      }
    }
    
    return distribution;
  }

  /**
   * Поиск лучших часов для конверсии
   */
  findBestConversionHours(paidHours, unpaidHours) {
    const bestHours = [];
    
    for (let hour = 0; hour < 24; hour++) {
      const paid = paidHours[hour] || 0;
      const unpaid = unpaidHours[hour] || 0;
      const total = paid + unpaid;
      
      if (total > 0) {
        const rate = paid / total;
        if (rate > 0.5) { // Конверсия > 50%
          bestHours.push(hour);
        }
      }
    }
    
    return bestHours;
  }

  /**
   * Генерация рекомендаций
   */
  generateRecommendations(patterns) {
    const recommendations = [];

    // Рекомендация 1: Фокус на высококонвертируемых производителях
    const topConverters = patterns.conversionFactors.slice(0, 3);
    if (topConverters.length > 0) {
      recommendations.push({
        type: 'content-focus',
        message: `Фокусироваться на производителях: ${topConverters.map(c => c.make).join(', ')}`,
        reason: 'Высокая конверсия'
      });
    }

    // Рекомендация 2: Оптимизация для низкоконвертируемых
    const lowConverters = patterns.conversionFactors
      .filter(c => c.conversionRate < 0.3 && c.unpaidCount > 5)
      .slice(0, 3);
    
    if (lowConverters.length > 0) {
      recommendations.push({
        type: 'optimization-needed',
        message: `Требуется оптимизация для: ${lowConverters.map(c => c.make).join(', ')}`,
        reason: 'Низкая конверсия'
      });
    }

    return recommendations;
  }

  /**
   * Сохранение данных для обучения
   */
  async saveTrainingData(trainingData) {
    const knowledgeBasePath = path.join(this.trainingDataPath, 'knowledge-base.jsonl');
    
    const knowledge = {
      phase: 'vin-collection-training',
      type: 'user-behavior-patterns',
      ingestedAt: new Date().toISOString(),
      data: trainingData,
      note: 'Training data from collected VIN codes (paid and unpaid)'
    };

    try {
      fs.appendFileSync(knowledgeBasePath, JSON.stringify(knowledge) + '\n', 'utf8');
      log('VIN-COLLECTION-TRAINING', 'Training data saved to knowledge base');
    } catch (e) {
      log('VIN-COLLECTION-TRAINING', `Error saving training data: ${e.message}`);
    }
  }
}

module.exports = { VINCollectionTraining };


