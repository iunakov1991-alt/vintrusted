#!/usr/bin/env node

/**
 * Оптимизированная генерация одной VIN страницы
 * Использует только необходимые модули для максимальной скорости
 */

const fs = require('fs');
const path = require('path');
const { log, error } = require('./seo/logger');

// Загрузка конфигурации
const configPath = path.join(process.cwd(), 'data/seo/config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Временно устанавливаем 1 страницу
config.targetPagesPerBuild = 1;

// Загружаем переменные окружения
if (fs.existsSync(path.join(process.cwd(), '.env.local'))) {
  const envLocal = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
  envLocal.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
}

// Устанавливаем переменные для локального AI
process.env.USE_LOCAL_AI = '1';
process.env.LOCAL_AI_MODEL = 'phi3';
process.env.SEO_BUILD_CONCURRENCY = '1';

async function generateSinglePage() {
  const startTime = Date.now();
  
  console.log('🚀 Запуск оптимизированной генерации одной VIN страницы...\n');
  console.log('📊 Конфигурация:');
  console.log(`   Target pages: ${config.targetPagesPerBuild}`);
  console.log(`   M1 Optimization: ${config.features.m1Optimization}`);
  console.log(`   Local AI: ${config.features.localAI}`);
  console.log(`   AI Model: ${process.env.LOCAL_AI_MODEL || 'phi3'}\n`);

  try {
    // Импортируем только необходимые модули
    const { URLFactory } = require('./seo/orchestration/url-factory');
    const { LayoutEngineAbsolute } = require('./seo/dom/layout-engine-absolute');
    const { TemplateEngineAbsolute } = require('./seo/dom/template-engine-absolute');
    const { BaselineBlocks } = require('./seo/content/baseline-blocks');
    const { AIAugmentation } = require('./seo/content/ai-augmentation');
    const { StaticArchitecture } = require('./seo/platform/static-architecture');
    const { getConfigManager } = require('./seo/utils/config-manager');
    
    const configManager = getConfigManager();
    const rlState = configManager.getRLState();
    
    // Инициализация модулей
    const urlFactory = new URLFactory(config, rlState);
    const layoutEngine = new LayoutEngineAbsolute(config);
    const templateEngine = new TemplateEngineAbsolute(config);
    const baselineBlocks = new BaselineBlocks();
    const aiAugmentation = new AIAugmentation(config);
    const staticArch = new StaticArchitecture(config);
    
    console.log('✅ Модули инициализированы\n');
    
    // Планирование URL (только 1 страница)
    console.log('📋 Планирование URL...');
    const urlPlan = urlFactory.buildUrlPlan();
    const pageItem = urlPlan[0];
    
    if (!pageItem) {
      throw new Error('Не удалось создать план URL');
    }
    
    console.log(`   URL: ${pageItem.url}`);
    console.log(`   VIN: ${pageItem.vin}`);
    console.log(`   State: ${pageItem.stateSlug}`);
    console.log(`   Intent: ${pageItem.intent}\n`);
    
    // Генерация контента
    console.log('🤖 Генерация контента...');
    const stateLabel = baselineBlocks.humanizeStateSlug(pageItem.stateSlug);
    const makeUpper = (pageItem.make || '').toUpperCase();
    
    // Baseline контент
    const baseline = baselineBlocks.generateBaselineContent(pageItem);
    
    // AI augmentation - оптимизированный промпт для скорости
    const aiPrompt = `Write a professional VIN check report for a ${pageItem.year || ''} ${makeUpper} in ${stateLabel}.

Include:
- Vehicle identification and VIN decoding
- Common issues for this model/year
- State-specific title and registration rules
- Fraud prevention tips
- Why VIN checks matter

Write 300-400 words in professional DMV-style.`;
    
    console.log('   Генерация AI контента через API (оптимизированный промпт)...');
    const aiStartTime = Date.now();
    // Уменьшаем maxTokens для ускорения
    const aiText = await aiAugmentation.generateText(aiPrompt, {
      lang: pageItem.lang,
      intent: pageItem.intent,
      maxTokens: 200, // Уменьшено с 400 для ускорения
      make: pageItem.make,
      year: pageItem.year,
      stateSlug: pageItem.stateSlug
    });
    const aiDuration = ((Date.now() - aiStartTime) / 1000).toFixed(2);
    console.log(`   ✅ AI контент сгенерирован за ${aiDuration} секунд\n`);
    
    // Выбор layout
    const layout = layoutEngine.selectLayout(pageItem, rlState.layoutWeights);
    
    // Формирование страницы
    const page = {
      ...pageItem,
      title: `VIN Check for ${pageItem.year} ${makeUpper} in ${stateLabel} – Full Report`,
      description: `Instant VIN check for ${pageItem.year} ${makeUpper} in ${stateLabel}. Review ownership, accident and title history before you buy.`,
      h1: `VIN report for ${pageItem.year} ${makeUpper} in ${stateLabel}`,
      intro: `This page explains how to read a VIN report for a ${pageItem.year} ${makeUpper} registered in ${stateLabel}, and why a detailed history check is important before you commit to a purchase.`,
      stateLabel,
      ...baseline,
      aiText,
      layout,
      blocks: layout.blocks || []
    };
    
    // Рендеринг HTML
    console.log('📝 Рендеринг HTML...');
    const html = templateEngine.renderPage(page, layout);
    page.html = html;
    
    // Публикация
    console.log('💾 Сохранение страницы...');
    const outputPath = staticArch.writeStaticFile(page, html);
    
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    const url = staticArch.getUrl(page);
    
    console.log('\n✅ Страница успешно сгенерирована!\n');
    console.log('📊 Статистика:');
    console.log(`   Общее время: ${totalDuration} секунд`);
    console.log(`   AI генерация: ${aiDuration} секунд`);
    console.log(`   Путь: ${outputPath}`);
    console.log(`   URL: ${url}`);
    console.log(`   Размер HTML: ${(html.length / 1024).toFixed(2)} KB`);
    console.log(`   Слов в контенте: ~${(html.match(/\b\w+\b/g) || []).length}\n`);
    
    return {
      page,
      outputPath,
      url,
      duration: totalDuration,
      aiDuration
    };
    
  } catch (err) {
    error('GENERATION', 'Ошибка генерации', err);
    throw err;
  }
}

// Запуск
if (require.main === module) {
  generateSinglePage()
    .then((result) => {
      console.log('🎉 Генерация завершена успешно!');
      console.log(`\n🌐 Откройте страницу: http://localhost:3000${result.url}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ Ошибка:', err.message);
      console.error(err.stack);
      process.exit(1);
    });
}

module.exports = { generateSinglePage };

