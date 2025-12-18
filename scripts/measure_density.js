#!/usr/bin/env node

/**
 * MONSTER 7.x: Domain Density Measurement (Anti-Water)
 * Измеряет плотность доменных терминов и filler phrases
 */

const fs = require('fs');
const path = require('path');

function loadDomainTerms() {
  const termsPath = path.join(process.cwd(), 'templates', 'domain_terms.json');
  if (!fs.existsSync(termsPath)) {
    return { core_terms: [], filler_phrases: [] };
  }
  return JSON.parse(fs.readFileSync(termsPath, 'utf8'));
}

function tokenize(text) {
  if (!text) return [];
  return text.toLowerCase().split(/\s+/).filter(Boolean);
}

function measureDensity(pageText) {
  const cfg = loadDomainTerms();
  const tokens = tokenize(pageText);
  const total = tokens.length || 1;

  const coreHits = cfg.core_terms.reduce((acc, term) => {
    const re = new RegExp(term.toLowerCase().replace(/\s+/g, '\\s+'), 'g');
    const matches = (pageText.toLowerCase().match(re) || []).length;
    return acc + matches;
  }, 0);

  const fillerHits = cfg.filler_phrases.reduce((acc, term) => {
    const re = new RegExp(term.toLowerCase().replace(/\s+/g, '\\s+'), 'g');
    const matches = (pageText.toLowerCase().match(re) || []).length;
    return acc + matches;
  }, 0);

  const coreDensity = coreHits / total;
  const fillerDensity = fillerHits / total;

  return { coreDensity, fillerDensity, totalWords: total, coreHits, fillerHits };
}

function validateDensity(pageText) {
  const { coreDensity, fillerDensity, totalWords } = measureDensity(pageText);
  const reasons = [];
  
  if (coreDensity < 0.003) {
    reasons.push(`Core domain density too low: ${coreDensity.toFixed(6)} (min: 0.003)`);
  }
  
  if (fillerDensity > 0.01) {
    reasons.push(`Filler density too high: ${fillerDensity.toFixed(6)} (max: 0.01)`);
  }

  return {
    ok: reasons.length === 0,
    reasons,
    coreDensity,
    fillerDensity,
    totalWords
  };
}

function main() {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf('--input');
  
  if (inputIndex === -1 || !args[inputIndex + 1]) {
    console.error('Usage: node measure_density.js --input <page.json>');
    process.exit(1);
  }

  const inputPath = args[inputIndex + 1];
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const pageData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const article = pageData.article || pageData;
  const pageText = article.content || '';

  const result = validateDensity(pageText);
  const metrics = measureDensity(pageText);

  console.log(JSON.stringify({
    vin: pageData.vin || 'N/A',
    density_metrics: {
      core_density: metrics.coreDensity,
      filler_density: metrics.fillerDensity,
      total_words: metrics.totalWords,
      core_hits: metrics.coreHits,
      filler_hits: metrics.fillerHits
    },
    validation: {
      valid: result.ok,
      reasons: result.reasons
    }
  }, null, 2));

  return result.ok ? 0 : 1;
}

if (require.main === module) {
  const exitCode = main();
  process.exit(exitCode);
}

module.exports = { measureDensity, validateDensity };








