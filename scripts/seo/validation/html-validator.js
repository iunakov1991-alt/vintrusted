const { log, error } = require('../logger');
let JSDOM;
try {
  JSDOM = require('jsdom').JSDOM;
} catch (e) {
  log('HTML-VALIDATOR', 'jsdom not available, validation will be limited');
}

/**
 * SEO MONSTER 6.0: HTML Validator
 * Валидация HTML структуры (Кузов - Structure)
 */
class HTMLValidator {
  constructor(config) {
    this.config = config;
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Валидация HTML страницы
   */
  validate(html, pageUrl = '') {
    this.errors = [];
    this.warnings = [];

    if (!JSDOM) {
      this.warnings.push({
        type: 'validation_limited',
        message: 'jsdom not available, using basic validation',
        severity: 'warning'
      });
      return this.basicValidation(html);
    }

    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // 1. Проверка обязательных элементов
      this.validateRequiredElements(document);

      // 2. Проверка структуры заголовков
      this.validateHeadingStructure(document);

      // 3. Проверка мета-тегов
      this.validateMetaTags(document);

      // 4. Проверка ссылок
      this.validateLinks(document);

      // 5. Проверка изображений
      this.validateImages(document);

      // 6. Проверка семантической структуры
      this.validateSemanticStructure(document);

      // 7. Проверка валидности HTML5
      this.validateHTML5Structure(document);

      return {
        valid: this.errors.length === 0,
        errors: this.errors,
        warnings: this.warnings,
        score: this.calculateScore()
      };
    } catch (e) {
      error('HTML-VALIDATOR', `Validation error for ${pageUrl}: ${e.message}`);
      return {
        valid: false,
        errors: [{ type: 'parse_error', message: e.message }],
        warnings: [],
        score: 0
      };
    }
  }

  /**
   * Базовая валидация без jsdom
   */
  basicValidation(html) {
    // Проверка обязательных элементов через regex
    const checks = {
      'html': /<html/i,
      'head': /<head/i,
      'body': /<body/i,
      'title': /<title/i,
      'h1': /<h1/i
    };

    for (const [element, regex] of Object.entries(checks)) {
      if (!regex.test(html)) {
        this.errors.push({
          type: 'missing_element',
          element,
          severity: 'error'
        });
      }
    }

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      score: this.calculateScore()
    };
  }

  /**
   * Проверка обязательных элементов
   */
  validateRequiredElements(document) {
    const required = {
      'html': 'HTML root element',
      'head': 'HEAD element',
      'body': 'BODY element',
      'title': 'TITLE element',
      'meta[charset]': 'Charset meta tag',
      'h1': 'H1 heading'
    };

    for (const [selector, name] of Object.entries(required)) {
      const element = document.querySelector(selector);
      if (!element) {
        this.errors.push({
          type: 'missing_element',
          element: name,
          selector,
          severity: 'error'
        });
      }
    }
  }

  /**
   * Проверка структуры заголовков
   */
  validateHeadingStructure(document) {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const h1Count = document.querySelectorAll('h1').length;

    // Должен быть ровно один H1
    if (h1Count === 0) {
      this.errors.push({
        type: 'heading_structure',
        issue: 'missing_h1',
        severity: 'error'
      });
    } else if (h1Count > 1) {
      this.warnings.push({
        type: 'heading_structure',
        issue: 'multiple_h1',
        count: h1Count,
        severity: 'warning'
      });
    }

    // Проверка последовательности заголовков
    let previousLevel = 0;
    for (const heading of headings) {
      const level = parseInt(heading.tagName.substring(1));
      if (previousLevel > 0 && level > previousLevel + 1) {
        this.warnings.push({
          type: 'heading_structure',
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
   * Проверка мета-тегов
   */
  validateMetaTags(document) {
    const metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      this.warnings.push({
        type: 'meta_tags',
        issue: 'missing_description',
        severity: 'warning'
      });
    } else {
      const content = metaDescription.getAttribute('content') || '';
      if (content.length < 120 || content.length > 160) {
        this.warnings.push({
          type: 'meta_tags',
          issue: 'description_length',
          length: content.length,
          severity: 'warning'
        });
      }
    }

    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      this.warnings.push({
        type: 'meta_tags',
        issue: 'missing_viewport',
        severity: 'warning'
      });
    }
  }

  /**
   * Проверка ссылок
   */
  validateLinks(document) {
    const links = document.querySelectorAll('a[href]');
    let emptyLinks = 0;
    let brokenLinks = 0;

    for (const link of links) {
      const href = link.getAttribute('href');
      
      if (!href || href.trim() === '' || href === '#') {
        emptyLinks++;
      }

      // Проверка внешних ссылок на rel="noopener"
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        if (!link.hasAttribute('rel') || !link.getAttribute('rel').includes('noopener')) {
          this.warnings.push({
            type: 'links',
            issue: 'missing_noopener',
            href,
            severity: 'warning'
          });
        }
      }
    }

    if (emptyLinks > 0) {
      this.warnings.push({
        type: 'links',
        issue: 'empty_links',
        count: emptyLinks,
        severity: 'warning'
      });
    }
  }

  /**
   * Проверка изображений
   */
  validateImages(document) {
    const images = document.querySelectorAll('img');
    let missingAlt = 0;
    let missingSrc = 0;

    for (const img of images) {
      if (!img.hasAttribute('src') || !img.getAttribute('src')) {
        missingSrc++;
      }

      if (!img.hasAttribute('alt')) {
        missingAlt++;
      }
    }

    if (missingSrc > 0) {
      this.errors.push({
        type: 'images',
        issue: 'missing_src',
        count: missingSrc,
        severity: 'error'
      });
    }

    if (missingAlt > 0) {
      this.warnings.push({
        type: 'images',
        issue: 'missing_alt',
        count: missingAlt,
        severity: 'warning'
      });
    }
  }

  /**
   * Проверка семантической структуры
   */
  validateSemanticStructure(document) {
    const semanticElements = [
      'header', 'nav', 'main', 'article', 'section', 'aside', 'footer'
    ];

    const hasMain = document.querySelector('main');
    if (!hasMain) {
      this.warnings.push({
        type: 'semantic_structure',
        issue: 'missing_main',
        severity: 'warning'
      });
    }

    // Проверка использования article/section
    const articles = document.querySelectorAll('article');
    const sections = document.querySelectorAll('section');
    
    if (articles.length === 0 && sections.length === 0) {
      this.warnings.push({
        type: 'semantic_structure',
        issue: 'no_semantic_containers',
        severity: 'warning'
      });
    }
  }

  /**
   * Проверка HTML5 структуры
   */
  validateHTML5Structure(document) {
    const doctype = document.doctype;
    if (!doctype || doctype.name !== 'html') {
      this.errors.push({
        type: 'html5_structure',
        issue: 'invalid_doctype',
        severity: 'error'
      });
    }

    const lang = document.documentElement.getAttribute('lang');
    if (!lang) {
      this.warnings.push({
        type: 'html5_structure',
        issue: 'missing_lang',
        severity: 'warning'
      });
    }
  }

  /**
   * Расчет оценки валидности
   */
  calculateScore() {
    const totalIssues = this.errors.length + this.warnings.length;
    if (totalIssues === 0) return 1.0;

    const errorWeight = 0.7;
    const warningWeight = 0.3;
    const errorScore = Math.max(0, 1 - (this.errors.length * errorWeight) / 10);
    const warningScore = Math.max(0, 1 - (this.warnings.length * warningWeight) / 20);

    return (errorScore * 0.7 + warningScore * 0.3);
  }

  /**
   * Валидация батча страниц
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
    const validCount = results.filter(r => r.valid).length;

    return {
      results,
      summary: {
        total: results.length,
        valid: validCount,
        invalid: results.length - validCount,
        avgScore,
        totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
        totalWarnings: results.reduce((sum, r) => sum + r.warnings.length, 0)
      }
    };
  }
}

module.exports = { HTMLValidator };

