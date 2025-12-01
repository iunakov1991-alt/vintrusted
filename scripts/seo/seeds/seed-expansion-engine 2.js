const fs = require('fs');
const path = require('path');
const { log } = require('../logger');
const { SeedAnalyzer } = require('./seed-analyzer');
const { SeedGenerator } = require('./seed-generator');

/**
 * Seed Expansion Engine - главный модуль автоматического расширения seed-list
 * Выполняется перед каждым SEO-билдом
 */
class SeedExpansionEngine {
  constructor(config) {
    this.config = config;
    this.analyzer = new SeedAnalyzer(config);
    this.generator = new SeedGenerator(config);
    this.seedsPath = path.join(process.cwd(), 'data/seo/url-seeds.json');
  }

  /**
   * Главный метод: расширение seed-list перед билдом
   */
  async expandSeedsBeforeBuild() {
    log('SEED-EXPANSION', 'Starting seed expansion before build...');
    const startTime = Date.now();
    const maxDuration = 60 * 1000; // 1 минута максимум для seed expansion

    try {
      // 1. Анализ текущего состояния (с таймаутом)
      const analysisPromise = Promise.race([
        Promise.resolve(this.analyzer.performFullAnalysis()),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Analysis timeout after 30 seconds')), 30000)
        )
      ]);
      
      const analysis = await analysisPromise;
      
      // Проверка общего таймаута
      if (Date.now() - startTime > maxDuration) {
        log('SEED-EXPANSION', 'Seed expansion timeout, using fallback');
        return this.getFallbackResult();
      }
      
      // 2. Генерация расширенного seed-list через AI (уже с таймаутом внутри)
      const expansionResult = await this.generator.generateExpandedSeeds(analysis);

      // Проверка общего таймаута
      if (Date.now() - startTime > maxDuration) {
        log('SEED-EXPANSION', 'Seed expansion timeout after AI generation, using result');
      }

      // 3. Сохранение нового seed-list
      await this.saveExpandedSeeds(expansionResult.expanded_seed_list);

      // 4. Логирование изменений
      this.logExpansionResult(expansionResult);

      const duration = Date.now() - startTime;
      log('SEED-EXPANSION', `Seed expansion complete in ${Math.round(duration / 1000)}s. Recommended build volume: ${expansionResult.recommended_build_volume}`);

      return expansionResult;

    } catch (e) {
      const duration = Date.now() - startTime;
      log('SEED-EXPANSION', `Error during seed expansion after ${Math.round(duration / 1000)}s: ${e.message}`);
      // В случае ошибки возвращаем fallback
      return this.getFallbackResult();
    }
  }

  /**
   * Сохранение расширенного seed-list
   */
  async saveExpandedSeeds(expandedSeeds) {
    try {
      const seedsDir = path.dirname(this.seedsPath);
      if (!fs.existsSync(seedsDir)) {
        fs.mkdirSync(seedsDir, { recursive: true });
      }

      fs.writeFileSync(
        this.seedsPath,
        JSON.stringify(expandedSeeds, null, 2),
        'utf8'
      );

      log('SEED-EXPANSION', `Saved expanded seeds to ${this.seedsPath}`);
    } catch (e) {
      log('SEED-EXPANSION', `Error saving seeds: ${e.message}`);
      throw e;
    }
  }

  /**
   * Логирование результата расширения
   */
  logExpansionResult(result) {
    const diff = result.diff || {};
    const added = diff.added || {};

    log('SEED-EXPANSION', `Expansion result:
      - Recommended build volume: ${result.recommended_build_volume}
      - Added states: ${added.states?.length || 0}
      - Added makes: ${added.makes?.length || 0}
      - Added years: ${added.years?.length || 0}
      - Added VIN examples: ${added.vinExamples?.length || 0}
      - Reasoning: ${result.reasoning || 'N/A'}`);
  }

  /**
   * Fallback результат (если что-то пошло не так)
   */
  getFallbackResult() {
    return {
      recommended_build_volume: 500,
      expanded_seed_list: {
        states: [],
        makes: [],
        years: [],
        vinExamples: []
      },
      reasoning: 'Fallback: using default seed expansion due to error',
      diff: {
        added: {
          states: [],
          makes: [],
          years: [],
          vinExamples: []
        },
        removed: [],
        modified: []
      }
    };
  }

  /**
   * Получение рекомендуемого объема билда
   */
  getRecommendedBuildVolume() {
    try {
      const expansionFile = path.join(process.cwd(), 'data/seo/seed-expansion-result.json');
      if (fs.existsSync(expansionFile)) {
        const result = JSON.parse(fs.readFileSync(expansionFile, 'utf8'));
        return result.recommended_build_volume || 500;
      }
    } catch (e) {
      // Ignore
    }
    return 500; // Default fallback
  }
}

module.exports = { SeedExpansionEngine };

