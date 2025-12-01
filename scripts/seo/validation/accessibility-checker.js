const { log } = require('../logger');
let JSDOM;
try {
  JSDOM = require('jsdom').JSDOM;
} catch (e) {
  log('ACCESSIBILITY', 'jsdom not available, accessibility check will be limited');
}

/**
 * SEO MONSTER 6.0: Accessibility Checker
 * Проверка accessibility (Кузов - Structure)
 */
class AccessibilityChecker {
  constructor(config) {
    this.config = config;
    this.issues = [];
  }

  /**
   * Проверка accessibility страницы
   */
  check(html, pageUrl = '') {
    this.issues = [];

    if (!JSDOM) {
      this.issues.push({
        type: 'check_limited',
        message: 'jsdom not available, using basic checks',
        severity: 'warning'
      });
      return this.basicCheck(html);
    }

    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // 1. Проверка ARIA атрибутов
      this.checkARIA(document);

      // 2. Проверка контрастности цветов
      this.checkColorContrast(document);

      // 3. Проверка навигации с клавиатуры
      this.checkKeyboardNavigation(document);

      // 4. Проверка альтернативного текста
      this.checkAlternativeText(document);

      // 5. Проверка заголовков
      this.checkHeadings(document);

      // 6. Проверка форм
      this.checkForms(document);

      // 7. Проверка фокуса
      this.checkFocus(document);

      return {
        score: this.calculateScore(),
        issues: this.issues,
        level: this.getLevel()
      };
    } catch (e) {
      log('ACCESSIBILITY', `Check error for ${pageUrl}: ${e.message}`);
      return {
        score: 0,
        issues: [{ type: 'parse_error', message: e.message }],
        level: 'F'
      };
    }
  }

  /**
   * Базовая проверка без jsdom
   */
  basicCheck(html) {
    // Проверка через regex
    const imgAltRegex = /<img[^>]*>/g;
    const images = html.match(imgAltRegex) || [];
    let missingAlt = 0;

    for (const img of images) {
      if (!img.includes('alt=')) {
        missingAlt++;
      }
    }

    if (missingAlt > 0) {
      this.issues.push({
        type: 'alternative_text',
        issue: 'missing_alt',
        count: missingAlt,
        severity: 'error'
      });
    }

    return {
      score: this.calculateScore(),
      issues: this.issues,
      level: this.getLevel()
    };
  }

  /**
   * Проверка ARIA атрибутов
   */
  checkARIA(document) {
    // Проверка aria-label для интерактивных элементов без текста
    const interactiveElements = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
    
    for (const element of interactiveElements) {
      const hasText = element.textContent.trim().length > 0;
      const hasAriaLabel = element.hasAttribute('aria-label');
      const hasAriaLabelledBy = element.hasAttribute('aria-labelledby');

      if (!hasText && !hasAriaLabel && !hasAriaLabelledBy) {
        this.issues.push({
          type: 'aria',
          issue: 'missing_aria_label',
          element: element.tagName,
          severity: 'error'
        });
      }
    }

    // Проверка aria-hidden на важных элементах
    const hiddenImportant = document.querySelectorAll('[aria-hidden="true"]');
    for (const element of hiddenImportant) {
      if (element.tagName === 'MAIN' || element.tagName === 'NAV') {
        this.issues.push({
          type: 'aria',
          issue: 'important_element_hidden',
          element: element.tagName,
          severity: 'error'
        });
      }
    }
  }

  /**
   * Проверка контрастности (упрощенная)
   */
  checkColorContrast(document) {
    // Проверка наличия цветов с низким контрастом
    const style = document.createElement('style');
    style.textContent = `
      * { color: inherit; background-color: inherit; }
    `;
    document.head.appendChild(style);

    // Проверка использования только цвета для передачи информации
    const colorOnlyElements = document.querySelectorAll('[style*="color"]');
    for (const element of colorOnlyElements) {
      const style = element.getAttribute('style') || '';
      if (style.includes('color:') && !style.includes('text-decoration')) {
        this.issues.push({
          type: 'color_contrast',
          issue: 'color_only_info',
          severity: 'warning'
        });
      }
    }
  }

  /**
   * Проверка навигации с клавиатуры
   */
  checkKeyboardNavigation(document) {
    // Проверка tabindex
    const negativeTabindex = document.querySelectorAll('[tabindex="-1"]');
    for (const element of negativeTabindex) {
      if (element.tagName === 'A' || element.tagName === 'BUTTON') {
        this.issues.push({
          type: 'keyboard_navigation',
          issue: 'negative_tabindex_on_interactive',
          element: element.tagName,
          severity: 'error'
        });
      }
    }

    // Проверка фокусируемых элементов
    const focusable = document.querySelectorAll('a, button, input, select, textarea, [tabindex]');
    for (const element of focusable) {
      const computedStyle = element.style;
      if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
        this.issues.push({
          type: 'keyboard_navigation',
          issue: 'hidden_focusable',
          element: element.tagName,
          severity: 'warning'
        });
      }
    }
  }

  /**
   * Проверка альтернативного текста
   */
  checkAlternativeText(document) {
    const images = document.querySelectorAll('img');
    for (const img of images) {
      const alt = img.getAttribute('alt');
      const ariaLabel = img.getAttribute('aria-label');
      const ariaLabelledBy = img.getAttribute('aria-labelledby');

      if (!alt && !ariaLabel && !ariaLabelledBy) {
        this.issues.push({
          type: 'alternative_text',
          issue: 'missing_alt',
          severity: 'error'
        });
      }

      // Проверка декоративных изображений
      if (alt === '' && !img.hasAttribute('role') || img.getAttribute('role') !== 'presentation') {
        // Пустой alt для декоративных изображений - это нормально
      }
    }

    // Проверка iframe
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      const title = iframe.getAttribute('title');
      if (!title) {
        this.issues.push({
          type: 'alternative_text',
          issue: 'missing_iframe_title',
          severity: 'error'
        });
      }
    }
  }

  /**
   * Проверка заголовков
   */
  checkHeadings(document) {
    const h1 = document.querySelector('h1');
    if (!h1) {
      this.issues.push({
        type: 'headings',
        issue: 'missing_h1',
        severity: 'error'
      });
    }

    // Проверка логической последовательности
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;
    for (const heading of headings) {
      const level = parseInt(heading.tagName.substring(1));
      if (previousLevel > 0 && level > previousLevel + 1) {
        this.issues.push({
          type: 'headings',
          issue: 'skipped_level',
          from: previousLevel,
          to: level,
          severity: 'warning'
        });
      }
      previousLevel = level;
    }
  }

  /**
   * Проверка форм
   */
  checkForms(document) {
    const forms = document.querySelectorAll('form');
    for (const form of forms) {
      const inputs = form.querySelectorAll('input, textarea, select');
      for (const input of inputs) {
        const id = input.getAttribute('id');
        const name = input.getAttribute('name');
        const label = form.querySelector(`label[for="${id}"]`);
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledBy = input.getAttribute('aria-labelledby');

        if (!label && !ariaLabel && !ariaLabelledBy && input.type !== 'hidden') {
          this.issues.push({
            type: 'forms',
            issue: 'missing_label',
            inputType: input.type || input.tagName,
            severity: 'error'
          });
        }

        // Проверка обязательных полей
        if (input.hasAttribute('required') && !input.hasAttribute('aria-required')) {
          this.issues.push({
            type: 'forms',
            issue: 'missing_aria_required',
            severity: 'warning'
          });
        }
      }
    }
  }

  /**
   * Проверка фокуса
   */
  checkFocus(document) {
    // Проверка видимых индикаторов фокуса
    const style = document.createElement('style');
    style.textContent = `
      *:focus { outline: none !important; }
    `;
    
    // Проверка элементов, которые могут скрывать outline
    const noOutline = document.querySelectorAll('[style*="outline: none"], [style*="outline:none"]');
    if (noOutline.length > 0) {
      this.issues.push({
        type: 'focus',
        issue: 'no_focus_indicator',
        count: noOutline.length,
        severity: 'warning'
      });
    }
  }

  /**
   * Расчет оценки accessibility
   */
  calculateScore() {
    const errors = this.issues.filter(i => i.severity === 'error').length;
    const warnings = this.issues.filter(i => i.severity === 'warning').length;

    const errorPenalty = errors * 0.1;
    const warningPenalty = warnings * 0.05;

    return Math.max(0, Math.min(1, 1 - errorPenalty - warningPenalty));
  }

  /**
   * Получение уровня accessibility
   */
  getLevel() {
    const score = this.calculateScore();
    if (score >= 0.9) return 'AAA';
    if (score >= 0.8) return 'AA';
    if (score >= 0.7) return 'A';
    return 'F';
  }

  /**
   * Проверка батча страниц
   */
  checkBatch(pages) {
    const results = [];
    for (const page of pages) {
      if (page.html) {
        const check = this.check(page.html, page.url);
        results.push({
          url: page.url,
          ...check
        });
      }
    }

    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const levelCounts = {};
    for (const r of results) {
      levelCounts[r.level] = (levelCounts[r.level] || 0) + 1;
    }

    return {
      results,
      summary: {
        total: results.length,
        avgScore,
        levelCounts,
        totalIssues: results.reduce((sum, r) => sum + r.issues.length, 0)
      }
    };
  }
}

module.exports = { AccessibilityChecker };

