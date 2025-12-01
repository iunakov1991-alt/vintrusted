const { log } = require('../logger');
const fs = require('fs');
const path = require('path');

/**
 * SEO MONSTER 6.0: Critical CSS Optimizer
 * Оптимизация критического CSS (Кузов - Structure)
 */
class CriticalCSSOptimizer {
  constructor(config) {
    this.config = config;
    this.criticalCSS = '';
    this.deferredCSS = '';
  }

  /**
   * Извлечение критического CSS
   */
  extractCriticalCSS(html, viewport = { width: 1920, height: 1080 }) {
    let JSDOM;
    try {
      JSDOM = require('jsdom').JSDOM;
    } catch (e) {
      log('CRITICAL-CSS', 'jsdom not available, CSS optimization will be limited');
      return {
        critical: '',
        deferred: '',
        external: []
      };
    }

    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Находим все стили
      const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
      const inlineStyles = [];
      const externalStyles = [];

      for (const style of styles) {
        if (style.tagName === 'STYLE') {
          inlineStyles.push(style.textContent);
        } else if (style.tagName === 'LINK') {
          externalStyles.push(style.getAttribute('href'));
        }
      }

      // Определяем критический CSS на основе видимых элементов
      const criticalSelectors = this.identifyCriticalSelectors(document, viewport);
      const criticalCSS = this.extractCSSForSelectors(inlineStyles.join('\n'), criticalSelectors);

      return {
        critical: criticalCSS,
        deferred: this.extractDeferredCSS(inlineStyles.join('\n'), criticalSelectors),
        external: externalStyles
      };
    } catch (e) {
      log('CRITICAL-CSS', `Error extracting critical CSS: ${e.message}`);
      return {
        critical: '',
        deferred: '',
        external: []
      };
    }
  }

  /**
   * Идентификация критических селекторов
   */
  identifyCriticalSelectors(document, viewport) {
    const criticalSelectors = new Set();

    // Элементы выше сгиба (above the fold)
    const aboveFold = this.getAboveFoldElements(document, viewport);

    for (const element of aboveFold) {
      // Добавляем селекторы для элемента и его родителей
      let current = element;
      while (current && current !== document.body) {
        const selector = this.getElementSelector(current);
        if (selector) {
          criticalSelectors.add(selector);
        }
        current = current.parentElement;
      }
    }

    // Обязательные элементы
    const required = ['html', 'body', 'head', 'meta', 'title', 'h1', 'header', 'nav'];
    for (const tag of required) {
      criticalSelectors.add(tag);
    }

    return Array.from(criticalSelectors);
  }

  /**
   * Получение элементов выше сгиба
   */
  getAboveFoldElements(document, viewport) {
    const elements = [];
    const allElements = document.querySelectorAll('*');

    // Упрощенная логика: берем первые видимые элементы
    const visibleElements = Array.from(allElements).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });

    // Берем первые 20 элементов (примерно выше сгиба)
    return visibleElements.slice(0, 20);
  }

  /**
   * Получение селектора элемента
   */
  getElementSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        return `.${classes[0]}`;
      }
    }
    return element.tagName.toLowerCase();
  }

  /**
   * Извлечение CSS для селекторов
   */
  extractCSSForSelectors(css, selectors) {
    const lines = css.split('\n');
    const criticalLines = [];
    let inRule = false;
    let currentSelector = '';

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Проверяем, начинается ли правило с критического селектора
      for (const selector of selectors) {
        if (trimmed.startsWith(selector) || trimmed.includes(selector)) {
          inRule = true;
          currentSelector = selector;
          criticalLines.push(line);
          break;
        }
      }

      if (inRule) {
        if (trimmed.includes('{')) {
          // Начало правила
          criticalLines.push(line);
        } else if (trimmed.includes('}')) {
          // Конец правила
          criticalLines.push(line);
          inRule = false;
        } else if (trimmed && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) {
          // Свойство внутри правила
          criticalLines.push(line);
        }
      }
    }

    return criticalLines.join('\n');
  }

  /**
   * Извлечение отложенного CSS
   */
  extractDeferredCSS(css, criticalSelectors) {
    // Все CSS, кроме критического
    return css; // Упрощенная версия
  }

  /**
   * Инлайн критического CSS в HTML
   */
  inlineCriticalCSS(html, criticalCSS) {
    let JSDOM;
    try {
      JSDOM = require('jsdom').JSDOM;
    } catch (e) {
      log('CRITICAL-CSS', 'jsdom not available, skipping CSS inlining');
      return html;
    }

    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Удаляем старые inline стили если есть
      const existingCritical = document.querySelector('#critical-css');
      if (existingCritical) {
        existingCritical.remove();
      }

      // Добавляем критический CSS в head
      const style = document.createElement('style');
      style.id = 'critical-css';
      style.textContent = criticalCSS;
      document.head.insertBefore(style, document.head.firstChild);

      // Делаем внешние стили асинхронными
      const externalStyles = document.querySelectorAll('link[rel="stylesheet"]');
      for (const link of externalStyles) {
        link.setAttribute('media', 'print');
        link.setAttribute('onload', "this.media='all'");
        link.setAttribute('rel', 'preload');
        link.setAttribute('as', 'style');
      }

      return dom.serialize();
    } catch (e) {
      log('CRITICAL-CSS', `Error inlining CSS: ${e.message}`);
      return html;
    }
  }

  /**
   * Оптимизация CSS файла
   */
  optimizeCSSFile(cssPath) {
    try {
      if (!fs.existsSync(cssPath)) {
        return null;
      }

      let css = fs.readFileSync(cssPath, 'utf8');

      // Удаление комментариев
      css = css.replace(/\/\*[\s\S]*?\*\//g, '');

      // Удаление лишних пробелов
      css = css.replace(/\s+/g, ' ');
      css = css.replace(/;\s*}/g, '}');
      css = css.replace(/\s*{\s*/g, '{');
      css = css.replace(/;\s*/g, ';');

      // Удаление пустых правил
      css = css.replace(/[^{}]+{\s*}/g, '');

      return css;
    } catch (e) {
      log('CRITICAL-CSS', `Error optimizing CSS file: ${e.message}`);
      return null;
    }
  }

  /**
   * Оптимизация страницы
   */
  optimizePage(page) {
    if (!page.html) {
      return page;
    }

    try {
      const critical = this.extractCriticalCSS(page.html);
      const optimizedHTML = this.inlineCriticalCSS(page.html, critical.critical);

      return {
        ...page,
        html: optimizedHTML,
        criticalCSS: critical.critical,
        deferredCSS: critical.deferred,
        cssOptimized: true
      };
    } catch (e) {
      log('CRITICAL-CSS', `Error optimizing page ${page.url}: ${e.message}`);
      return page;
    }
  }

  /**
   * Оптимизация батча страниц
   */
  optimizeBatch(pages) {
    const optimized = [];
    for (const page of pages) {
      optimized.push(this.optimizePage(page));
    }

    const optimizedCount = optimized.filter(p => p.cssOptimized).length;
    log('CRITICAL-CSS', `Optimized ${optimizedCount}/${pages.length} pages`);

    return optimized;
  }
}

module.exports = { CriticalCSSOptimizer };

