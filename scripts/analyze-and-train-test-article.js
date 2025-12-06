#!/usr/bin/env node

/**
 * Анализ тестовой статьи и применение обучения
 * Продолжение процесса после генерации тестовой статьи
 */

// КРИТИЧНО: Загружаем переменные окружения из .env
try {
  require('dotenv').config();
} catch (e) {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^[\"']|[\"']$/g, '');
        process.env[key.trim()] = value.trim();
      }
    }
  }
}

const path = require('path');
const fs = require('fs');
const { log, error } = require('./seo/logger');

// Загружаем конфигурацию
const configPath = path.join(process.cwd(), 'data/seo/config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Импортируем необходимые модули
const { AIAugmentation } = require('./seo/content/ai-augmentation');
const { OptimizedArticleAnalyzer } = require('./seo/learning/optimized-article-analyzer');
const { SelfLearningLoop } = require('./seo/learning/self-learning-loop');

async function analyzeAndTrain() {
  log('ANALYZE-TRAIN', 'Starting analysis and training of test article...');

  try {
    // Загружаем данные тестовой статьи
    const testArticlePath = path.join(process.cwd(), 'public', 'test-article', 'article-data.json');
    
    if (!fs.existsSync(testArticlePath)) {
      error('ANALYZE-TRAIN', `Test article not found at: ${testArticlePath}`);
      console.error('❌ Test article not found. Please run generate-test-article.js first.');
      process.exit(1);
    }

    const articleData = JSON.parse(fs.readFileSync(testArticlePath, 'utf8'));
    log('ANALYZE-TRAIN', `✅ Test article loaded: ${articleData.wordCount} words, ${articleData.blocks} blocks`);

    // Создаем AIAugmentation
    const aiAugmentation = new AIAugmentation(config);
    
    // Проверяем стратегию
    if (!aiAugmentation.aiStrategy) {
      log('ANALYZE-TRAIN', 'No strategy found, loading...');
      aiAugmentation.loadAITrainingStrategy();
    }

    if (aiAugmentation.aiStrategy) {
      log('ANALYZE-TRAIN', '✅ Current strategy loaded');
      log('ANALYZE-TRAIN', `   Core principles: ${aiAugmentation.aiStrategy.core_principles?.length || 0}`);
      log('ANALYZE-TRAIN', `   Last updated: ${aiAugmentation.aiStrategy.lastUpdated || 'N/A'}`);
    }

    // Создаем анализатор
    const analyzer = new OptimizedArticleAnalyzer(aiAugmentation, config);
    
    // Анализируем статью
    log('ANALYZE-TRAIN', 'Analyzing article quality...');
    const analysis = await analyzer.analyzeArticle(articleData);
    
    log('ANALYZE-TRAIN', `✅ Analysis complete:`);
    log('ANALYZE-TRAIN', `   Quality Score: ${analysis.qualityScore.toFixed(2)}`);
    log('ANALYZE-TRAIN', `   Word Count: ${analysis.wordCount}`);
    log('ANALYZE-TRAIN', `   Blocks Analyzed: ${analysis.blockCount}`);
    log('ANALYZE-TRAIN', `   Average Block Score: ${analysis.averageBlockScore?.toFixed(2) || 'N/A'}`);
    log('ANALYZE-TRAIN', `   Analysis Time: ${analysis.analysisTime}ms`);

    // Создаем SelfLearningLoop для применения обучения
    const learningLoop = new SelfLearningLoop(config);
    
    // Подготавливаем статью в формате для обучения
    const articleForTraining = {
      content: articleData.content,
      wordCount: articleData.wordCount,
      blocks: articleData.blocks,
      version: 'test-article',
      context: articleData.context
    };

    // Применяем обучение и обновляем стратегию
    log('ANALYZE-TRAIN', 'Applying training and updating strategy...');
    await learningLoop.applyTrainingAndUpdate(articleForTraining);

    log('ANALYZE-TRAIN', '✅ Training applied successfully!');
    
    // Проверяем обновленную стратегию
    aiAugmentation.loadAITrainingStrategy();
    if (aiAugmentation.aiStrategy) {
      log('ANALYZE-TRAIN', `✅ Updated strategy:`);
      log('ANALYZE-TRAIN', `   Core principles: ${aiAugmentation.aiStrategy.core_principles?.length || 0}`);
      log('ANALYZE-TRAIN', `   Last updated: ${aiAugmentation.aiStrategy.lastUpdated || 'N/A'}`);
    }

    console.log('\n✅ Analysis and training completed successfully!');
    console.log(`\n📊 Analysis Results:`);
    console.log(`   Quality Score: ${(analysis.qualityScore * 100).toFixed(1)}%`);
    console.log(`   Word Count: ${analysis.wordCount}`);
    console.log(`   Blocks: ${analysis.blockCount}`);
    console.log(`\n📚 Strategy updated based on analysis`);
    console.log(`\n🔄 Next step: Run generate-test-article.js again to see improvements!\n`);

    return {
      analysis,
      strategyUpdated: true
    };

  } catch (e) {
    error('ANALYZE-TRAIN', `Error: ${e.message}`);
    console.error(e);
    process.exit(1);
  }
}

// Запускаем анализ и обучение
if (require.main === module) {
  analyzeAndTrain().catch(e => {
    error('ANALYZE-TRAIN', `Fatal error: ${e.message}`);
    console.error(e);
    process.exit(1);
  });
}

module.exports = { analyzeAndTrain };

