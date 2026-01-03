#!/usr/bin/env node

/**
 * Генерация 5 тестовых статей с разными марками, штатами и годами
 * Для проверки качества при вариативности тем
 */

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

const configPath = path.join(process.cwd(), 'data/seo/config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const { AIAugmentation } = require('./seo/content/ai-augmentation');
const { ArticleGeneratorV6 } = require('./seo/learning/article-generator-v6');

// 5 разных комбинаций для тестирования
const testCases = [
  {
    make: 'Toyota',
    model: 'Camry',
    year: '2018',
    stateSlug: 'california',
    stateLabel: 'California',
    vin: '4T1BF1FK3JU123456' // Toyota Camry 2018 (J = 2018)
  },
  {
    make: 'Ford',
    model: 'F-150',
    year: '2020',
    stateSlug: 'florida',
    stateLabel: 'Florida',
    vin: '1FTFW1ET1LFA12345' // Ford F-150 2020 (L = 2020)
  },
  {
    make: 'Chevrolet',
    model: 'Silverado',
    year: '2019',
    stateSlug: 'new-york',
    stateLabel: 'New York',
    vin: '1GCVKREC9KZ123456' // Chevrolet Silverado 2019 (K = 2019)
  },
  {
    make: 'Nissan',
    model: 'Altima',
    year: '2021',
    stateSlug: 'texas',
    stateLabel: 'Texas',
    vin: '1N4BL4BV1MC123456' // Nissan Altima 2021 (M = 2021)
  },
  {
    make: 'Honda',
    model: 'Civic',
    year: '2017',
    stateSlug: 'arizona',
    stateLabel: 'Arizona',
    vin: '19XFC2F59HE123456' // Honda Civic 2017 (H = 2017)
  }
];

async function generateMultipleArticles() {
  log('MULTI-TEST', `Starting generation of ${testCases.length} test articles...`);

  try {
    const aiAugmentation = new AIAugmentation(config);
    
    if (!aiAugmentation.aiStrategy) {
      log('MULTI-TEST', 'No strategy found, loading...');
      aiAugmentation.loadAITrainingStrategy();
    }

    const articleGenerator = new ArticleGeneratorV6(aiAugmentation, config);
    const results = [];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const articleNum = i + 1;
      
      log('MULTI-TEST', `\n=== Article ${articleNum}/${testCases.length}: ${testCase.year} ${testCase.make} ${testCase.model} in ${testCase.stateLabel} ===`);

      const context = {
        make: testCase.make,
        model: testCase.model,
        year: testCase.year,
        stateSlug: testCase.stateSlug,
        stateLabel: testCase.stateLabel,
        intent: 'vin_check',
        lang: 'en',
        vin: testCase.vin
      };

      const startTime = Date.now();
      const article = await articleGenerator.generateArticle(context);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      log('MULTI-TEST', `✅ Article ${articleNum} generated in ${duration}s`);
      log('MULTI-TEST', `   Words: ${article.wordCount}, Blocks: ${article.blocks?.length || 0}`);

      // Создаем HTML
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
      const outputDir = path.join(process.cwd(), 'public', `test-article-${articleNum}`);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputPath = path.join(outputDir, 'index.html');
      fs.writeFileSync(outputPath, html, 'utf8');

      results.push({
        articleNum,
        context,
        article,
        outputPath,
        url: `http://localhost:3000/test-article-${articleNum}/index.html`
      });

      log('MULTI-TEST', `✅ Article ${articleNum} saved to: ${outputPath}`);
    }

    // Создаем индексную страницу со ссылками на все статьи
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Articles - Quality Check</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f5f5;
            padding: 40px 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 30px;
            color: #111827;
        }
        .articles-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .article-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .article-card h2 {
            font-size: 1.3rem;
            margin-bottom: 15px;
            color: #1f2937;
        }
        .article-card a {
            display: inline-block;
            margin-top: 10px;
            padding: 10px 20px;
            background: #3b82f6;
            color: white;
            text-decoration: none;
            border-radius: 4px;
        }
        .article-card a:hover {
            background: #2563eb;
        }
        .meta-info {
            font-size: 0.9rem;
            color: #6b7280;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Test Articles - Quality Check</h1>
        <div class="articles-grid">
            ${results.map(r => `
                <div class="article-card">
                    <h2>Article ${r.articleNum}</h2>
                    <p><strong>${r.context.year} ${r.context.make} ${r.context.model}</strong></p>
                    <p>State: ${r.context.stateLabel}</p>
                    <p>VIN: ${r.context.vin}</p>
                    <div class="meta-info">
                        Words: ${r.article.wordCount}<br>
                        Blocks: ${r.article.blocks?.length || 0}
                    </div>
                    <a href="${r.url}" target="_blank">View Article →</a>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;

    const indexPath = path.join(process.cwd(), 'public', 'test-articles-index.html');
    fs.writeFileSync(indexPath, indexHtml, 'utf8');

    console.log('\n✅ All articles generated successfully!');
    console.log(`\n📄 Index page: http://localhost:3000/test-articles-index.html`);
    console.log('\n📋 Articles:');
    results.forEach(r => {
      console.log(`   ${r.articleNum}. ${r.context.year} ${r.context.make} ${r.context.model} in ${r.context.stateLabel}`);
      console.log(`      ${r.url}`);
    });
    console.log('\n');

    return results;

  } catch (e) {
    error('MULTI-TEST', `Error generating articles: ${e.message}`);
    console.error(e);
    process.exit(1);
  }
}

if (require.main === module) {
  generateMultipleArticles().catch(e => {
    error('MULTI-TEST', `Fatal error: ${e.message}`);
    console.error(e);
    process.exit(1);
  });
}

module.exports = { generateMultipleArticles };

















