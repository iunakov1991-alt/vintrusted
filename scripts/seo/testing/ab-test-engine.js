const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: A/B Testing Engine
 * Генерация вариантов страниц и сравнение их производительности
 */
class ABTestEngine {
  constructor(config) {
    this.config = config;
    this.variants = new Map(); // variantId -> { pages: [], metrics: {} }
    this.testGroups = new Map(); // testId -> { variants: [], startDate, endDate }
  }

  /**
   * Создание A/B теста для страницы
   */
  createTest(page, variantCount = 2) {
    const testId = `test_${page.vin}_${page.stateSlug}_${Date.now()}`;
    const variants = [];

    // Генерация вариантов
    for (let i = 0; i < variantCount; i++) {
      const variantId = `${testId}_variant_${i}`;
      const variant = this.generateVariant(page, i, variantCount);
      
      variants.push({
        id: variantId,
        page: variant,
        metrics: {
          views: 0,
          clicks: 0,
          conversions: 0,
          bounceRate: 0,
          timeOnPage: 0
        }
      });

      this.variants.set(variantId, variants[variants.length - 1]);
    }

    this.testGroups.set(testId, {
      id: testId,
      originalPage: page,
      variants: variants,
      startDate: new Date().toISOString(),
      endDate: null,
      status: 'active'
    });

    log('ABTEST', `Created A/B test ${testId} with ${variantCount} variants`);
    return testId;
  }

  /**
   * Генерация варианта страницы
   */
  generateVariant(page, variantIndex, totalVariants) {
    const variant = { ...page };

    // Вариант 1: Изменение layout
    if (variantIndex === 0 && totalVariants >= 2) {
      // Используем альтернативный layout
      const currentLayout = page.layout?.name || 'A';
      const layouts = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
      const currentIndex = layouts.indexOf(currentLayout);
      const nextLayout = layouts[(currentIndex + 1) % layouts.length];
      variant.testLayout = nextLayout;
      variant.variantType = 'layout';
    }

    // Вариант 2: Изменение заголовка
    if (variantIndex === 1 && totalVariants >= 2) {
      variant.testTitle = this.generateAlternativeTitle(page);
      variant.variantType = 'title';
    }

    // Вариант 3: Изменение CTA
    if (variantIndex === 2 && totalVariants >= 3) {
      variant.testCTA = this.generateAlternativeCTA(page);
      variant.variantType = 'cta';
    }

    // Вариант 4: Изменение структуры контента
    if (variantIndex === 3 && totalVariants >= 4) {
      variant.testContentOrder = this.shuffleContentOrder(page);
      variant.variantType = 'content_order';
    }

    variant.variantId = `${page.url}_variant_${variantIndex}`;
    variant.isVariant = true;
    variant.originalUrl = page.url;

    return variant;
  }

  /**
   * Генерация альтернативного заголовка
   */
  generateAlternativeTitle(page) {
    const alternatives = [
      `Complete ${page.year} ${page.make?.toUpperCase()} VIN History Report for ${page.stateSlug}`,
      `Free VIN Check: ${page.year} ${page.make?.toUpperCase()} in ${page.stateSlug}`,
      `${page.stateSlug} Vehicle History: ${page.year} ${page.make?.toUpperCase()} VIN Report`,
      `Get Your ${page.year} ${page.make?.toUpperCase()} VIN Report for ${page.stateSlug}`
    ];
    return alternatives[Math.floor(Math.random() * alternatives.length)];
  }

  /**
   * Генерация альтернативного CTA
   */
  generateAlternativeCTA(page) {
    const alternatives = [
      'Get Full Report Now',
      'Check VIN History',
      'View Complete Report',
      'Run VIN Check',
      'See Vehicle History'
    ];
    return alternatives[Math.floor(Math.random() * alternatives.length)];
  }

  /**
   * Перемешивание порядка контента
   */
  shuffleContentOrder(page) {
    const blocks = [...(page.blocks || [])];
    // Перемешиваем все кроме первого (h1) и последнего (cta)
    if (blocks.length > 3) {
      const middle = blocks.slice(1, -1);
      for (let i = middle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [middle[i], middle[j]] = [middle[j], middle[i]];
      }
      return [blocks[0], ...middle, blocks[blocks.length - 1]];
    }
    return blocks;
  }

  /**
   * Регистрация просмотра варианта
   */
  recordView(variantId) {
    const variant = this.variants.get(variantId);
    if (variant) {
      variant.metrics.views++;
    }
  }

  /**
   * Регистрация клика варианта
   */
  recordClick(variantId) {
    const variant = this.variants.get(variantId);
    if (variant) {
      variant.metrics.clicks++;
    }
  }

  /**
   * Регистрация конверсии варианта
   */
  recordConversion(variantId) {
    const variant = this.variants.get(variantId);
    if (variant) {
      variant.metrics.conversions++;
    }
  }

  /**
   * Обновление метрик варианта
   */
  updateMetrics(variantId, metrics) {
    const variant = this.variants.get(variantId);
    if (variant) {
      variant.metrics = {
        ...variant.metrics,
        ...metrics
      };
    }
  }

  /**
   * Получение результатов теста
   */
  getTestResults(testId) {
    const test = this.testGroups.get(testId);
    if (!test) return null;

    const results = {
      testId: test.id,
      status: test.status,
      startDate: test.startDate,
      endDate: test.endDate,
      variants: []
    };

    for (const variant of test.variants) {
      const metrics = variant.metrics;
      const ctr = metrics.views > 0 ? (metrics.clicks / metrics.views) * 100 : 0;
      const conversionRate = metrics.clicks > 0 ? (metrics.conversions / metrics.clicks) * 100 : 0;

      results.variants.push({
        id: variant.id,
        type: variant.page.variantType,
        metrics: {
          views: metrics.views,
          clicks: metrics.clicks,
          conversions: metrics.conversions,
          ctr: ctr,
          conversionRate: conversionRate,
          bounceRate: metrics.bounceRate,
          timeOnPage: metrics.timeOnPage
        },
        score: this.calculateVariantScore(metrics)
      });
    }

    // Сортировка по score
    results.variants.sort((a, b) => b.score - a.score);
    results.winner = results.variants[0];

    return results;
  }

  /**
   * Расчет score для варианта
   */
  calculateVariantScore(metrics) {
    const ctr = metrics.views > 0 ? (metrics.clicks / metrics.views) : 0;
    const conversionRate = metrics.clicks > 0 ? (metrics.conversions / metrics.clicks) : 0;
    const bounceScore = 1 - (metrics.bounceRate / 100); // Инвертируем bounce rate
    const timeScore = Math.min(metrics.timeOnPage / 300, 1); // 5 минут = максимум

    // Комбинированный score
    return (
      ctr * 0.3 +
      conversionRate * 0.4 +
      bounceScore * 0.2 +
      timeScore * 0.1
    );
  }

  /**
   * Завершение теста и выбор победителя
   */
  concludeTest(testId, minSamples = 100) {
    const test = this.testGroups.get(testId);
    if (!test) return null;

    let totalViews = 0;
    for (const variant of test.variants) {
      totalViews += variant.metrics.views;
    }

    if (totalViews < minSamples) {
      log('ABTEST', `Test ${testId} needs more samples (${totalViews}/${minSamples})`);
      return null;
    }

    const results = this.getTestResults(testId);
    test.status = 'concluded';
    test.endDate = new Date().toISOString();
    test.winner = results.winner;

    log('ABTEST', `Test ${testId} concluded. Winner: ${results.winner.id} (score: ${results.winner.score.toFixed(3)})`);

    return results;
  }

  /**
   * Применение результатов теста к основной странице
   */
  applyWinner(testId, page) {
    const test = this.testGroups.get(testId);
    if (!test || !test.winner) return page;

    const winner = test.winner;
    const winnerVariant = test.variants.find(v => v.id === winner.id);

    if (!winnerVariant) return page;

    const updated = { ...page };

    // Применяем изменения победителя
    if (winnerVariant.page.testLayout) {
      updated.layout = { name: winnerVariant.page.testLayout, blocks: page.layout.blocks };
    }

    if (winnerVariant.page.testTitle) {
      updated.title = winnerVariant.page.testTitle;
    }

    if (winnerVariant.page.testCTA) {
      updated.cta = winnerVariant.page.testCTA;
    }

    if (winnerVariant.page.testContentOrder) {
      updated.blocks = winnerVariant.page.testContentOrder;
    }

    log('ABTEST', `Applied winner changes from test ${testId} to page ${page.url}`);

    return updated;
  }

  /**
   * Получение всех активных тестов
   */
  getActiveTests() {
    return Array.from(this.testGroups.values()).filter(t => t.status === 'active');
  }

  /**
   * Получение статистики по всем тестам
   */
  getTestStatistics() {
    const tests = Array.from(this.testGroups.values());
    const active = tests.filter(t => t.status === 'active').length;
    const concluded = tests.filter(t => t.status === 'concluded').length;

    let totalVariants = 0;
    let totalViews = 0;
    let totalClicks = 0;

    for (const test of tests) {
      totalVariants += test.variants.length;
      for (const variant of test.variants) {
        totalViews += variant.metrics.views;
        totalClicks += variant.metrics.clicks;
      }
    }

    return {
      totalTests: tests.length,
      activeTests: active,
      concludedTests: concluded,
      totalVariants: totalVariants,
      totalViews: totalViews,
      totalClicks: totalClicks,
      avgCTR: totalViews > 0 ? (totalClicks / totalViews) * 100 : 0
    };
  }
}

module.exports = { ABTestEngine };

