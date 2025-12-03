#!/usr/bin/env node

/**
 * Перегенерация страницы vin-check-0 с учетом обучения
 */

const path = require('path');
const config = require('../../config/monster.config.json');
const ContentGenerator = require('../core/modules/content-generator');
const PromptEngine = require('../core/modules/prompt-engine');
const AIKnowledgeCore = require('../core/ai-knowledge-core/knowledge-core');

async function regenerateVinCheck0() {
  console.log('🔄 Перегенерация страницы vin-check-0 с учетом обучения...\n');

  // Инициализация модулей
  const contentGenerator = new ContentGenerator(config);
  const promptEngine = new PromptEngine(config);
  const knowledgeCore = new AIKnowledgeCore(config);

  // Контекст для генерации
  const context = {
    theme: 'VIN Check',
    intent: 'vin_check',
    keywords: ['VIN check', 'vehicle history report', 'VIN lookup', 'car history'],
    lang: 'en'
  };

  // Генерация промпта с учетом обучения
  const prompt = await promptEngine.generatePrompt(
    { priorities: [{ type: 'vin_check', theme: 'VIN Check', keywords: context.keywords }] },
    context,
    'Generate a genius-level SEO article about VIN checks'
  );

  console.log('📝 Промпт сгенерирован с учетом обучения\n');

  // Генерация контента
  console.log('🤖 Генерация контента через Ollama (это может занять несколько минут)...\n');
  
  const content = await contentGenerator.generateContent(prompt, context);

  // Создание страницы
  const page = await contentGenerator.generatePage(
    {
      type: 'vin_check',
      theme: 'VIN Check',
      keywords: context.keywords,
      pages: 1,
      priority: 'high'
    },
    { priorities: [] },
    {},
    {},
    0
  );

  if (page) {
    console.log('\n✅ Страница успешно перегенерирована!');
    console.log(`   Путь: ${page.path}`);
    console.log(`   Качество: ${(page.qualityScore * 100).toFixed(1)}%`);
    console.log(`   Слов: ${page.wordCount || 'N/A'}`);
    console.log(`   Разделов: ${page.sections?.length || 'N/A'}`);
    console.log(`   FAQ: ${page.faqCount || 'N/A'}`);
  } else {
    console.error('\n❌ Ошибка при генерации страницы');
    process.exit(1);
  }
}

// Запуск
if (require.main === module) {
  regenerateVinCheck0().catch(error => {
    console.error('❌ Ошибка при перегенерации:', error);
    process.exit(1);
  });
}

module.exports = { regenerateVinCheck0 };

