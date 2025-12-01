#!/usr/bin/env node
/**
 * Автоматический мониторинг деплоя Vercel
 * Проверяет статус последних коммитов и анализирует возможные проблемы
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '.deployment-monitor.log');

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

function getLastCommit() {
  try {
    const hash = execSync('git log -1 --format="%h"', { encoding: 'utf8' }).trim();
    const message = execSync('git log -1 --format="%s"', { encoding: 'utf8' }).trim();
    const time = execSync('git log -1 --format="%cd" --date=relative', { encoding: 'utf8' }).trim();
    return { hash, message, time };
  } catch (e) {
    return null;
  }
}

function checkSyncStatus() {
  try {
    execSync('git fetch origin', { stdio: 'ignore' });
    const local = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const remote = execSync('git rev-parse origin/main', { encoding: 'utf8' }).trim();
    return { synced: local === remote, local, remote };
  } catch (e) {
    return { synced: false, error: e.message };
  }
}

function getRecentFixes() {
  try {
    const fixes = execSync('git log --oneline --grep="Fix:" -10', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean);
    return fixes;
  } catch (e) {
    return [];
  }
}

function analyzePotentialIssues() {
  const issues = [];
  
  // Проверка исправлений
  const fixes = getRecentFixes();
  if (fixes.length > 0) {
    log(`✅ Найдено ${fixes.length} исправлений в последних коммитах`);
    
    // Анализ типичных проблем
    const fixMessages = fixes.join(' ').toLowerCase();
    
    if (fixMessages.includes('jsdom')) {
      issues.push({
        type: 'jsdom',
        severity: 'low',
        message: 'Исправления jsdom применены - fallback механизмы должны работать',
        status: 'resolved'
      });
    }
    
    if (fixMessages.includes('countexistingpages') || fixMessages.includes('getrecentbuilds')) {
      issues.push({
        type: 'missing-method',
        severity: 'medium',
        message: 'Исправления отсутствующих методов применены',
        status: 'resolved'
      });
    }
    
    if (fixMessages.includes('keywords')) {
      issues.push({
        type: 'keywords-structure',
        severity: 'medium',
        message: 'Исправления структуры keywords применены',
        status: 'resolved'
      });
    }
  }
  
  return issues;
}

function checkBuildFiles() {
  const criticalFiles = [
    'scripts/seo/seo-master-build.js',
    'scripts/seo/platform/static-architecture.js',
    'scripts/seo/links/smart-canonical-engine.js',
    'scripts/seo/optimization/visual-content-optimizer.js',
    'scripts/seo/analytics/build-history.js'
  ];
  
  const results = [];
  for (const file of criticalFiles) {
    const exists = fs.existsSync(path.join(__dirname, file));
    results.push({ file, exists });
  }
  
  return results;
}

function main() {
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('🔍 АВТОМАТИЧЕСКАЯ ПРОВЕРКА СТАТУСА ДЕПЛОЯ');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('');
  
  // Проверка последнего коммита
  const lastCommit = getLastCommit();
  if (lastCommit) {
    log(`📝 ПОСЛЕДНИЙ КОММИТ:`);
    log(`   Hash: ${lastCommit.hash}`);
    log(`   Сообщение: ${lastCommit.message}`);
    log(`   Время: ${lastCommit.time}`);
    log('');
  }
  
  // Проверка синхронизации
  const syncStatus = checkSyncStatus();
  if (syncStatus.synced) {
    log('🌐 СИНХРОНИЗАЦИЯ: ✅ Локальная ветка синхронизирована с origin/main');
  } else {
    log('🌐 СИНХРОНИЗАЦИЯ: ⚠️  Есть различия между локальной и remote веткой');
    if (syncStatus.local && syncStatus.remote) {
      log(`   Локальная: ${syncStatus.local.substring(0, 7)}`);
      log(`   Remote: ${syncStatus.remote.substring(0, 7)}`);
    }
  }
  log('');
  
  // Анализ потенциальных проблем
  const issues = analyzePotentialIssues();
  if (issues.length > 0) {
    log('🔍 АНАЛИЗ ИСПРАВЛЕНИЙ:');
    for (const issue of issues) {
      const icon = issue.status === 'resolved' ? '✅' : '⚠️';
      log(`   ${icon} ${issue.type}: ${issue.message}`);
    }
    log('');
  }
  
  // Проверка критических файлов
  const buildFiles = checkBuildFiles();
  const missingFiles = buildFiles.filter(f => !f.exists);
  if (missingFiles.length === 0) {
    log('📦 КРИТИЧЕСКИЕ ФАЙЛЫ: ✅ Все файлы на месте');
  } else {
    log('📦 КРИТИЧЕСКИЕ ФАЙЛЫ: ⚠️  Отсутствуют файлы:');
    for (const file of missingFiles) {
      log(`   ❌ ${file.file}`);
    }
  }
  log('');
  
  // Рекомендации
  log('📋 РЕКОМЕНДАЦИИ:');
  log('   1. Проверьте Vercel Dashboard: https://vercel.com/dashboard');
  if (lastCommit) {
    log(`   2. Найдите деплой с коммитом: ${lastCommit.hash}`);
  }
  log('   3. Проверьте Build Logs на наличие ошибок');
  log('   4. Убедитесь, что деплой завершился успешно');
  log('');
  
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Итоговый статус
  const allGood = syncStatus.synced && missingFiles.length === 0 && issues.every(i => i.status === 'resolved');
  if (allGood) {
    log('✅ СТАТУС: Все проверки пройдены успешно');
    process.exit(0);
  } else {
    log('⚠️  СТАТУС: Обнаружены проблемы, требующие внимания');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, getLastCommit, checkSyncStatus, analyzePotentialIssues };

