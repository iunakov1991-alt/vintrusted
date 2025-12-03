/**
 * Скрипт для генерации примера статьи с новыми настройками
 */

const ContentGenerator = require('../core/modules/content-generator');

// Загружаем конфиг
let config;
try {
  config = require('../../config/monster.config.json');
} catch (e) {
  config = {
    modules: {
      aiKnowledgeCore: {
        model: 'phi3'
      }
    }
  };
}
const path = require('path');
const fs = require('fs');

async function generateExampleArticle() {
  console.log('🚀 Генерация примера гениальной SEO статьи...\n');

  const generator = new ContentGenerator(config);
  
  // Создаем тестовый контекст
  const context = {
    intent: 'vin_check',
    theme: 'VIN Check',
    keywords: ['vin check', 'vehicle history', 'car history report', 'vin decoder'],
    index: 0
  };

  // Создаем тестовый промпт
  const prompt = `Generate a comprehensive, expert-level article about VIN checks and vehicle history reports.`;

  try {
    console.log('📝 Генерация контента...\n');
    
    // Генерируем секции
    const sections = generator.generateSections(context);
    
    // Генерируем контент
    const content = generator.buildPage(
      {
        title: 'Complete Guide to VIN Check - Vehicle History Reports Explained',
        h1: 'Complete Guide to VIN Check',
        metaDescription: 'Learn everything about VIN checks and vehicle history reports. Get expert insights, avoid common mistakes, and make informed decisions.',
        sections: sections
      },
      context,
      { priority: 'high', type: 'vin_check' }
    );

    // Сохраняем в тестовый файл
    const outputPath = path.join(process.cwd(), 'example-article.html');
    fs.writeFileSync(outputPath, content.html, 'utf8');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ СТАТЬЯ СГЕНЕРИРОВАНА!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n📄 Файл сохранен: ${outputPath}`);
    console.log(`\n📊 Статистика:`);
    console.log(`   • Title: ${content.content.title}`);
    console.log(`   • H1: ${content.content.h1}`);
    console.log(`   • Секций: ${content.content.sections?.length || 0}`);
    console.log(`   • FAQ вопросов: ${content.content.sections?.find(s => s.type === 'faq')?.questions?.length || 0}`);
    console.log(`\n🔗 Откройте файл в браузере для просмотра!`);
    
    // Показываем первые 2000 символов HTML для предпросмотра
    const preview = content.html.substring(0, 2000);
    console.log(`\n📋 ПРЕВЬЮ (первые 2000 символов):`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(preview);
    console.log('...\n');

  } catch (error) {
    console.error('❌ Ошибка генерации:', error.message);
    console.error(error.stack);
  }
}

// Запуск
if (require.main === module) {
  generateExampleArticle();
}

module.exports = generateExampleArticle;

