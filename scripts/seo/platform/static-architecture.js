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
    // На Vercel используем .vercel/output/static, локально - public/vin
    const isVercel = !!(process.env.VERCEL || process.env.VERCEL_ENV);
    if (isVercel && process.env.VERCEL) {
      // Build Output API путь
      this.outputRoot = path.join(process.cwd(), '.vercel', 'output', 'static', 'vin');
    } else {
      // Локальный путь
      this.outputRoot = path.join(process.cwd(), 'public', 'vin');
    }
  }

  /**
   * Получить путь для статического файла
   * URL: /vin/:vin/:state/
   * File: public/vin/:vin/:state/index.html
   */
  getOutputPath(item) {
    const vinDir = path.join(
      this.outputRoot,
      item.vin || 'vin',
      item.stateSlug || 'state'
    );
    return path.join(vinDir, 'index.html');
  }

  /**
   * Записать статический HTML файл
   */
  writeStaticFile(item, html) {
    const outputPath = this.getOutputPath(item);
    const dir = path.dirname(outputPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
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
}

module.exports = { StaticArchitecture };

