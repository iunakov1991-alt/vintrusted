#!/usr/bin/env node

/**
 * MONSTER 7.x: Rule Usage Tracker
 * Отслеживает использование правил (CLI версия)
 */

const fs = require('fs');
const path = require('path');

function loadJson(path, fallback) {
  if (!fs.existsSync(path)) return fallback;
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function main() {
  const args = process.argv.slice(2);
  const ruleIdIndex = args.indexOf('--rule-id');
  const rulesIndex = args.indexOf('--rules');

  if (ruleIdIndex === -1 || rulesIndex === -1) {
    console.error('Usage: node rule_usage_tracker.js --rule-id <ID> --rules rules/rules.json');
    process.exit(1);
  }

  const ruleId = args[ruleIdIndex + 1];
  const rulesPath = args[rulesIndex + 1];

  const data = loadJson(rulesPath, { version: 1, rules: [], stats: { usage: {} } });
  
  if (!data.stats) data.stats = { usage: {} };
  if (!data.stats.usage) data.stats.usage = {};

  data.stats.usage[ruleId] = (data.stats.usage[ruleId] || 0) + 1;

  fs.writeFileSync(rulesPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ Tracked usage for rule ${ruleId}: ${data.stats.usage[ruleId]}`);
}

if (require.main === module) {
  main();
}

module.exports = { trackUsage: main };














