#!/usr/bin/env node

/**
 * MONSTER 7.x: Page Analytics Logger
 * Логирует аналитику по каждой странице в JSONL формате для ClickHouse/BigQuery
 */

const fs = require('fs');
const path = require('path');

function parseValidateLine(line) {
  const out = {
    severity: "OK",
    fatal_count: 0,
    major_count: 0,
    minor_count: 0,
    wordcount: 0,
    weak_blocks: []
  };
  if (!line) return out;

  const parts = line.trim().split(";");
  for (const part of parts) {
    const [k, v] = part.split(":");
    if (!k || v === undefined) continue;
    if (k === "SEVERITY") out.severity = v;
    if (k === "WORDCOUNT") out.wordcount = parseInt(v, 10) || 0;
    if (k.startsWith("FATAL=")) out.fatal_count = parseInt(k.split("=")[1], 10) || 0;
    if (k.startsWith("MAJOR=")) out.major_count = parseInt(k.split("=")[1], 10) || 0;
    if (k.startsWith("MINOR=")) out.minor_count = parseInt(k.split("=")[1], 10) || 0;
    if (k.startsWith("WEAK=")) {
      const list = k.split("=")[1] || "";
      out.weak_blocks = list ? list.split(",").filter(Boolean) : [];
    }
  }

  return out;
}

function main() {
  const args = process.argv.slice(2);
  const vin = args[0];
  const stage = args[1];
  const validateLine = args[2] || "";
  const qaPath = path.join('/tmp', `${vin}.qa.json`);

  if (!vin || !stage) {
    console.error('Usage: node log_page_analytics.js <VIN> <STAGE> [VALIDATE_LINE]');
    process.exit(1);
  }

  const v = parseValidateLine(validateLine);
  let qa = { rules_fired: [], weak_blocks: [] };
  if (fs.existsSync(qaPath)) {
    try {
      qa = JSON.parse(fs.readFileSync(qaPath, "utf8"));
    } catch (e) {
      // Если не удалось прочитать, используем значения по умолчанию
    }
  }

  const record = {
    vin,
    stage,
    severity: v.severity,
    fatal_count: v.fatal_count,
    major_count: v.major_count,
    minor_count: v.minor_count,
    wordcount: v.wordcount,
    rules_fired: qa.rules_fired || [],
    weak_blocks: (qa.weak_blocks || []).length ? qa.weak_blocks : v.weak_blocks,
    ts: new Date().toISOString()
  };

  // Создаем директорию logs если её нет
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const logFile = path.join(logsDir, 'pages_analytics.log');
  fs.appendFileSync(logFile, JSON.stringify(record) + "\n", 'utf8');
  
  console.error(`[ANALYTICS] Logged ${vin} (${stage}) severity=${v.severity} to ${logFile}`);
}

if (require.main === module) {
  main();
}

module.exports = { parseValidateLine, logPageAnalytics: main };
















