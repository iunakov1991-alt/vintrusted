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
    // Используем Build Output API для прямого вывода в .vercel/output/static/
    // Это гарантирует, что файлы попадут в финальный артефакт
    const vercelOutput = path.join(process.cwd(), '.vercel', 'output', 'static');
    this.outputRoot = path.join(vercelOutput, 'vin');
    
    // Также пишем в public/vin для совместимости
    this.publicRoot = path.join(process.cwd(), 'public', 'vin');
  }

  /**
   * Получить путь для статического файла
   * URL: /vin/:vin/:state/
   * File: .vercel/output/static/vin/:vin/:state/index.html
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
   * Получить путь в public/ для совместимости
   */
  getPublicPath(item) {
    const vinDir = path.join(
      this.publicRoot,
      item.vin || 'vin',
      item.stateSlug || 'state'
    );
    return path.join(vinDir, 'index.html');
  }

  /**
   * Записать статический HTML файл
   * Пишем в оба места: .vercel/output/static/ и public/ для совместимости
   */
  writeStaticFile(item, html) {
    // Основной путь через Build Output API
    const outputPath = this.getOutputPath(item);
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, html, 'utf8');
    log('STATIC', `Written (Build Output): ${outputPath}`);
    
    // Также пишем в public/ для совместимости
    const publicPath = this.getPublicPath(item);
    const publicDir = path.dirname(publicPath);
    
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    fs.writeFileSync(publicPath, html, 'utf8');
    log('STATIC', `Written (public): ${publicPath}`);
    
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

