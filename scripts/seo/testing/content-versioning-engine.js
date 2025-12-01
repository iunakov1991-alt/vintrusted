const fs = require('fs');
const path = require('path');
const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Content Versioning & A/B Testing
 * Система версионирования контента и автоматическое A/B тестирование
 */
class ContentVersioningEngine {
  constructor(config) {
    this.config = config;
    this.versionsPath = path.join(process.cwd(), 'data/seo/content-versions.json');
    this.versions = this.loadVersions();
    this.testResults = new Map(); // URL -> test results
  }

  /**
   * Загрузка версий
   */
  loadVersions() {
    if (fs.existsSync(this.versionsPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.versionsPath, 'utf8'));
      } catch (e) {
        log('CONTENT-VERSIONING', `Error loading versions: ${e.message}`);
      }
    }
    return {};
  }

  /**
   * Сохранение версий
   */
  saveVersions() {
    try {
      fs.writeFileSync(this.versionsPath, JSON.stringify(this.versions, null, 2), 'utf8');
    } catch (e) {
      log('CONTENT-VERSIONING', `Error saving versions: ${e.message}`);
    }
  }

  /**
   * Создание версии контента
   */
  createVersion(page, variant = 'A') {
    const url = page.url;
    const versionId = `${url}-${variant}-${Date.now()}`;

    if (!this.versions[url]) {
      this.versions[url] = {
        url,
        variants: {},
        currentVariant: variant,
        createdAt: new Date().toISOString()
      };
    }

    this.versions[url].variants[variant] = {
      versionId,
      content: page.content,
      html: page.html,
      metadata: {
        qualityScore: page.qualityScore,
        createdAt: new Date().toISOString()
      }
    };

    this.saveVersions();
    log('CONTENT-VERSIONING', `Created version ${variant} for ${url}`);
    return versionId;
  }

  /**
   * Создание A/B вариантов
   */
  createABVariants(page) {
    const variantA = {
      ...page,
      variant: 'A',
      content: page.content, // Оригинальный
      metadata: { type: 'control' }
    };

    const variantB = {
      ...page,
      variant: 'B',
      content: this.generateVariantB(page), // Модифицированный
      metadata: { type: 'test' }
    };

    this.createVersion(variantA, 'A');
    this.createVersion(variantB, 'B');

    return { variantA, variantB };
  }

  /**
   * Генерация варианта B
   */
  generateVariantB(page) {
    // В реальности здесь была бы AI для генерации варианта
    // Для now просто модифицируем структуру
    let content = page.content || '';

    // Добавляем больше структуры (заголовки, списки)
    if (!content.includes('##')) {
      content = '## Key Information\n\n' + content;
    }

    return content;
  }

  /**
   * Выбор варианта для тестирования
   */
  selectVariantForTesting(url) {
    const versionData = this.versions[url];
    if (!versionData) {
      return 'A'; // По умолчанию
    }

    // Если есть результаты теста, выбираем лучший
    const testResult = this.testResults.get(url);
    if (testResult) {
      return testResult.winner || 'A';
    }

    // Иначе чередуем A/B
    return versionData.currentVariant === 'A' ? 'B' : 'A';
  }

  /**
   * Регистрация результатов теста
   */
  recordTestResult(url, variant, metrics) {
    if (!this.testResults.has(url)) {
      this.testResults.set(url, {
        url,
        variants: {}
      });
    }

    const result = this.testResults.get(url);
    result.variants[variant] = {
      ...metrics,
      timestamp: new Date().toISOString()
    };

    // Определяем победителя
    const variantA = result.variants['A'];
    const variantB = result.variants['B'];

    if (variantA && variantB) {
      const scoreA = this.calculateVariantScore(variantA);
      const scoreB = this.calculateVariantScore(variantB);
      
      result.winner = scoreB > scoreA ? 'B' : 'A';
      result.confidence = Math.abs(scoreB - scoreA);
    }

    log('CONTENT-VERSIONING', `Recorded test result for ${url}, winner: ${result.winner}`);
  }

  /**
   * Вычисление score варианта
   */
  calculateVariantScore(variant) {
    let score = 0;

    // Conversion rate (50%)
    score += (variant.conversionRate || 0) * 0.5;

    // CTR (30%)
    score += (variant.ctr || 0) * 30; // Нормализуем CTR

    // Engagement (20%)
    score += (variant.engagement || 0) * 0.2;

    return score;
  }

  /**
   * Получение лучшей версии
   */
  getBestVersion(url) {
    const versionData = this.versions[url];
    if (!versionData) {
      return null;
    }

    const testResult = this.testResults.get(url);
    const bestVariant = testResult?.winner || versionData.currentVariant || 'A';

    return versionData.variants[bestVariant];
  }

  /**
   * Получение статистики
   */
  getStats() {
    const totalPages = Object.keys(this.versions).length;
    const pagesWithTests = Array.from(this.testResults.keys()).length;
    const winners = {
      A: 0,
      B: 0
    };

    for (const [url, result] of this.testResults.entries()) {
      if (result.winner) {
        winners[result.winner]++;
      }
    }

    return {
      totalPages,
      pagesWithTests,
      winners,
      avgConfidence: pagesWithTests > 0
        ? Array.from(this.testResults.values()).reduce((sum, r) => sum + (r.confidence || 0), 0) / pagesWithTests
        : 0
    };
  }
}

module.exports = { ContentVersioningEngine };


