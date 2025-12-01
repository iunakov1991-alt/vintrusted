const { log } = require('../logger');
let JSDOM;
try {
  JSDOM = require('jsdom').JSDOM;
} catch (e) {
  log('MOBILE-VALIDATOR', 'jsdom not available, mobile validation will be limited');
}

/**
 * SEO MONSTER 6.0: Mobile-First Validator
 * Отдельная валидация для мобильной версии страниц
 */
class MobileFirstValidator {
  constructor(config) {
    this.config = config;
    this.mobileViewport = { width: 375, height: 667 }; // iPhone SE размер
  }

  /**
   * Валидация мобильной версии
   */
  validate(html, pageUrl = '') {
    const issues = [];

    if (!JSDOM) {
      return this.basicMobileValidation(html);
    }

    try {
      const dom = new JSDOM(html, {
        url: pageUrl,
        pretendToBeVisual: true,
        resources: 'usable'
      });
      const document = dom.window.document;

      // 1. Проверка viewport meta tag
      this.checkViewport(document, issues);

      // 2. Проверка размера текста
      this.checkTextSize(document, issues);

      // 3. Проверка touch targets
      this.checkTouchTargets(document, issues);

      // 4. Проверка горизонтального скролла
      this.checkHorizontalScroll(document, issues);

      // 5. Проверка мобильных элементов
      this.checkMobileElements(document, issues);

      // 6. Проверка Core Web Vitals для мобильных
      this.checkMobileWebVitals(document, issues);

      return {
        valid: issues.filter(i => i.severity === 'error').length === 0,
        issues,
        score: this.calculateScore(issues),
        mobileFriendly: issues.filter(i => i.severity === 'error').length === 0
      };
    } catch (e) {
      log('MOBILE-VALIDATOR', `Validation error: ${e.message}`);
      return {
        valid: false,
        issues: [{ type: 'parse_error', message: e.message, severity: 'error' }],
        score: 0,
        mobileFriendly: false
      };
    }
  }

  /**
   * Проверка viewport
   */
  checkViewport(document, issues) {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      issues.push({
        type: 'viewport',
        issue: 'missing_viewport',
        severity: 'error',
        message: 'Viewport meta tag is required for mobile-first indexing'
      });
    } else {
      const content = viewport.getAttribute('content') || '';
      if (!content.includes('width=device-width')) {
        issues.push({
          type: 'viewport',
          issue: 'invalid_viewport',
          severity: 'warning',
          message: 'Viewport should include width=device-width'
        });
      }
    }
  }

  /**
   * Проверка размера текста
   */
  checkTextSize(document, issues) {
    // Проверяем, что основной текст читаем на мобильных (минимум 16px)
    const body = document.body;
    if (body) {
      const style = body.style || {};
      const fontSize = style.fontSize || '16px';
      const fontSizeNum = parseInt(fontSize);
      if (fontSizeNum < 16) {
        issues.push({
          type: 'text_size',
          issue: 'small_text',
          severity: 'warning',
          message: `Text size ${fontSize} may be too small for mobile`
        });
      }
    }
  }

  /**
   * Проверка touch targets
   */
  checkTouchTargets(document, issues) {
    const interactiveElements = document.querySelectorAll('a, button, input, select, textarea');
    let smallTargets = 0;

    for (const element of interactiveElements) {
      // Проверяем размер (минимум 44x44px для touch targets)
      const style = element.style || {};
      const width = parseInt(style.width) || 0;
      const height = parseInt(style.height) || 0;
      const padding = parseInt(style.padding) || 0;

      const totalWidth = width + padding * 2;
      const totalHeight = height + padding * 2;

      if (totalWidth > 0 && totalWidth < 44) {
        smallTargets++;
      }
      if (totalHeight > 0 && totalHeight < 44) {
        smallTargets++;
      }
    }

    if (smallTargets > 0) {
      issues.push({
        type: 'touch_targets',
        issue: 'small_touch_targets',
        severity: 'warning',
        message: `Found ${smallTargets} elements with small touch targets (< 44px)`
      });
    }
  }

  /**
   * Проверка горизонтального скролла
   */
  checkHorizontalScroll(document, issues) {
    // Проверяем элементы, которые могут вызвать горизонтальный скролл
    const wideElements = document.querySelectorAll('*');
    let hasWideContent = false;

    for (const element of wideElements) {
      const style = element.style || {};
      const width = parseInt(style.width) || 0;
      if (width > this.mobileViewport.width) {
        hasWideContent = true;
        break;
      }
    }

    if (hasWideContent) {
      issues.push({
        type: 'horizontal_scroll',
        issue: 'wide_content',
        severity: 'warning',
        message: 'Content may cause horizontal scroll on mobile'
      });
    }
  }

  /**
   * Проверка мобильных элементов
   */
  checkMobileElements(document, issues) {
    // Проверяем наличие мобильно-оптимизированных элементов
    const hasMobileMenu = document.querySelector('[class*="mobile-menu"], [class*="hamburger"]');
    if (!hasMobileMenu && document.querySelectorAll('nav a').length > 5) {
      issues.push({
        type: 'mobile_elements',
        issue: 'no_mobile_menu',
        severity: 'info',
        message: 'Consider adding mobile menu for better UX'
      });
    }
  }

  /**
   * Проверка Core Web Vitals для мобильных
   */
  checkMobileWebVitals(document, issues) {
    // Проверяем оптимизацию для мобильных
    const images = document.querySelectorAll('img');
    let unoptimizedImages = 0;

    for (const img of images) {
      const src = img.getAttribute('src') || '';
      const loading = img.getAttribute('loading');
      const srcset = img.getAttribute('srcset');

      // Проверяем lazy loading
      if (!loading && !srcset) {
        unoptimizedImages++;
      }
    }

    if (unoptimizedImages > 0) {
      issues.push({
        type: 'web_vitals',
        issue: 'unoptimized_images',
        severity: 'warning',
        message: `${unoptimizedImages} images may not be optimized for mobile`
      });
    }
  }

  /**
   * Базовая валидация без jsdom
   */
  basicMobileValidation(html) {
    const issues = [];

    // Проверка viewport через regex
    if (!/meta.*name=["']viewport["']/i.test(html)) {
      issues.push({
        type: 'viewport',
        issue: 'missing_viewport',
        severity: 'error'
      });
    }

    return {
      valid: issues.length === 0,
      issues,
      score: issues.length === 0 ? 1 : 0.5,
      mobileFriendly: issues.length === 0
    };
  }

  /**
   * Вычисление score
   */
  calculateScore(issues) {
    const errors = issues.filter(i => i.severity === 'error').length;
    const warnings = issues.filter(i => i.severity === 'warning').length;

    const errorPenalty = errors * 0.2;
    const warningPenalty = warnings * 0.1;

    return Math.max(0, Math.min(1, 1 - errorPenalty - warningPenalty));
  }

  /**
   * Валидация батча
   */
  validateBatch(pages) {
    const results = [];

    for (const page of pages) {
      if (page.html) {
        const validation = this.validate(page.html, page.url);
        results.push({
          url: page.url,
          ...validation
        });
      }
    }

    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const mobileFriendlyCount = results.filter(r => r.mobileFriendly).length;

    return {
      results,
      summary: {
        total: results.length,
        mobileFriendly: mobileFriendlyCount,
        notMobileFriendly: results.length - mobileFriendlyCount,
        avgScore,
        totalIssues: results.reduce((sum, r) => sum + r.issues.length, 0)
      }
    };
  }
}

module.exports = { MobileFirstValidator };


