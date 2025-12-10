#!/usr/bin/env node

/**
 * MONSTER 7.x: Block Fingerprinting (Dedup)
 * Создает отпечатки блоков для обнаружения дубликатов
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function normalize(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getFingerprint(text) {
  const norm = normalize(text);
  return crypto.createHash('sha1').update(norm).digest('hex');
}

function isDuplicate(blockName, fingerprint) {
  const fingerprintsDir = path.join(process.cwd(), 'fingerprints');
  if (!fs.existsSync(fingerprintsDir)) {
    fs.mkdirSync(fingerprintsDir, { recursive: true });
    return false;
  }

  const filePath = path.join(fingerprintsDir, `${blockName}.txt`);
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  return content.includes(fingerprint);
}

function saveFingerprint(blockName, fingerprint) {
  const fingerprintsDir = path.join(process.cwd(), 'fingerprints');
  if (!fs.existsSync(fingerprintsDir)) {
    fs.mkdirSync(fingerprintsDir, { recursive: true });
  }

  const filePath = path.join(fingerprintsDir, `${blockName}.txt`);
  fs.appendFileSync(filePath, fingerprint + '\n', 'utf8');
}

function checkDuplicates(blocks) {
  const duplicates = [];
  const fingerprints = {};

  for (const [blockName, content] of Object.entries(blocks)) {
    const fingerprint = getFingerprint(content);
    fingerprints[blockName] = fingerprint;

    if (isDuplicate(blockName, fingerprint)) {
      duplicates.push({
        block: blockName,
        fingerprint,
        is_duplicate: true
      });
    } else {
      saveFingerprint(blockName, fingerprint);
    }
  }

  return {
    duplicates,
    fingerprints,
    has_duplicates: duplicates.length > 0
  };
}

function main() {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf('--input');
  
  if (inputIndex === -1 || !args[inputIndex + 1]) {
    console.error('Usage: node fingerprint_block.js --input <page.json>');
    process.exit(1);
  }

  const inputPath = args[inputIndex + 1];
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const pageData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const article = pageData.article || pageData;
  
  // Извлекаем блоки
  const blocks = {};
  if (article.blocks) {
    article.blocks.forEach(block => {
      blocks[block.type] = block.content || '';
    });
  } else {
    blocks['full_content'] = article.content || '';
  }

  const result = checkDuplicates(blocks);

  console.log(JSON.stringify({
    vin: pageData.vin || 'N/A',
    duplicates: result.duplicates,
    fingerprints: result.fingerprints,
    has_duplicates: result.has_duplicates
  }, null, 2));

  return result.has_duplicates ? 1 : 0;
}

if (require.main === module) {
  const exitCode = main();
  process.exit(exitCode);
}

module.exports = { getFingerprint, isDuplicate, saveFingerprint, checkDuplicates };






