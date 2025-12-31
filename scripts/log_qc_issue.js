#!/usr/bin/env node

/**
 * MONSTER 7.x: QC Issue Logger
 * Логирует проблемы качества в централизованный файл
 */

const fs = require('fs');
const path = require('path');

function logIssue(vin, issues, stage) {
  const qcLogPath = path.join(process.cwd(), 'logs', 'qc_issues.log');
  const qcLogDir = path.dirname(qcLogPath);
  
  if (!fs.existsSync(qcLogDir)) {
    fs.mkdirSync(qcLogDir, { recursive: true });
  }

  const entry = {
    vin,
    stage,
    issues: Array.isArray(issues) ? issues : [issues],
    timestamp: new Date().toISOString()
  };

  fs.appendFileSync(qcLogPath, JSON.stringify(entry) + '\n', 'utf8');
  console.log(`✅ QC issue logged for ${vin} (stage: ${stage})`);
}

function main() {
  const args = process.argv.slice(2);
  const vinIndex = args.indexOf('--vin');
  const stageIndex = args.indexOf('--stage');
  const issuesIndex = args.indexOf('--issues');
  
  if (vinIndex === -1 || !args[vinIndex + 1]) {
    console.error('Usage: node log_qc_issue.js --vin <VIN> --stage <stage> --issues <issue1,issue2,...>');
    process.exit(1);
  }

  const vin = args[vinIndex + 1];
  const stage = stageIndex !== -1 ? args[stageIndex + 1] : 'unknown';
  const issuesStr = issuesIndex !== -1 ? args[issuesIndex + 1] : 'Unknown issue';
  
  const issues = issuesStr.split(',').map(i => i.trim());
  
  logIssue(vin, issues, stage);
}

if (require.main === module) {
  main();
}

module.exports = { logIssue };















