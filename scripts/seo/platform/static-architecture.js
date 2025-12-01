const fs = require('fs');
const path = require('path');
const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Static Architecture
 * Все страницы генерируются как статический HTML
 * Прямой маппинг URL → static file без rewrites
 */
class StaticArchitecture {
  constructor(config) {
    this.config = config;
    // Пишем только в public/vin - Vercel автоматически соберет файлы оттуда
    // Не используем Build Output API, чтобы избежать проблем с config.json
    this.publicRoot = path.join(process.cwd(), 'public', 'vin');
    this.outputRoot = this.publicRoot; // Используем тот же путь
  }

  /**
   * Получить путь для статического файла
   * URL: /vin/:vin/:state/ (остается прежним для SEO)
   * File: public/vin/:vin/:state/:intent-:lang/index.html (включаем intent и lang в путь файла)
   * Это позволяет хранить разные страницы для разных intents и языков
   */
  getOutputPath(item) {
    // Включаем intent и lang в путь файла, чтобы разные страницы не перезаписывали друг друга
    const intent = item.intent || 'vin_check';
    const lang = item.lang || 'en';
    const vinDir = path.join(
      this.outputRoot,
      item.vin || 'vin',
      item.stateSlug || 'state',
      `${intent}-${lang}`
    );
    return path.join(vinDir, 'index.html');
  }
  
  /**
   * Получить путь в public/ для совместимости
   */
  getPublicPath(item) {
    // Используем тот же путь, что и getOutputPath
    return this.getOutputPath(item);
  }

  /**
   * Записать статический HTML файл
   * Пишем только в public/vin - Vercel автоматически соберет файлы оттуда
   */
  writeStaticFile(item, html) {
    const outputPath = this.getOutputPath(item);
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, html, 'utf8');
    log('STATIC', `Written: ${outputPath}`);
    
    return outputPath;
  }

  /**
   * Проверить существование файла
   */
  fileExists(item) {
    const outputPath = this.getOutputPath(item);
    return fs.existsSync(outputPath);
  }

  /**
   * Получить URL для страницы
   */
  getUrl(item) {
    return `/vin/${item.vin}/${item.stateSlug}/`;
  }

  /**
   * Подсчитать количество существующих страниц
   */
  countExistingPages() {
    if (!fs.existsSync(this.publicRoot)) {
      return 0;
    }

    let count = 0;
    
    try {
      const scanDirectory = (dir) => {
        if (!fs.existsSync(dir)) return;
        
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            scanDirectory(fullPath);
          } else if (entry.isFile() && entry.name === 'index.html') {
            count++;
          }
        }
      };
      
      scanDirectory(this.publicRoot);
    } catch (e) {
      log('STATIC', `Error counting pages: ${e.message}`);
      return 0;
    }
    
    return count;
  }
}

module.exports = { StaticArchitecture };

