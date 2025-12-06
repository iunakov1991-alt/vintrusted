#!/usr/bin/env node

/**
 * Генерация одной случайной статьи с ОПТИМИЗАЦИЯМИ (50% быстрее)
 * Использует ArticleGeneratorV6Optimized для ускорения генерации
 */

// Включаем оптимизированную версию ПЕРЕД загрузкой модулей
process.env.USE_OPTIMIZED_GENERATOR = '1';
process.env.MAX_PARALLEL_WORKERS = '12';

// Загружаем и вызываем функцию генерации
const { generateSingleRandomArticle } = require('./generate-single-random-article');

// Запускаем генерацию
if (require.main === module) {
  generateSingleRandomArticle()
    .then(() => {
      const { log } = require('./seo/logger');
      log('OPTIMIZED-TEST', '✅ Optimized generation complete!');
      process.exit(0);
    })
    .catch(err => {
      const { error } = require('./seo/logger');
      error('OPTIMIZED-TEST', `Fatal error: ${err.message}`);
      process.exit(1);
    });
}

