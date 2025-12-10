#!/usr/bin/env node

/**
 * MONSTER 7.x: Intent Coverage Validation
 * Проверяет покрытие всех глобальных интентов в статье
 */

const fs = require('fs');
const path = require('path');

function loadIntentMatrix() {
  const intentPath = path.join(process.cwd(), 'templates', 'intent_matrix.json');
  if (!fs.existsSync(intentPath)) {
    return { global_intents: {} };
  }
  return JSON.parse(fs.readFileSync(intentPath, 'utf8'));
}

function textHasAny(text, terms) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return terms.some(t => lower.includes(t.toLowerCase()));
}

function validateIntents(blocks, intentMatrix) {
  const intents = intentMatrix.global_intents || {};
  const failed = [];
  const covered = [];

  for (const [intent, cfg] of Object.entries(intents)) {
    const { required_terms, allowed_blocks } = cfg;
    let isCovered = false;

    for (const blockName of allowed_blocks) {
      const text = blocks[blockName] || '';
      if (textHasAny(text, required_terms)) {
        isCovered = true;
        covered.push({ intent, block: blockName });
        break;
      }
    }

    if (!isCovered) {
      failed.push({
        intent,
        required_terms,
        allowed_blocks
      });
    }
  }

  return {
    ok: failed.length === 0,
    failed,
    covered,
    coverage_rate: intents ? (covered.length / Object.keys(intents).length) : 0
  };
}

function main() {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf('--input');
  
  if (inputIndex === -1 || !args[inputIndex + 1]) {
    console.error('Usage: node validate_intents.js --input <page.json>');
    process.exit(1);
  }

  const inputPath = args[inputIndex + 1];
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const pageData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const article = pageData.article || pageData;
  
  // Извлекаем блоки из контента или из структуры статьи
  const blocks = {};
  if (article.blocks) {
    article.blocks.forEach(block => {
      blocks[block.type] = block.content || '';
    });
  } else if (article.content) {
    // Пытаемся извлечь блоки из контента по заголовкам
    const h2Matches = article.content.match(/##\s+([^\n]+)/g) || [];
    h2Matches.forEach(h2 => {
      const blockName = h2.replace(/##\s+/, '').toLowerCase().replace(/\s+/g, '_');
      blocks[blockName] = article.content; // Упрощенная версия
    });
  }

  const intentMatrix = loadIntentMatrix();
  const result = validateIntents(blocks, intentMatrix);

  console.log(JSON.stringify({
    vin: pageData.vin || 'N/A',
    intent_coverage: result.coverage_rate,
    covered_intents: result.covered.length,
    failed_intents: result.failed.length,
    failed: result.failed,
    covered: result.covered,
    valid: result.ok
  }, null, 2));

  return result.ok ? 0 : 1;
}

if (require.main === module) {
  const exitCode = main();
  process.exit(exitCode);
}

module.exports = { validateIntents, loadIntentMatrix };






