#!/usr/bin/env node

/**
 * MONSTER 7.x: Rule Compiler
 * Компилирует правила из извлеченных паттернов ошибок
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function loadJson(path, fallback) {
  if (!fs.existsSync(path)) return fallback;
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function guessType(kind) {
  if (kind === 'syntax_incomplete') return 'syntax';
  if (kind === 'fact_mismatch') return 'fact_lock';
  if (kind === 'state_specific') return 'state_spec';
  if (kind === 'validation_error') return 'structure';
  if (kind === 'block_validation') return 'structure';
  return 'syntax';
}

function escapeRegexPattern(pattern) {
  // Экранируем специальные символы regex, но сохраняем <NUM> и <VIN> как есть
  return pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/<NUM>/g, '\\d+')
    .replace(/<VIN>/g, '[A-Z0-9]{17}');
}

function generateRuleId(type, pattern) {
  const hash = crypto.createHash('md5').update(pattern).digest('hex').slice(0, 8);
  return `${type}_auto_${hash}`;
}

function main() {
  const args = process.argv.slice(2);
  const patIndex = args.indexOf('--patterns');
  const inIndex = args.indexOf('--rules-in');
  const outIndex = args.indexOf('--rules-out');
  
  if (patIndex === -1 || inIndex === -1 || outIndex === -1) {
    console.error('Usage: node rule_compiler.js --patterns rules/error_patterns.json --rules-in rules/rules.json --rules-out rules/rules.json.tmp');
    process.exit(1);
  }

  const patternsPath = args[patIndex + 1];
  const rulesInPath = args[inIndex + 1];
  const rulesOutPath = args[outIndex + 1];

  const patData = loadJson(patternsPath, { patterns: [] });
  const data = loadJson(rulesInPath, { version: 1, rules: [], stats: { usage: {} } });

  const rules = data.rules || [];
  const existingIds = new Set(rules.map(r => r.id));
  const existingPatterns = new Set(rules.map(r => r.pattern));

  let compiledCount = 0;

  for (const p of patData.patterns || []) {
    // Пропускаем редкие паттерны (меньше 3 вхождений)
    if (p.count < 3) continue;
    
    // Пропускаем слишком длинные паттерны
    if (p.pattern.length > 200) continue;

    const type = guessType(p.kind);
    const escapedPattern = escapeRegexPattern(p.pattern);
    
    // Проверяем, нет ли уже такого паттерна
    if (existingPatterns.has(escapedPattern)) continue;

    const id = generateRuleId(type, p.pattern);
    if (existingIds.has(id)) continue;

    // Определяем действие по типу
    let action = 'auto_fix';
    let replacement = null;
    
    if (type === 'syntax') {
      // Для синтаксических ошибок пытаемся создать replacement
      if (p.pattern.includes('not.')) {
        replacement = 'not immediately apparent or documented.';
      } else if (p.pattern.includes('which may')) {
        action = 'regenerate_tail';
      } else if (p.pattern.endsWith('.')) {
        // Для незавершенных предложений используем regenerate_tail
        action = 'regenerate_tail';
      }
    } else if (type === 'fact_lock') {
      action = 'warn';
    } else if (type === 'state_spec') {
      action = 'warn';
    } else if (type === 'structure') {
      action = 'warn';
    }

    const rule = {
      id,
      type,
      scope: 'block',
      priority: p.count >= 10 ? 3 : 2, // Выше приоритет для частых паттернов
      pattern: escapedPattern,
      action,
      applies_to: ['hero', 'state_specific', 'accident_intelligence', 'buyer_guide', 'faq', 'recalls_tsbs'],
      meta: {
        description: `AUTO: compiled from pattern kind=${p.kind}, count=${p.count}`,
        stage_min: 'deep',
        stage_max: 'light',
        auto_generated: true,
        source_pattern: p.pattern,
        examples: p.examples.slice(0, 3)
      }
    };

    if (replacement) {
      rule.replacement = replacement;
    }

    rules.push(rule);
    existingIds.add(id);
    existingPatterns.add(escapedPattern);
    compiledCount++;
  }

  const outData = {
    version: data.version || 1,
    rules,
    stats: data.stats || { usage: {} }
  };

  fs.writeFileSync(rulesOutPath, JSON.stringify(outData, null, 2), 'utf8');
  console.log(`✅ RuleCompiler: compiled ${compiledCount} new rules, total rules=${rules.length}`);
}

if (require.main === module) {
  main();
}

module.exports = { compileRules: main };



