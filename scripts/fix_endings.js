#!/usr/bin/env node

/**
 * MONSTER 7.x: Fix Endings Script
 * Исправляет незавершенные концовки блоков
 */

const fs = require('fs');
const path = require('path');
const { log, error } = require('./seo/logger');
const { ArticlePostProcessor } = require('./seo/learning/article-post-processor');

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    input: null,
    output: null
  };

  for (let i = 0; i < args.length; i++) {
    if (!result.input && !args[i].startsWith('--')) {
      result.input = args[i];
    } else if (args[i] === '--output' && args[i + 1]) {
      result.output = args[i + 1];
      i++;
    }
  }

  return result;
}

function fixEndings() {
  const args = parseArgs();

  if (!args.input) {
    error('FIX-ENDINGS', 'Missing input file');
    console.error('Usage: node fix_endings.js <input.json> [--output <output.json>]');
    process.exit(1);
  }

  if (!fs.existsSync(args.input)) {
    error('FIX-ENDINGS', `Input file not found: ${args.input}`);
    process.exit(1);
  }

  const pageData = JSON.parse(fs.readFileSync(args.input, 'utf8'));
  const article = pageData.article || pageData;

  if (!article || !article.content) {
    error('FIX-ENDINGS', 'Invalid article data in input file');
    process.exit(1);
  }

  log('FIX-ENDINGS', `Fixing endings for VIN: ${pageData.vin || 'N/A'}`);

  const postProcessor = new ArticlePostProcessor();
  
  const context = {
    make: pageData.make,
    model: pageData.model,
    year: pageData.year,
    stateSlug: pageData.state,
    stage: 'deep'
  };

  const processed = postProcessor.process(article, context);

  // Обновляем данные
  const output = {
    ...pageData,
    article: {
      ...article,
      content: processed.content,
      wordCount: processed.wordCount
    },
    fixed_at: new Date().toISOString()
  };

  // Сохраняем или выводим
  if (args.output) {
    fs.writeFileSync(args.output, JSON.stringify(output, null, 2), 'utf8');
    log('FIX-ENDINGS', `✅ Fixed article saved to ${args.output}`);
  } else {
    console.log(JSON.stringify(output, null, 2));
  }

  return output;
}

if (require.main === module) {
  fixEndings();
}

module.exports = { fixEndings };










