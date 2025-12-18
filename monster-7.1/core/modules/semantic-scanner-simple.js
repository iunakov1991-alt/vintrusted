/**
 * MONSTER 7.1 — SIMPLE SEMANTIC SCANNER
 * 
 * Упрощённая версия Semantic Scanner для ядра.
 * Быстрый анализ существующих страниц и определение семантических пробелов.
 */

const fs = require('fs');
const path = require('path');

class SemanticScannerSimple {
  constructor(config) {
    this.config = config;
    this.pagesPath = path.join(process.cwd(), 'public/seo-pages');
  }

  async execute(params = {}) {
    try {
      // Сканирование существующих страниц
      const existingPages = this.scanExistingPages();

      // Базовый семантический анализ
      const semanticMap = {
        existing: existingPages.length,
        coverage: this.analyzeCoverage(existingPages),
        gaps: this.identifyGaps(existingPages)
      };

      return {
        result: semanticMap,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`SemanticScanner failed: ${error.message}`);
    }
  }

  /**
   * Сканирование существующих страниц
   */
  scanExistingPages() {
    const pages = [];

    if (!fs.existsSync(this.pagesPath)) {
      return pages;
    }

    const dirs = fs.readdirSync(this.pagesPath, { withFileTypes: true });
    
    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const indexPath = path.join(this.pagesPath, dir.name, 'index.html');
        if (fs.existsSync(indexPath)) {
          try {
            const html = fs.readFileSync(indexPath, 'utf8');
            const titleMatch = html.match(/<title>(.*?)<\/title>/i);
            const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
            
            pages.push({
              slug: dir.name,
              title: titleMatch ? titleMatch[1] : '',
              h1: h1Match ? h1Match[1] : '',
              path: indexPath
            });
          } catch (error) {
            // Пропускаем файлы с ошибками
            continue;
          }
        }
      }
    }

    return pages;
  }

  /**
   * Анализ покрытия тем
   */
  analyzeCoverage(pages) {
    const themes = new Set();
    
    pages.forEach(page => {
      const title = page.title.toLowerCase();
      const h1 = page.h1.toLowerCase();
      
      // Простое извлечение тем из заголовков
      const words = (title + ' ' + h1).split(/\s+/);
      words.forEach(word => {
        if (word.length > 4) {
          themes.add(word);
        }
      });
    });

    return {
      themes: Array.from(themes),
      count: themes.size
    };
  }

  /**
   * Определение пробелов (упрощённо)
   */
  identifyGaps(pages) {
    // Базовые интенты для VIN Trusted
    const baseIntents = [
      'vin_check',
      'accident_check',
      'ownership_history',
      'market_value',
      'dmv_records',
      'title_brand',
      'odometer_rollback',
      'theft_records'
    ];

    const coveredIntents = new Set();
    
    pages.forEach(page => {
      const slug = page.slug.toLowerCase();
      baseIntents.forEach(intent => {
        if (slug.includes(intent.replace('_', ''))) {
          coveredIntents.add(intent);
        }
      });
    });

    const gaps = baseIntents.filter(intent => !coveredIntents.has(intent));

    return {
      intents: gaps,
      count: gaps.length
    };
  }
}

module.exports = SemanticScannerSimple;










