#!/usr/bin/env node

/**
 * MONSTER 7.x: Gen Page Script
 * Генерирует одну страницу с указанными параметрами
 */

try {
  require('dotenv').config();
} catch (e) {
  // Fallback для загрузки .env
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

const fs = require('fs');
const path = require('path');
const { log, error } = require('./seo/logger');

// Парсинг аргументов командной строки
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    vin: null,
    model: null,
    year: null,
    state: null,
    rules: null,
    analysisDepth: 'deep',
    maxRetries: 3
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--vin' && args[i + 1]) {
      result.vin = args[i + 1];
      i++;
    } else if (args[i] === '--model' && args[i + 1]) {
      result.model = args[i + 1];
      i++;
    } else if (args[i] === '--year' && args[i + 1]) {
      result.year = args[i + 1];
      i++;
    } else if (args[i] === '--state' && args[i + 1]) {
      result.state = args[i + 1];
      i++;
    } else if (args[i] === '--rules' && args[i + 1]) {
      result.rules = args[i + 1];
      i++;
    } else if (args[i] === '--analysis-depth' && args[i + 1]) {
      result.analysisDepth = args[i + 1];
      i++;
    } else if (args[i] === '--max-retries' && args[i + 1]) {
      result.maxRetries = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return result;
}

async function generatePage() {
  const args = parseArgs();

  // Валидация обязательных параметров
  if (!args.vin || !args.model || !args.year || !args.state) {
    error('GEN-PAGE', 'Missing required parameters');
    console.error('Usage: node gen_page.js --vin <VIN> --model <Model> --year <Year> --state <State> [--rules <path>] [--analysis-depth <depth>] [--max-retries <n>]');
    process.exit(1);
  }

  // Загружаем конфигурацию
  const configPath = path.join(process.cwd(), 'data/seo/config.json');
  if (!fs.existsSync(configPath)) {
    error('GEN-PAGE', `Config file not found: ${configPath}`);
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  // Инициализация AI
  const { AIAugmentation } = require('./seo/content/ai-augmentation');
  const { ArticleGeneratorV6 } = require('./seo/learning/article-generator-v6');

  const aiAugmentation = new AIAugmentation(config);
  if (!aiAugmentation.aiStrategy) {
    log('GEN-PAGE', 'Loading AI strategy...');
    aiAugmentation.loadAITrainingStrategy();
  }

  const articleGenerator = new ArticleGeneratorV6(aiAugmentation, config);

  // Парсим модель (например, "Honda Accord" -> make: "Honda", model: "Accord")
  const modelParts = args.model.split(' ');
  const make = modelParts[0];
  const model = modelParts.slice(1).join(' ');

  // Нормализуем state (например, "texas" -> stateSlug: "texas", stateLabel: "Texas")
  const stateSlug = args.state.toLowerCase().replace(/\s+/g, '-');
  const stateLabel = args.state.split(/[\s-]+/).map(w => 
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  ).join(' ');

  const context = {
    make,
    model,
    year: args.year,
    stateSlug,
    stateLabel,
    intent: 'vin_check',
    lang: 'en',
    vin: args.vin,
    stage: args.analysisDepth
  };

  log('GEN-PAGE', `Generating page: ${args.year} ${make} ${model} in ${stateLabel} (VIN: ${args.vin})`);
  log('GEN-PAGE', `Analysis depth: ${args.analysisDepth}, Max retries: ${args.maxRetries}`);

  try {
    const startTime = Date.now();
    const article = await articleGenerator.generateArticle(context);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    log('GEN-PAGE', `✅ Article generated in ${duration}s`);
    log('GEN-PAGE', `   Words: ${article.wordCount || 'N/A'}`);
    log('GEN-PAGE', `   Blocks: ${article.blocks || 0}`);

    // Сохраняем результат в JSON
    const output = {
      vin: args.vin,
      make,
      model,
      year: args.year,
      state: stateSlug,
      stateLabel,
      article,
      generated_at: new Date().toISOString(),
      generation_time: duration,
      analysis_depth: args.analysisDepth
    };

    // Выводим JSON в stdout
    console.log(JSON.stringify(output, null, 2));

    return output;
  } catch (err) {
    error('GEN-PAGE', `Generation failed: ${err.message}`);
    console.error(JSON.stringify({
      error: err.message,
      stack: err.stack
    }, null, 2));
    process.exit(1);
  }
}

if (require.main === module) {
  generatePage().catch(err => {
    error('GEN-PAGE', `Fatal error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { generatePage };


















