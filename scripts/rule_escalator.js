#!/usr/bin/env node

/**
 * MONSTER 7.x: Rule Escalator
 * Эскалирует правила на основе статистики ошибок
 */

const fs = require('fs');
const path = require('path');

function loadJson(path, fallback) {
  if (!fs.existsSync(path)) return fallback;
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function main() {
  const args = process.argv.slice(2);
  const rulesIndex = args.indexOf('--rules');
  const statsIndex = args.indexOf('--stats');

  if (rulesIndex === -1 || statsIndex === -1) {
    console.error('Usage: node rule_escalator.js --rules rules/rules.json --stats rules/error_patterns.json');
    process.exit(1);
  }

  const rulesPath = args[rulesIndex + 1];
  const statsPath = args[statsIndex + 1];

  const data = loadJson(rulesPath, { version: 1, rules: [], stats: { usage: {} } });
  const patterns = loadJson(statsPath, { patterns: [] }).patterns || [];

  let escalatedCount = 0;

  // Создаем карту паттернов по частоте
  const patternMap = {};
  for (const p of patterns) {
    if (p.count >= 10) {
      patternMap[p.pattern] = p.count;
    }
  }

  // Эскалируем правила на основе частоты паттернов
  for (const r of data.rules) {
    if (!r.pattern) continue;

    // Ищем совпадения с паттернами ошибок
    let maxCount = 0;
    for (const [pattern, count] of Object.entries(patternMap)) {
      if (r.pattern.includes(pattern.slice(0, Math.min(20, pattern.length))) ||
          pattern.includes(r.pattern.slice(0, Math.min(20, r.pattern.length)))) {
        maxCount = Math.max(maxCount, count);
      }
    }

    if (maxCount >= 10) {
      const oldPriority = r.priority || 2;
      const oldAction = r.action || 'warn';

      // Повышаем приоритет
      if (r.priority < 4) {
        r.priority = Math.min(4, r.priority + 1);
        escalatedCount++;
      }

      // Эскалируем действие
      if (maxCount >= 20) {
        if (r.action === 'warn') {
          r.action = 'auto_fix';
        } else if (r.action === 'auto_fix') {
          r.action = 'regenerate_tail';
        }
      } else if (maxCount >= 10) {
        if (r.action === 'warn') {
          r.action = 'auto_fix';
        }
      }

      // Обновляем метаданные
      r.meta = r.meta || {};
      r.meta.escalated = true;
      r.meta.escalated_at = new Date().toISOString();
      r.meta.escalated_from_priority = oldPriority;
      r.meta.escalated_from_action = oldAction;
      r.meta.trigger_count = maxCount;
    }
  }

  fs.writeFileSync(rulesPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ Rule escalation applied: ${escalatedCount} rules escalated`);
}

if (require.main === module) {
  main();
}

module.exports = { escalateRules: main };









