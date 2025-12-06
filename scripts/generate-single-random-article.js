#!/usr/bin/env node

/**
 * Генерация одной случайной статьи с нововведениями
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
// Используем оптимизированную версию если включена через env
const useOptimized = process.env.USE_OPTIMIZED_GENERATOR === '1' || process.env.USE_OPTIMIZED_GENERATOR === 'true';
const { ArticleGeneratorV6 } = useOptimized 
  ? require('./seo/learning/article-generator-v6-optimized')
  : require('./seo/learning/article-generator-v6');

// Загружаем данные для случайного выбора
const makesModelsPath = path.join(process.cwd(), 'data/makes-models.json');
const urlSeedsPath = path.join(process.cwd(), 'data/seo/url-seeds.json');

const makesModels = JSON.parse(fs.readFileSync(makesModelsPath, 'utf8'));
const urlSeeds = JSON.parse(fs.readFileSync(urlSeedsPath, 'utf8'));

// Функция для генерации случайного VIN на основе марки и года
function generateVIN(make, year) {
  const yearCode = {
    '2015': 'F', '2016': 'G', '2017': 'H', '2018': 'J', '2019': 'K',
    '2020': 'L', '2021': 'M', '2022': 'N', '2023': 'P', '2024': 'R', '2025': 'S'
  }[year] || 'K';
  
  // WMI коды для разных марок
  const wmiCodes = {
    'Toyota': '4T1',
    'Honda': '19U',
    'Ford': '1FT',
    'Chevrolet': '1GC',
    'Nissan': '1N4',
    'Hyundai': '5N1',
    'Kia': '5XX',
    'Mazda': 'JM1',
    'Subaru': '4S3',
    'Volkswagen': '1VW',
    'BMW': 'WBA',
    'Mercedes-Benz': 'WDD',
    'Audi': 'WAU',
    'Lexus': 'JTH',
    'Acura': '19U',
    'Jeep': '1C4',
    'Ram': '1D7',
    'GMC': '1GT',
    'Tesla': '5YJ',
    'Suzuki': 'JS2',
    'McLaren': 'SBM',
    'Pagani': 'ZPA',
    'Isuzu': 'JAL'
  };
  
  const wmi = wmiCodes[make] || '1HG';
  const randomSerial = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  
  // Генерируем VDS (позиции 4-8) - случайные символы
  const vds = Array.from({length: 5}, () => {
    const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
    return chars[Math.floor(Math.random() * chars.length)];
  }).join('');
  
  // Генерируем check digit (позиция 9) - случайная цифра или X
  const checkDigit = '0123456789X'[Math.floor(Math.random() * 11)];
  
  // Генерируем plant code (позиция 11)
  const plantCode = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)];
  
  return `${wmi}${vds}${checkDigit}${yearCode}${plantCode}${randomSerial}`;
}

// Функция для конвертации markdown в HTML
// MONSTER 7.x: Улучшенная версия с исправлением неправильных тегов
function markdownToHtml(markdown = '') {
  if (!markdown) return '';
  
  let html = markdown;
  
  // MONSTER 7.x: Исправление неправильных тегов <em> вместо списков
  // Паттерн: <em>   <strong>Label:</strong> text</em>
  html = html.replace(/<em>\s*<strong>(.+?)<\/strong>:\s*(.+?)<\/em>/g, 
    '<li><strong>$1</strong>: $2</li>');
  
  // Паттерн: <em>   text</em> (без strong)
  html = html.replace(/<em>\s+([^<]+?)<\/em>/g, 
    '<li>$1</li>');
  
  // Обернуть последовательные <li> в <ul> (если еще не обернуты)
  html = html.replace(/(<li>.*?<\/li>\s*)+/g, (match) => {
    // Проверяем, не обернуты ли уже в <ul>
    if (match.includes('<ul>')) return match;
    return '<ul>' + match + '</ul>';
  });
  
  // Заголовки ### -> <h3>, ## -> <h2>, # -> <h1>
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  
  // Жирный текст **text** -> <strong>text</strong>
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Курсив *text* -> <em>text</em> (только если не жирный и не в списке)
  html = html.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, (match, content) => {
    // Пропускаем если это уже часть списка
    if (match.includes('<li>') || match.includes('</li>')) return match;
    return '<em>' + content + '</em>';
  });
  
  // Горизонтальная линия --- -> <hr>
  html = html.replace(/^---$/gm, '<hr>');
  
  // Списки - item или * item -> <li>item</li> (если еще не обработаны)
  html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
  
  // Разделение на параграфы (двойной перенос строки)
  html = html.split('\n\n').map(block => {
    block = block.trim();
    if (!block) return '';
    // Если блок уже содержит HTML теги (h1-h6, ul, hr, p, li), не оборачиваем в <p>
    if (/^<(h[1-6]|ul|hr|p|li)/.test(block)) {
      return block;
    }
    return '<p>' + block + '</p>';
  }).join('\n');
  
  // Очистка лишних переносов строк
  html = html.replace(/\n{3,}/g, '\n\n');
  
  // MONSTER 7.x: Исправление незавершенных списков
  // Удаляем списки с одним незавершенным пунктом
  html = html.replace(/<ul><li>\*\*([^*]+)\.<\/li>\s*<\/ul>/g, '');
  html = html.replace(/<ul><li>([^<]+)\.<\/li>\s*<\/ul>/g, (match, content) => {
    // Если пункт слишком короткий (< 10 символов), удаляем список
    if (content.trim().length < 10) return '';
    return match;
  });
  
  return html;
}

// Генерируем одну случайную комбинацию
function generateRandomTestCase() {
  const years = ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024'];
  
  // Случайная марка и модель
  const makeEntry = makesModels[Math.floor(Math.random() * makesModels.length)];
  const make = makeEntry.make;
  const model = makeEntry.models[Math.floor(Math.random() * makeEntry.models.length)];
  
  // Случайный год
  const year = years[Math.floor(Math.random() * years.length)];
  
  // Случайный штат
  const stateEntry = urlSeeds.states[Math.floor(Math.random() * urlSeeds.states.length)];
  const stateSlug = stateEntry.slug;
  const stateLabel = stateEntry.slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  
  const vin = generateVIN(make, year);
  
  return {
    make,
    model,
    year,
    stateSlug,
    stateLabel,
    vin
  };
}

async function generateSingleRandomArticle() {
  log('RANDOM-ARTICLE', 'Generating one random article with innovations...');

  try {
    const aiAugmentation = new AIAugmentation(config);
    
    if (!aiAugmentation.aiStrategy) {
      log('RANDOM-ARTICLE', 'No strategy found, loading...');
      aiAugmentation.loadAITrainingStrategy();
    }

    const articleGenerator = new ArticleGeneratorV6(aiAugmentation, config);
    const testCase = generateRandomTestCase();
    
    log('RANDOM-ARTICLE', `\n=== Generating article: ${testCase.year} ${testCase.make} ${testCase.model} in ${testCase.stateLabel} ===`);

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

    log('RANDOM-ARTICLE', `✅ Article generated in ${duration}s`);
    log('RANDOM-ARTICLE', `   Words: ${article.wordCount || 'N/A'}`);
    log('RANDOM-ARTICLE', `   Title: ${article.title || article.h1 || 'N/A'}`);

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
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        th {
            background: #f9fafb;
            font-weight: 600;
            color: #111827;
        }
        .cta {
            background: #3b82f6;
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
            text-align: center;
            font-size: 1.2rem;
            font-weight: 600;
        }
        .content {
            line-height: 1.8;
        }
        .content h2 {
            margin-top: 2em;
            margin-bottom: 1em;
        }
        .content h3 {
            margin-top: 1.5em;
            margin-bottom: 0.75em;
        }
        .content ul {
            margin: 1em 0;
        }
        .content strong {
            font-weight: 600;
            color: #1f2937;
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
        <h1>${article.h1 || article.title || 'VIN Check Guide'}</h1>
        
        <div class="meta">
            <strong>Generated:</strong> ${new Date().toLocaleString()}<br>
            <strong>Vehicle:</strong> ${testCase.year} ${testCase.make} ${testCase.model}<br>
            <strong>State:</strong> ${testCase.stateLabel}<br>
            <strong>VIN:</strong> ${testCase.vin}<br>
            <strong>Word Count:</strong> ${article.wordCount || 'N/A'}<br>
            <strong>Generated:</strong> ${new Date().toLocaleString()}
        </div>

        <div class="content">
            ${article.content ? markdownToHtml(article.content) : 'No content generated'}
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

    // Сохраняем HTML файл
    const outputDir = path.join(process.cwd(), 'public', 'random-articles');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `random-article-${timestamp}.html`;
    const filepath = path.join(outputDir, filename);
    
    fs.writeFileSync(filepath, html, 'utf8');
    
    log('RANDOM-ARTICLE', `\n✅ Article saved to: ${filepath}`);
    log('RANDOM-ARTICLE', `   Open in browser: file://${filepath}`);
    
    return {
      success: true,
      filepath,
      article: {
        title: article.title || article.h1,
        wordCount: article.wordCount
      }
    };

  } catch (err) {
    error('RANDOM-ARTICLE', `Error generating article: ${err.message}`);
    error('RANDOM-ARTICLE', err.stack);
    process.exit(1);
  }
}

// Запускаем генерацию
if (require.main === module) {
  generateSingleRandomArticle()
    .then(() => {
      log('RANDOM-ARTICLE', '✅ Generation complete!');
      process.exit(0);
    })
    .catch(err => {
      error('RANDOM-ARTICLE', `Fatal error: ${err.message}`);
      process.exit(1);
    });
}

module.exports = { generateSingleRandomArticle };

