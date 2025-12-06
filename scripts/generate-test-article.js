#!/usr/bin/env node

/**
 * Генерация тестовой статьи с использованием обученной стратегии
 * Для локального тестирования и получения обратной связи
 */

// КРИТИЧНО: Загружаем переменные окружения из .env
// Альтернативный способ без dotenv (если dotenv не установлен)
try {
  require('dotenv').config();
} catch (e) {
  // Если dotenv не установлен, загружаем .env вручную
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
const { ArticleGeneratorV6 } = require('./seo/learning/article-generator-v6');

async function generateTestArticle() {
  log('TEST-ARTICLE', 'Starting test article generation...');

  try {
    // Создаем AIAugmentation (автоматически загрузит стратегию)
    const aiAugmentation = new AIAugmentation(config);
    
    // Проверяем, что стратегия загружена
    if (!aiAugmentation.aiStrategy) {
      log('TEST-ARTICLE', 'No strategy found, loading...');
      aiAugmentation.loadAITrainingStrategy();
    }

    if (aiAugmentation.aiStrategy) {
      log('TEST-ARTICLE', '✅ Learned strategy loaded');
      log('TEST-ARTICLE', `   Core principles: ${aiAugmentation.aiStrategy.core_principles?.length || 0}`);
      log('TEST-ARTICLE', `   Last updated: ${aiAugmentation.aiStrategy.lastUpdated || 'N/A'}`);
    } else {
      log('TEST-ARTICLE', '⚠️  No strategy available, using default generation');
    }

    // Создаем V6 генератор
    const articleGenerator = new ArticleGeneratorV6(aiAugmentation, config);

    // Контекст для статьи
    // КРИТИЧНО: VIN должен быть корректным для 2019 года (позиция 10 = K)
    const context = {
      make: 'Honda',
      model: 'Accord',
      year: '2019',
      stateSlug: 'texas',
      stateLabel: 'Texas',
      intent: 'vin_check',
      lang: 'en',
      vin: '19UUB2F50KA123456' // Правильный VIN: позиция 10 = K для 2019 года, Honda Accord
    };

    log('TEST-ARTICLE', `Generating article: ${context.year} ${context.make} ${context.model} in ${context.stateLabel}...`);

    // Генерируем статью
    const startTime = Date.now();
    const article = await articleGenerator.generateArticle(context);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    log('TEST-ARTICLE', `✅ Article generated in ${duration}s`);
    log('TEST-ARTICLE', `   Words: ${article.wordCount}`);
    log('TEST-ARTICLE', `   Blocks: ${article.blocks?.length || 0}`);

    // Создаем HTML страницу
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.title || 'VIN Check Guide'}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
            background: #f5f5f5;
        }
        .article {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 20px;
            color: #111827;
        }
        h2 {
            font-size: 1.8rem;
            margin-top: 40px;
            margin-bottom: 20px;
            color: #1f2937;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
        }
        h3 {
            font-size: 1.4rem;
            margin-top: 30px;
            margin-bottom: 15px;
            color: #374151;
        }
        p {
            margin-bottom: 15px;
            font-size: 1.1rem;
        }
        ul, ol {
            margin-left: 30px;
            margin-bottom: 20px;
        }
        li {
            margin-bottom: 10px;
        }
        .meta {
            background: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            font-size: 0.9rem;
            color: #6b7280;
        }
        .meta strong {
            color: #111827;
        }
        .blocks-info {
            background: #eff6ff;
            padding: 15px;
            border-radius: 8px;
            margin-top: 30px;
            font-size: 0.9rem;
        }
        .blocks-info h3 {
            margin-top: 0;
            font-size: 1.1rem;
        }
        .block-item {
            padding: 8px 0;
            border-bottom: 1px solid #dbeafe;
        }
        .block-item:last-child {
            border-bottom: none;
        }
        pre {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="article">
        <h1>${article.h1 || article.title || 'Complete VIN Check Guide'}</h1>
        
        <div class="meta">
            <strong>Vehicle:</strong> ${context.year} ${context.make} ${context.model}<br>
            <strong>State:</strong> ${context.stateLabel}<br>
            <strong>VIN:</strong> ${context.vin}<br>
            <strong>Word Count:</strong> ${article.wordCount}<br>
            <strong>Blocks:</strong> ${article.blocks?.length || 0}<br>
            <strong>Generated:</strong> ${new Date().toLocaleString()}<br>
            <strong>Strategy Used:</strong> ${aiAugmentation.aiStrategy ? '✅ Yes (Learned)' : '❌ No (Default)'}
        </div>

        <div class="content">
            ${article.content || 'No content generated'}
        </div>

        ${article.blocksDetail ? `
        <div class="blocks-info">
            <h3>📊 Generated Blocks:</h3>
            ${Object.entries(article.blocksDetail).map(([type, info]) => `
                <div class="block-item">
                    <strong>${type}:</strong> ${info.wordCount || 0} words, Provider: ${info.provider || 'N/A'}
                </div>
            `).join('')}
        </div>
        ` : ''}
    </div>
</body>
</html>`;

    // Сохраняем статью
    const outputDir = path.join(process.cwd(), 'public', 'test-article');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'index.html');
    fs.writeFileSync(outputPath, html, 'utf8');

    log('TEST-ARTICLE', `✅ Article saved to: ${outputPath}`);
    log('TEST-ARTICLE', `   URL: http://localhost:3000/test-article/index.html`);

    // Также сохраняем raw данные для анализа
    const dataPath = path.join(outputDir, 'article-data.json');
    fs.writeFileSync(dataPath, JSON.stringify({
      ...article,
      context,
      strategyUsed: !!aiAugmentation.aiStrategy,
      strategyLastUpdated: aiAugmentation.aiStrategy?.lastUpdated || null,
      generatedAt: new Date().toISOString()
    }, null, 2), 'utf8');

    log('TEST-ARTICLE', `✅ Article data saved to: ${dataPath}`);

    console.log('\n✅ Test article generated successfully!');
    console.log(`\n📄 View at: http://localhost:3000/test-article/index.html`);
    console.log(`📊 Data at: ${dataPath}`);
    console.log(`\n📝 Ready for feedback!\n`);

    return {
      article,
      outputPath,
      dataPath
    };

  } catch (e) {
    error('TEST-ARTICLE', `Error generating article: ${e.message}`);
    console.error(e);
    process.exit(1);
  }
}

// Запускаем генерацию
if (require.main === module) {
  generateTestArticle().catch(e => {
    error('TEST-ARTICLE', `Fatal error: ${e.message}`);
    console.error(e);
    process.exit(1);
  });
}

module.exports = { generateTestArticle };

