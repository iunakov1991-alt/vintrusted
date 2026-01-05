#!/usr/bin/env node

/**
 * MONSTER 7.x: Auto Pattern Extractor
 * Извлекает паттерны ошибок из логов для автоматического создания правил
 */

const fs = require('fs');
const path = require('path');

function parseLogLine(line) {
  // Ищем ERROR записи
  const mErr = line.match(/\[ERROR\]\s+\[(.+?)\]\s+(.+)/);
  if (!mErr) {
    // Также ищем WARNING записи
    const mWarn = line.match(/\[WARN\]\s+\[(.+?)\]\s+(.+)/);
    if (!mWarn) return null;
    const source = mWarn[1];
    const msg = mWarn[2];
    
    // Обрабатываем предупреждения о незавершенных предложениях
    const mUnfinished = msg.match(/Unfinished sentence:\s+"(.+?)"/i);
    if (mUnfinished) {
      return { kind: "syntax_incomplete", raw: mUnfinished[1], source };
    }
    
    return null;
  }
  
  const source = mErr[1];
  const msg = mErr[2];

  // Незавершенные предложения
  const mUnfinished = msg.match(/Unfinished sentence:\s+"(.+?)"/i);
  if (mUnfinished) {
    return { kind: "syntax_incomplete", raw: mUnfinished[1], source };
  }

  // Ошибки фактов
  const mFact = msg.match(/Fact mismatch:\s+(.+)/i);
  if (mFact) {
    return { kind: "fact_mismatch", raw: mFact[1], source };
  }

  // State-specific проблемы
  const mState = msg.match(/State specific issue:\s+(.+)/i);
  if (mState) {
    return { kind: "state_specific", raw: mState[1], source };
  }

  // Валидационные ошибки
  const mValidation = msg.match(/Validation failed:\s+(.+)/i);
  if (mValidation) {
    return { kind: "validation_error", raw: mValidation[1], source };
  }

  // Обрывы предложений
  const mIncomplete = msg.match(/Incomplete sentence:\s+"(.+?)"/i);
  if (mIncomplete) {
    return { kind: "syntax_incomplete", raw: mIncomplete[1], source };
  }

  // Незавершенные блоки
  const mBlock = msg.match(/Block (.+?) failed validation/i);
  if (mBlock) {
    return { kind: "block_validation", raw: mBlock[1], source };
  }

  return null;
}

function loadLog(path) {
  if (!fs.existsSync(path)) {
    console.error(`No log file ${path}`);
    process.exit(0);
  }
  return fs.readFileSync(path, 'utf8').split('\n');
}

function normalizeRaw(raw) {
  return raw
    .trim()
    .replace(/\d+/g, '<NUM>')
    .replace(/VIN\s+[A-Z0-9]+/gi, 'VIN <VIN>')
    .replace(/[A-Z0-9]{17}/g, '<VIN>')
    .replace(/\s+/g, ' ')
    .substring(0, 200); // Ограничиваем длину
}

function main() {
  const args = process.argv.slice(2);
  const logIndex = args.indexOf('--log');
  const outIndex = args.indexOf('--out');
  
  if (logIndex === -1 || outIndex === -1) {
    console.error('Usage: node auto_pattern_extractor.js --log logs/stageX.log --out rules/error_patterns.json');
    process.exit(1);
  }

  const logPath = args[logIndex + 1];
  const outPath = args[outIndex + 1];

  // Создаем директорию если нужно
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const lines = loadLog(logPath);
  const map = {};

  for (const line of lines) {
    const parsed = parseLogLine(line);
    if (!parsed) continue;

    const norm = normalizeRaw(parsed.raw);
    if (!norm || norm.length < 5) continue; // Пропускаем слишком короткие паттерны

    const key = `${parsed.kind}::${norm}`;
    if (!map[key]) {
      map[key] = { 
        kind: parsed.kind, 
        pattern: norm, 
        examples: [], 
        count: 0,
        sources: new Set()
      };
    }
    map[key].count++;
    map[key].sources.add(parsed.source);
    
    if (map[key].examples.length < 5) {
      map[key].examples.push(parsed.raw);
    }
  }

  const patterns = Object.values(map)
    .map(p => ({
      kind: p.kind,
      pattern: p.pattern,
      examples: p.examples,
      count: p.count,
      sources: Array.from(p.sources)
    }))
    .sort((a, b) => b.count - a.count);

  const output = {
    extracted_at: new Date().toISOString(),
    log_source: logPath,
    total_patterns: patterns.length,
    patterns: patterns
  };

  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`✅ Saved ${patterns.length} patterns to ${outPath}`);
  console.log(`   Top patterns: ${patterns.slice(0, 5).map(p => `${p.kind} (${p.count}x)`).join(', ')}`);
}

if (require.main === module) {
  main();
}

module.exports = { parseLogLine, normalizeRaw, extractPatterns: main };


















