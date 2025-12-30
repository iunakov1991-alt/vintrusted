#!/usr/bin/env node

/**
 * MONSTER 7.1 — ТЕСТ ГЕНЕРАЦИИ ОДНОЙ СТРАНИЦЫ
 * 
 * Тестирует SectionedContentGenerator:
 * - Генерация по секциям
 * - Сборка финальной страницы
 * - Сохранение на диск
 */

const path = require('path');
const config = require('../../config/monster-7.1.config.json');
const SectionedContentGenerator = require('../core/modules/content-generator-sectioned');

async function testGenerateSinglePage() {
  console.log('🧪 Тест генерации одной страницы (Monster 7.1)\n');

  try {
    // Инициализация генератора
    const generator = new SectionedContentGenerator(config);
    console.log('✅ SectionedContentGenerator инициализирован\n');

    // Контекст для генерации
    const priority = {
      type: 'vin_check',
      theme: 'VIN Check',
      intent: 'vin_check',
      keywords: ['VIN check', 'vehicle history', 'VIN lookup']
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
    console.log('🤖 Генерация страницы по секциям...');
    console.log('   (Это может занять 5-10 минут для 10-15 AI-вызовов)\n');

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
    const slug = 'vin-check-test';
    console.log('💾 Сохранение страницы...');
    const saved = await generator.savePage(page, slug);
    console.log(`✅ Страница сохранена: ${saved.path}\n`);

    console.log('🎉 Тест завершён успешно!');
    console.log(`\n📄 Страница доступна по пути: public/seo-pages/${slug}/index.html`);

  } catch (error) {
    console.error('\n❌ Ошибка при тестировании:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Запуск теста
if (require.main === module) {
  testGenerateSinglePage().catch(error => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });
}

module.exports = { testGenerateSinglePage };
















