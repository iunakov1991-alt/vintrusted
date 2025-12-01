const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Seed Generator
 * Генерирует расширенный seed-list на основе анализа пробелов
 */
class SeedGenerator {
  constructor(config) {
    this.config = config;
  }

  /**
   * Генерация расширенного seed-list
   */
  generate(analysis) {
    log('SEED-GENERATOR', 'Generating expanded seed list');

    const expanded = {
      states: [...analysis.existingCoverage.states],
      makes: [...analysis.existingCoverage.makes],
      years: [...analysis.existingCoverage.years],
      vinExamples: [...analysis.existingCoverage.vins],
      intents: [...analysis.existingCoverage.intents],
      languages: [...analysis.existingCoverage.languages]
    };

    const additions = {
      states: [],
      makes: [],
      years: [],
      vinExamples: [],
      intents: [],
      languages: []
    };

    // Добавляем отсутствующие штаты (топ-10 по приоритету)
    const priorityStates = this.getPriorityStates(analysis.gaps.missingStates);
    priorityStates.slice(0, 10).forEach(state => {
      if (!expanded.states.includes(state)) {
        expanded.states.push(state);
        additions.states.push(state);
      }
    });

    // Добавляем отсутствующие бренды (топ-15)
    analysis.gaps.missingMakes.slice(0, 15).forEach(make => {
      if (!expanded.makes.includes(make)) {
        expanded.makes.push({ slug: make });
        additions.makes.push(make);
      }
    });

    // Добавляем отсутствующие годы (последние 5 лет + популярные)
    const recentYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
    const popularYears = [2015, 2018, 2020, 2022, 2023, 2024];
    const yearsToAdd = [...new Set([...recentYears, ...popularYears])];
    
    yearsToAdd.forEach(year => {
      if (!expanded.years.includes(year)) {
        expanded.years.push(year);
        additions.years.push(year);
      }
    });

    // Генерируем error-VIN вариации
    const errorVINs = this.generateErrorVINs();
    errorVINs.forEach(vin => {
      if (!expanded.vinExamples.includes(vin)) {
        expanded.vinExamples.push(vin);
        additions.vinExamples.push(vin);
      }
    });

    // Добавляем отсутствующие intents
    analysis.gaps.missingIntents.forEach(intent => {
      if (!expanded.intents.includes(intent)) {
        expanded.intents.push(intent);
        additions.intents.push(intent);
      }
    });

    // Добавляем отсутствующие языки
    analysis.gaps.missingLanguages.forEach(lang => {
      if (!expanded.languages.includes(lang)) {
        expanded.languages.push(lang);
        additions.languages.push(lang);
      }
    });

    // Сортируем
    expanded.states.sort();
    expanded.years.sort((a, b) => b - a);

    log('SEED-GENERATOR', `Expanded: +${additions.states.length} states, +${additions.makes.length} makes, +${additions.years.length} years`);

    return {
      expandedSeeds: expanded,
      additions
    };
  }

  /**
   * Приоритетные штаты (по населению и автомобильному рынку)
   */
  getPriorityStates(missingStates) {
    const priority = [
      'california', 'texas', 'florida', 'new-york', 'pennsylvania',
      'illinois', 'ohio', 'georgia', 'north-carolina', 'michigan',
      'new-jersey', 'virginia', 'washington', 'arizona', 'massachusetts',
      'tennessee', 'indiana', 'missouri', 'maryland', 'wisconsin'
    ];

    // Сортируем missingStates по приоритету
    return missingStates.sort((a, b) => {
      const aIndex = priority.indexOf(a);
      const bIndex = priority.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }

  /**
   * Генерация error-VIN вариаций
   */
  generateErrorVINs() {
    const errorVINs = [];

    // VI (I вместо 1)
    errorVINs.push('1HGCM82633A00435I');
    errorVINs.push('4T1BF1FK3FU12345I');

    // O0 (O вместо 0)
    errorVINs.push('1HGCM82633A00435O');
    errorVINs.push('4T1BF1FK3FU12345O');

    // Короткие VIN (15 символов)
    errorVINs.push('1HGCM82633A0043');
    errorVINs.push('4T1BF1FK3FU1234');

    // Неправильный формат
    errorVINs.push('1HGCM82633A004352X'); // 18 символов
    errorVINs.push('1HGCM82633A0043'); // 15 символов

    return errorVINs;
  }
}

module.exports = { SeedGenerator };


