const fs = require('fs');
const path = require('path');
const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Visual Content Optimization
 * Автоматическая оптимизация изображений и визуального контента
 */
class VisualContentOptimizer {
  constructor(config) {
    this.config = config;
    this.optimizationCache = new Map();
  }

  /**
   * Оптимизация изображений в HTML
   */
  optimizeImages(html, pageUrl = '') {
    try {
      const { JSDOM } = require('jsdom');
      const dom = new JSDOM(html);
      const document = dom.window.document;
      const images = document.querySelectorAll('img');
      let optimized = 0;

      for (const img of images) {
        const src = img.getAttribute('src');
        if (!src) continue;

        // Добавляем lazy loading если нет
        if (!img.hasAttribute('loading')) {
          img.setAttribute('loading', 'lazy');
          optimized++;
        }

        // Добавляем width и height если нет (для CLS)
        if (!img.hasAttribute('width') && !img.hasAttribute('height')) {
          img.setAttribute('width', '800');
          img.setAttribute('height', '600');
          optimized++;
        }

        // Проверяем alt text
        if (!img.hasAttribute('alt')) {
          img.setAttribute('alt', this.generateAltText(img, pageUrl));
          optimized++;
        }

        // Оптимизируем src для WebP если возможно
        if (src && !src.includes('.webp') && !src.startsWith('data:')) {
          // В реальности здесь была бы конвертация в WebP
          // Для now просто добавляем атрибут
          img.setAttribute('data-optimize', 'webp');
        }
      }

      if (optimized > 0) {
        log('VISUAL-OPTIMIZER', `Optimized ${optimized} images in ${pageUrl}`);
      }

      return dom.serialize();
    } catch (e) {
      log('VISUAL-OPTIMIZER', `Error optimizing images: ${e.message}`);
      return html;
    }
  }

  /**
   * Генерация alt text
   */
  generateAltText(img, pageUrl) {
    // Пытаемся извлечь из контекста
    const parent = img.parentElement;
    if (parent) {
      const text = parent.textContent || '';
      if (text.length > 0 && text.length < 100) {
        return text.substring(0, 100);
      }
    }

    // Генерируем на основе URL
    const src = img.getAttribute('src') || '';
    const filename = path.basename(src, path.extname(src));
    return filename.replace(/[-_]/g, ' ') || 'Image';
  }

  /**
   * Оптимизация CSS для визуального контента
   */
  optimizeVisualCSS(html) {
    try {
      const { JSDOM } = require('jsdom');
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Добавляем inline стили для критических изображений
      const style = document.createElement('style');
      style.textContent = `
        img {
          max-width: 100%;
          height: auto;
        }
        img[loading="lazy"] {
          content-visibility: auto;
        }
      `;
      document.head.appendChild(style);

      return dom.serialize();
    } catch (e) {
      log('VISUAL-OPTIMIZER', `Error optimizing CSS: ${e.message}`);
      return html;
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
      let optimizedHTML = page.html;

      // Оптимизация изображений
      optimizedHTML = this.optimizeImages(optimizedHTML, page.url);

      // Оптимизация CSS
      optimizedHTML = this.optimizeVisualCSS(optimizedHTML);

      return {
        ...page,
        html: optimizedHTML,
        visualOptimized: true
      };
    } catch (e) {
      log('VISUAL-OPTIMIZER', `Error optimizing page ${page.url}: ${e.message}`);
      return page;
    }
  }

  /**
   * Оптимизация батча
   */
  optimizeBatch(pages) {
    const optimized = [];
    for (const page of pages) {
      optimized.push(this.optimizePage(page));
    }

    const optimizedCount = optimized.filter(p => p.visualOptimized).length;
    log('VISUAL-OPTIMIZER', `Optimized ${optimizedCount}/${pages.length} pages`);

    return optimized;
  }
}

module.exports = { VisualContentOptimizer };


