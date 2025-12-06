#!/usr/bin/env node

/**
 * Тестовая генерация 10 статей для проверки надежности системы
 * Проверяет:
 * - Обработку <em> тегов (8 шагов)
 * - Завершение незавершенных предложений (Scrut., Bul., is.)
 * - Конвертацию markdown таблиц в HTML
 * - Гарантию минимальной длины блоков
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
const { ArticlePostProcessor } = require('./seo/learning/article-post-processor');

// Загружаем данные для случайного выбора
const makesModelsPath = path.join(process.cwd(), 'data/makes-models.json');
const urlSeedsPath = path.join(process.cwd(), 'data/seo/url-seeds.json');

const makesModels = JSON.parse(fs.readFileSync(makesModelsPath, 'utf8'));
const urlSeeds = JSON.parse(fs.readFileSync(urlSeedsPath, 'utf8'));

// Функция для генерации случайного VIN
function generateVIN(make, year) {
  const yearCode = {
    '2015': 'F', '2016': 'G', '2017': 'H', '2018': 'J', '2019': 'K',
    '2020': 'L', '2021': 'M', '2022': 'N', '2023': 'P', '2024': 'R', '2025': 'S'
  }[year] || 'K';
  
  const wmiCodes = {
    'Toyota': '4T1', 'Honda': '19U', 'Ford': '1FT', 'Chevrolet': '1GC',
    'Nissan': '1N4', 'Hyundai': '5N1', 'Kia': '5XX', 'Mazda': 'JM1',
    'Subaru': '4S3', 'Volkswagen': '1VW', 'BMW': 'WBA', 'Mercedes-Benz': 'WDD',
    'Audi': 'WAU', 'Lexus': 'JTH', 'Acura': '19U', 'Jeep': '1C4',
    'Ram': '1D7', 'GMC': '1GT', 'Tesla': '5YJ'
  };
  
  const wmi = wmiCodes[make] || '1HG';
  const randomSerial = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  const vds = Array.from({length: 5}, () => {
    const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
    return chars[Math.floor(Math.random() * chars.length)];
  }).join('');
  const checkDigit = '0123456789X'[Math.floor(Math.random() * 11)];
  const plantCode = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)];
  
  return `${wmi}${vds}${checkDigit}${yearCode}${plantCode}${randomSerial}`;
}

// Генерируем 10 случайных тест-кейсов
// TRIZ ПРОГОН 2: Исправлена генерация тест-кейсов (принцип посредника - правильная структура данных)
function generateTestCases() {
  const testCases = [];
  const years = ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023'];
  
  // TRIZ: Определяем правильную структуру данных
  // Если makesModels - массив объектов, используем его
  // Если объект с ключами-марками, конвертируем
  let makesList = [];
  if (Array.isArray(makesModels)) {
    makesList = makesModels;
  } else {
    // Конвертируем объект в массив
    makesList = Object.keys(makesModels).map(make => ({
      make,
      models: Array.isArray(makesModels[make]) ? makesModels[make] : []
    })).filter(entry => entry.models.length > 0);
  }
  
  // TRIZ: Определяем правильную структуру states
  let statesList = [];
  if (Array.isArray(urlSeeds.states)) {
    statesList = urlSeeds.states;
  } else {
    // Конвертируем объект в массив
    statesList = Object.keys(urlSeeds.states || {}).map(slug => {
      const stateData = urlSeeds.states[slug];
      return {
        slug,
        label: stateData?.label || slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      };
    });
  }
  
  // TRIZ: Гарантируем минимум 10 валидных тест-кейсов
  let attempts = 0;
  const maxAttempts = 50; // Защита от бесконечного цикла
  
  while (testCases.length < 10 && attempts < maxAttempts) {
    attempts++;
    
    // Выбираем случайную марку
    if (makesList.length === 0) {
      error('RELIABILITY-TEST', 'No makes available in makesModels');
      break;
    }
    
    const makeEntry = makesList[Math.floor(Math.random() * makesList.length)];
    const make = makeEntry.make || makeEntry;
    const models = makeEntry.models || (makesModels[make] || []);
    
    if (!models || models.length === 0) continue;
    
    const model = models[Math.floor(Math.random() * models.length)];
    
    if (!model) continue;
    
    // Выбираем случайный год
    const year = years[Math.floor(Math.random() * years.length)];
    
    // Выбираем случайный штат
    if (statesList.length === 0) {
      error('RELIABILITY-TEST', 'No states available in urlSeeds.states');
      break;
    }
    
    const stateEntry = statesList[Math.floor(Math.random() * statesList.length)];
    const stateSlug = stateEntry.slug || stateEntry;
    const stateLabel = stateEntry.label || stateSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    
    // Валидация всех полей
    if (!make || !model || !year || !stateSlug) {
      continue;
    }
    
    testCases.push({
      make,
      model,
      year,
      stateSlug,
      stateLabel,
      vin: generateVIN(make, year)
    });
  }
  
  if (testCases.length < 10) {
    error('RELIABILITY-TEST', `Warning: Only generated ${testCases.length} test cases instead of 10`);
  }
  
  return testCases;
}

// Проверка на наличие ошибок в статье
// TRIZ ПРОГОН 1: Улучшена проверка article.blocks (принцип предварительного действия)
// TRIZ ПРОГОН 3: Добавлена полная валидация и обработка всех случаев (принцип обратной связи)
function checkArticleErrors(article) {
  const errors = [];
  
  // TRIZ: Предварительная проверка - валидация входных данных
  if (!article) {
    errors.push('Article object is null or undefined');
    return errors;
  }
  
  const content = article.content || '';
  
  if (!content || content.trim().length === 0) {
    errors.push('Article content is empty');
    return errors;
  }
  
  // Проверка 1: Незавершенные предложения Scrut., Bul., is.
  if (content.match(/\bScrut\.\s*$/gm)) {
    errors.push('Found "Scrut." - incomplete sentence');
  }
  if (content.match(/\bBul\.\s*$/gm)) {
    errors.push('Found "Bul." - incomplete sentence');
  }
  if (content.match(/\bis\.\s*$/gm)) {
    errors.push('Found "is." - incomplete sentence');
  }
  
  // Проверка 2: Необработанные <em> теги с <strong> внутри (должны быть <li>)
  const emWithStrongPattern = /<em>\s*<strong>([^<]+?)<\/strong>\s*:\s*([^<]+?)<\/em>/g;
  const emMatches = content.match(emWithStrongPattern);
  if (emMatches && emMatches.length > 0) {
    errors.push(`Found ${emMatches.length} unprocessed <em> tags with <strong> inside`);
  }
  
  // Проверка 3: Markdown таблицы (должны быть HTML)
  const markdownTablePattern = /<p>\s*\|[^\n]+\|/g;
  const markdownTables = content.match(markdownTablePattern);
  if (markdownTables && markdownTables.length > 0) {
    errors.push(`Found ${markdownTables.length} markdown tables inside <p> tags (should be HTML)`);
  }
  
  // Проверка 4: Незавершенные таблицы (меньше 2 строк)
  const tableRows = content.match(/\|.*\|/g) || [];
  if (tableRows.length > 0 && tableRows.length < 2) {
    errors.push('Found incomplete table (less than 2 rows)');
  }
  
  // Проверка 5: Блоки слишком короткие (менее 180 слов для критичных блоков)
  // TRIZ: Полная обработка всех возможных структур article.blocks
  const criticalBlocks = ['hero', 'state_specific', 'accident_intelligence', 'buyer_guide', 'recalls_tsbs'];
  
  if (article.blocks) {
    // Случай 1: article.blocks - массив
    if (Array.isArray(article.blocks)) {
      article.blocks.forEach((block, index) => {
        if (!block) {
          errors.push(`Block at index ${index} is null or undefined`);
          return;
        }
        
        if (block.type && criticalBlocks.includes(block.type)) {
          const blockContent = block.content || '';
          const blockWords = blockContent.split(/\s+/).filter(w => w.length > 0).length;
          if (blockWords < 180) {
            errors.push(`Block ${block.type} is too short: ${blockWords} words (minimum 180)`);
          }
        }
      });
    }
    // Случай 2: article.blocks - объект с ключами
    else if (typeof article.blocks === 'object') {
      Object.entries(article.blocks).forEach(([key, block]) => {
        if (!block) {
          errors.push(`Block "${key}" is null or undefined`);
          return;
        }
        
        // Если блок - объект с type и content
        if (block.type && criticalBlocks.includes(block.type)) {
          const blockContent = block.content || '';
          const blockWords = blockContent.split(/\s+/).filter(w => w.length > 0).length;
          if (blockWords < 180) {
            errors.push(`Block ${block.type} is too short: ${blockWords} words (minimum 180)`);
          }
        }
        // Если блок - строка (content)
        else if (typeof block === 'string' && criticalBlocks.includes(key)) {
          const blockWords = block.split(/\s+/).filter(w => w.length > 0).length;
          if (blockWords < 180) {
            errors.push(`Block ${key} is too short: ${blockWords} words (minimum 180)`);
          }
        }
      });
    }
    // Случай 3: Неизвестная структура
    else {
      errors.push(`Article.blocks has unexpected type: ${typeof article.blocks}`);
    }
  }
  
  return errors;
}

async function testSystemReliability() {
  log('RELIABILITY-TEST', 'Starting reliability test: 10 articles...');
  
  try {
    const aiAugmentation = new AIAugmentation(config);
    
    if (!aiAugmentation.aiStrategy) {
      log('RELIABILITY-TEST', 'Loading AI strategy...');
      aiAugmentation.loadAITrainingStrategy();
    }
    
    const articleGenerator = new ArticleGeneratorV6(aiAugmentation, config);
    const postProcessor = new ArticlePostProcessor();
    const testCases = generateTestCases();
    
    const results = {
      total: testCases.length,
      success: 0,
      errors: 0,
      articleErrors: [],
      summary: {
        emTagsFixed: 0,
        incompleteSentencesFixed: 0,
        tablesConverted: 0,
        blocksExpanded: 0
      }
    };
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const articleNum = i + 1;
      
      log('RELIABILITY-TEST', `\n=== Article ${articleNum}/${testCases.length}: ${testCase.year} ${testCase.make} ${testCase.model} in ${testCase.stateLabel} ===`);
      
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
      
      try {
        // TRIZ ПРОГОН 3: Полная валидация контекста перед генерацией
        if (!testCase.make || !testCase.model || !testCase.year || !testCase.stateSlug) {
          results.errors++;
          results.articleErrors.push({
            articleNum,
            context: `${testCase.year || 'N/A'} ${testCase.make || 'N/A'} ${testCase.model || 'N/A'} in ${testCase.stateLabel || 'N/A'}`,
            errors: [`Invalid test case context: missing required fields`]
          });
          error('RELIABILITY-TEST', `❌ Article ${articleNum} FAILED: Invalid test case context`);
          continue;
        }
        
        const startTime = Date.now();
        let article = await articleGenerator.generateArticle(context);
        const generationTime = ((Date.now() - startTime) / 1000).toFixed(2);
        
        // Пост-обработка
        const postProcessStart = Date.now();
        article = postProcessor.process(article, context);
        const postProcessTime = ((Date.now() - postProcessStart) / 1000).toFixed(2);
        
        // TRIZ: Полная проверка результата генерации
        if (!article) {
          results.errors++;
          results.articleErrors.push({
            articleNum,
            context: `${testCase.year} ${testCase.make} ${testCase.model} in ${testCase.stateLabel}`,
            errors: ['Article object is null after generation']
          });
          error('RELIABILITY-TEST', `❌ Article ${articleNum} FAILED: Article object is null`);
          continue;
        }
        
        if (!article.content || article.content.trim().length === 0) {
          results.errors++;
          results.articleErrors.push({
            articleNum,
            context: `${testCase.year} ${testCase.make} ${testCase.model} in ${testCase.stateLabel}`,
            errors: ['Article content is missing or empty']
          });
          error('RELIABILITY-TEST', `❌ Article ${articleNum} FAILED: Article content is missing`);
          continue;
        }
        
        // Проверка на ошибки качества
        const errors = checkArticleErrors(article);
        
        if (errors.length === 0) {
          results.success++;
          log('RELIABILITY-TEST', `✅ Article ${articleNum} PASSED (${generationTime}s gen, ${postProcessTime}s post)`);
        } else {
          results.errors++;
          results.articleErrors.push({
            articleNum,
            context: `${testCase.year} ${testCase.make} ${testCase.model} in ${testCase.stateLabel}`,
            errors
          });
          error('RELIABILITY-TEST', `❌ Article ${articleNum} FAILED:`);
          errors.forEach(err => error('RELIABILITY-TEST', `   - ${err}`));
        }
        
        // TRIZ: Безопасное получение количества блоков
        let blocksCount = 0;
        if (article.blocks) {
          if (Array.isArray(article.blocks)) {
            blocksCount = article.blocks.length;
          } else if (typeof article.blocks === 'object') {
            blocksCount = Object.keys(article.blocks).length;
          }
        }
        
        log('RELIABILITY-TEST', `   Words: ${article.wordCount || 'N/A'}, Blocks: ${blocksCount}`);
        
      } catch (e) {
        results.errors++;
        const errorMessage = e.message || 'Unknown error';
        const errorStack = e.stack || '';
        
        results.articleErrors.push({
          articleNum,
          context: `${testCase.year || 'N/A'} ${testCase.make || 'N/A'} ${testCase.model || 'N/A'} in ${testCase.stateLabel || 'N/A'}`,
          errors: [`Generation failed: ${errorMessage}`, errorStack ? `Stack: ${errorStack.split('\n')[0]}` : '']
        });
        error('RELIABILITY-TEST', `❌ Article ${articleNum} FAILED: ${errorMessage}`);
        if (errorStack) {
          error('RELIABILITY-TEST', `   Stack: ${errorStack.split('\n').slice(0, 3).join('\n   ')}`);
        }
      }
    }
    
    // Финальный отчет
    console.log('\n' + '='.repeat(80));
    console.log('RELIABILITY TEST RESULTS');
    console.log('='.repeat(80));
    console.log(`Total articles: ${results.total}`);
    console.log(`✅ Passed: ${results.success}`);
    console.log(`❌ Failed: ${results.errors}`);
    console.log(`Success rate: ${((results.success / results.total) * 100).toFixed(1)}%`);
    
    if (results.articleErrors.length > 0) {
      console.log('\nFAILED ARTICLES:');
      results.articleErrors.forEach(({ articleNum, context, errors }) => {
        console.log(`\nArticle ${articleNum}: ${context}`);
        errors.forEach(err => console.log(`  - ${err}`));
      });
    }
    
    // Сохраняем отчет
    const reportPath = path.join(process.cwd(), 'reliability-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');
    log('RELIABILITY-TEST', `\nReport saved to: ${reportPath}`);
    
    // Возвращаем код выхода
    if (results.errors === 0) {
      console.log('\n✅ ALL TESTS PASSED - System is 10/10 reliable!');
      process.exit(0);
    } else {
      console.log(`\n⚠️  ${results.errors} test(s) failed - System needs improvements`);
      process.exit(1);
    }
    
  } catch (e) {
    error('RELIABILITY-TEST', `Fatal error: ${e.message}`);
    console.error(e);
    process.exit(1);
  }
}

// Запускаем тест
if (require.main === module) {
  testSystemReliability();
}

module.exports = { testSystemReliability };

