#!/usr/bin/env node

/**
 * MONSTER 7.x: Rule Optimizer
 * Оптимизирует и объединяет правила, удаляет дубликаты
 */

const fs = require('fs');
const path = require('path');

function loadJson(path, fallback) {
  if (!fs.existsSync(path)) return fallback;
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function normalizePattern(pattern) {
  return pattern
    .replace(/\s+/g, ' ')
    .replace(/\(.*\|.*\)/g, '(...)')
    .replace(/\[A-Z0-9\]+/g, '[ALNUM]')
    .replace(/\\d\+/g, '<NUM>')
    .trim();
}

function patternsAreSimilar(p1, p2) {
  const norm1 = normalizePattern(p1);
  const norm2 = normalizePattern(p2);
  
  // Если нормализованные паттерны совпадают
  if (norm1 === norm2) return true;
  
  // Если один паттерн содержит другой (более общий)
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return true;
  }
  
  // Проверяем схожесть по первым 20 символам
  if (norm1.length > 20 && norm2.length > 20) {
    if (norm1.substring(0, 20) === norm2.substring(0, 20)) {
      return true;
    }
  }
  
  return false;
}

function main() {
  const args = process.argv.slice(2);
  const inIndex = args.indexOf('--rules-in');
  const outIndex = args.indexOf('--rules-out');
  
  if (inIndex === -1 || outIndex === -1) {
    console.error('Usage: node rule_optimizer.js --rules-in rules/rules.json --rules-out rules/rules.json.tmp');
    process.exit(1);
  }

  const inPath = args[inIndex + 1];
  const outPath = args[outIndex + 1];

  const data = loadJson(inPath, { version: 1, rules: [], stats: { usage: {} } });
  const rules = data.rules || [];
  const usage = data.stats?.usage || {};

  // Группируем правила по нормализованным паттернам
  const buckets = {};
  for (const r of rules) {
    const np = normalizePattern(r.pattern || '.*');
    const key = `${r.type}:${np}`;
    
    if (!buckets[key]) {
      buckets[key] = { base: r, merged: [r], pattern_norm: np };
    } else {
      buckets[key].merged.push(r);
    }
  }

  // Объединяем правила в группах
  const mergedRules = [];
  for (const key of Object.keys(buckets)) {
    const bucket = buckets[key];
    const r = bucket.base;

    // Объединяем applies_to из всех правил в группе
    const allBlocks = new Set();
    for (const rr of bucket.merged) {
      (rr.applies_to || []).forEach(b => allBlocks.add(b));
    }
    r.applies_to = Array.from(allBlocks);

    // Повышаем приоритет на основе использования
    let totalUsage = 0;
    for (const rr of bucket.merged) {
      if (usage[rr.id]) totalUsage += usage[rr.id];
    }
    
    if (totalUsage > 50 && r.priority < 4) {
      r.priority = 4;
    } else if (totalUsage > 10 && r.priority < 3) {
      r.priority = 3;
    }

    // Сохраняем информацию о слиянии
    if (bucket.merged.length > 1) {
      r.meta = r.meta || {};
      r.meta.merged_from = bucket.merged.map(rr => rr.id);
      r.meta.merged_count = bucket.merged.length;
    }

    mergedRules.push(r);
  }

  // Фильтруем неиспользуемые правила (кроме важных)
  const filteredRules = mergedRules.filter(r => {
    const u = usage[r.id] || 0;
    
    // Не удаляем правила с высоким приоритетом
    if (r.priority >= 4) return true;
    
    // Не удаляем правила, которые не auto-generated
    if (!r.meta?.auto_generated) return true;
    
    // Удаляем неиспользуемые auto-generated правила с длинными паттернами
    if (u === 0 && (r.pattern || '').length > 120) {
      return false;
    }
    
    return true;
  });

  // Удаляем дубликаты по схожести паттернов
  const finalRules = [];
  const seenPatterns = new Set();
  
  for (const r of filteredRules) {
    let isDuplicate = false;
    for (const seen of seenPatterns) {
      if (patternsAreSimilar(r.pattern, seen)) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      finalRules.push(r);
      seenPatterns.add(r.pattern);
    }
  }

  const outData = {
    version: (data.version || 1) + 1,
    rules: finalRules,
    stats: data.stats
  };

  fs.writeFileSync(outPath, JSON.stringify(outData, null, 2), 'utf8');
  console.log(`✅ Optimized rules: ${rules.length} -> ${finalRules.length} (removed ${rules.length - finalRules.length})`);
}

if (require.main === module) {
  main();
}

module.exports = { optimizeRules: main };


















