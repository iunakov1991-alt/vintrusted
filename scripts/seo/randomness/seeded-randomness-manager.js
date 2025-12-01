const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Seeded Randomness Manager
 * Управление случайностью для воспроизводимости и разнообразия (ТРИЗ приоритет #8)
 */
class SeededRandomnessManager {
  constructor(config) {
    this.config = config;
    this.seeds = new Map(); // context -> seed
    this.generators = new Map(); // context -> PRNG instance
    this.defaultSeed = config.seededRandomness?.defaultSeed || Date.now();
  }

  /**
   * Получение генератора для контекста
   */
  getGenerator(context) {
    const contextKey = this.getContextKey(context);
    
    if (!this.generators.has(contextKey)) {
      const seed = this.getSeedForContext(context);
      const generator = this.createPRNG(seed);
      this.generators.set(contextKey, generator);
      log('SEEDED-RANDOM', `Created generator for context: ${contextKey} (seed: ${seed})`);
    }

    return this.generators.get(contextKey);
  }

  /**
   * Получение seed для контекста
   */
  getSeedForContext(context) {
    const contextKey = this.getContextKey(context);
    
    if (this.seeds.has(contextKey)) {
      return this.seeds.get(contextKey);
    }

    // Генерируем детерминированный seed на основе контекста
    const seed = this.generateDeterministicSeed(context);
    this.seeds.set(contextKey, seed);
    return seed;
  }

  /**
   * Генерация детерминированного seed
   */
  generateDeterministicSeed(context) {
    const parts = [
      context.module || '',
      context.operation || '',
      context.url || '',
      context.make || '',
      context.year || '',
      context.stateSlug || ''
    ];
    
    const combined = parts.join('|');
    const hash = require('crypto').createHash('md5').update(combined).digest('hex');
    const seed = parseInt(hash.substring(0, 8), 16);
    
    return seed || this.defaultSeed;
  }

  /**
   * Получение ключа контекста
   */
  getContextKey(context) {
    return `${context.module || 'default'}-${context.operation || 'default'}`;
  }

  /**
   * Создание PRNG (Linear Congruential Generator)
   */
  createPRNG(seed) {
    let state = seed;
    
    return {
      seed,
      next() {
        // LCG: (a * state + c) % m
        // Используем параметры из Numerical Recipes
        state = (state * 1664525 + 1013904223) % (2 ** 32);
        return state / (2 ** 32); // Нормализуем до [0, 1)
      },
      nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
      },
      nextFloat(min = 0, max = 1) {
        return this.next() * (max - min) + min;
      },
      choice(array) {
        return array[this.nextInt(0, array.length - 1)];
      },
      shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = this.nextInt(0, i);
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      }
    };
  }

  /**
   * Случайный выбор с seed
   */
  randomChoice(context, array) {
    const generator = this.getGenerator(context);
    return generator.choice(array);
  }

  /**
   * Случайное число с seed
   */
  randomInt(context, min, max) {
    const generator = this.getGenerator(context);
    return generator.nextInt(min, max);
  }

  /**
   * Случайное float с seed
   */
  randomFloat(context, min = 0, max = 1) {
    const generator = this.getGenerator(context);
    return generator.nextFloat(min, max);
  }

  /**
   * Перемешивание массива с seed
   */
  shuffle(context, array) {
    const generator = this.getGenerator(context);
    return generator.shuffle(array);
  }

  /**
   * Взвешенный случайный выбор
   */
  weightedChoice(context, items, weights) {
    const generator = this.getGenerator(context);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = generator.next() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }

    return items[items.length - 1]; // Fallback
  }

  /**
   * Сброс генератора для контекста
   */
  resetContext(context) {
    const contextKey = this.getContextKey(context);
    this.generators.delete(contextKey);
    this.seeds.delete(contextKey);
    log('SEEDED-RANDOM', `Reset generator for context: ${contextKey}`);
  }

  /**
   * Установка seed для контекста (для тестирования)
   */
  setSeedForContext(context, seed) {
    const contextKey = this.getContextKey(context);
    this.seeds.set(contextKey, seed);
    this.generators.delete(contextKey); // Сбросим генератор, чтобы использовать новый seed
    log('SEEDED-RANDOM', `Set seed ${seed} for context: ${contextKey}`);
  }

  /**
   * Получение статистики
   */
  getStats() {
    return {
      contextsCount: this.generators.size,
      seedsCount: this.seeds.size,
      contexts: Array.from(this.generators.keys())
    };
  }
}

module.exports = { SeededRandomnessManager };


