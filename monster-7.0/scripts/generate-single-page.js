/**
 * Генерация одной тестовой страницы
 */

const ContentGenerator = require('../core/modules/content-generator');
const path = require('path');
const fs = require('fs');

// Путь к конфигу
const configPath = path.join(process.cwd(), 'config', 'monster.config.json');
if (!fs.existsSync(configPath)) {
  throw new Error(`Config not found at ${configPath}`);
}
const config = require(configPath);

async function generateSinglePage() {
  console.log('🚀 Генерация одной тестовой страницы...\n');
  
  const generator = new ContentGenerator(config);
  
  // Создаем тестовый контекст
  const context = {
    theme: 'vin-check',
    intent: 'vin_check',
    keywords: ['vin check', 'vehicle history', 'car report'],
    index: 0
  };
  
  // Создаем тестовую стратегию
  const strategy = {
    result: {
      priorities: [{
        type: 'vin_check',
        theme: 'vin-check',
        pages: 1,
        priority: 'high',
        keywords: ['vin check', 'vehicle history']
      }]
    }
  };
  
  const semanticMap = {
    keywords: ['vin check', 'vehicle history'],
    intents: ['vin_check']
  };
  
  const prompts = {
    result: {
      prompt: 'Generate expert-level SEO content about VIN checks'
    }
  };
  
  try {
    // Генерируем страницу
    const page = await generator.generatePage(
      strategy.result.priorities[0],
      strategy.result,
      semanticMap,
      prompts,
      0
    );
    
    if (!page) {
      throw new Error('Page generation returned null');
    }
    
    // Сохраняем страницу
    const pages = [page];
    await generator.savePages(pages);
    
    console.log('✅ Страница сгенерирована!');
    console.log(`📄 Путь: ${page.path}`);
    console.log(`📊 Качество: ${(page.qualityScore || 0).toFixed(2)}`);
    console.log(`\n🌐 URL на проде: https://vintrusted.com/seo-pages/${page.path}/`);
    
    return page;
  } catch (error) {
    console.error('❌ Ошибка генерации:', error);
    throw error;
  }
}

// Запуск
if (require.main === module) {
  generateSinglePage()
    .then(() => {
      console.log('\n✅ Готово!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Ошибка:', error);
      process.exit(1);
    });
}

module.exports = generateSinglePage;

