#!/usr/bin/env node

/**
 * MONSTER 7.2 — ГЕНЕРАЦИЯ СТРАНИЦЫ ГИБРИДНЫМ ПОДХОДОМ (Phi-3 + DeepSeek)
 * 
 * Генерирует страницу используя гибридный подход:
 * - Phi-3: простые секции
 * - DeepSeek: введение, заключение, сложные секции, таблицы, FAQ
 */

const path = require('path');
const config = require('../../config/monster-7.1.config.json');
const HybridContentGenerator = require('../core/modules/content-generator-hybrid');

async function generateHybridPage() {
  console.log('🚀 Генерация страницы гибридным подходом (Phi-3 + DeepSeek)\n');

  try {
    // Инициализация генератора
    const generator = new HybridContentGenerator(config);
    console.log('✅ HybridContentGenerator инициализирован\n');

    // Контекст для генерации
    const priority = {
      type: 'vin_check',
      theme: 'VIN Check',
      intent: 'vin_check',
      keywords: ['VIN check', 'vehicle history', 'VIN lookup', 'car history report']
    };

    const context = {
      theme: priority.theme,
      intent: priority.intent,
      keywords: priority.keywords
    };

    console.log('📝 Контекст:');
    console.log(`   Theme: ${context.theme}`);
    console.log(`   Intent: ${context.intent}`);
    console.log(`   Keywords: ${context.keywords.join(', ')}\n`);

    // Генерация страницы
    console.log('🤖 Генерация страницы...');
    console.log('   Phi-3: простые секции (3-8)');
    console.log('   DeepSeek: введение, заключение, сложные секции, таблицы, FAQ\n');

    const startTime = Date.now();
    const page = await generator.generatePage(priority, context);
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000 / 60).toFixed(2);

    console.log(`\n✅ Страница сгенерирована за ${duration} минут\n`);

    // Статистика
    console.log('📊 Статистика:');
    console.log(`   Слов: ${page.wordCount}`);
    console.log(`   Секций: ${page.sections.length}`);
    console.log(`   Таблиц: ${page.tables.length}`);
    console.log(`   FAQ вопросов: ${page.faqQuestions.length}`);
    console.log(`   Качество: ${(page.qualityScore * 100).toFixed(1)}%\n`);

    // Сохранение
    const slug = 'vin-check-hybrid-' + Date.now().toString().slice(-6);
    console.log('💾 Сохранение страницы...');
    const saved = await generator.savePage(page, slug);
    console.log(`✅ Страница сохранена: ${saved.path}\n`);

    // URL для продакшена
    const domain = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'https://vintrusted.com';
    const fullUrl = `${domain}${saved.url}`;

    console.log('🎉 Генерация завершена успешно!');
    console.log(`\n📄 Локальный путь: public/seo-pages/${slug}/index.html`);
    console.log(`🌐 Продакшен URL: ${fullUrl}\n`);

    return {
      slug,
      path: saved.path,
      url: saved.url,
      fullUrl,
      wordCount: page.wordCount,
      qualityScore: page.qualityScore,
      sections: page.sections.length,
      tables: page.tables.length,
      faq: page.faqQuestions.length
    };

  } catch (error) {
    console.error('\n❌ Ошибка при генерации:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Запуск генерации
if (require.main === module) {
  generateHybridPage().catch(error => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });
}

module.exports = { generateHybridPage };






