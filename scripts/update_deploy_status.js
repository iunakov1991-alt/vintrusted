#!/usr/bin/env node
/**
 * Обновление статуса деплоя
 * Отслеживает количество созданных и задеплоенных страниц
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const DEPLOY_STATUS_PATH = path.join(ROOT_DIR, 'tmp', 'deploy-status.json');

function countPagesInDir(dir) {
  if (!fs.existsSync(dir)) return 0;
  try {
    const files = fs.readdirSync(dir, { recursive: true });
    return files.filter(f => f === 'index.html' || f.endsWith('/index.html')).length;
  } catch {
    return 0;
  }
}

function getDeployedPages(lang) {
  // Проверяем через git (последний коммит с semantic-pages)
  try {
    const result = execSync(
      `git log -1 --name-only --pretty=format: -- "public/semantic-pages/${lang}/" 2>/dev/null || echo ""`,
      { cwd: ROOT_DIR, encoding: 'utf8', timeout: 5000 }
    );
    const files = result.trim().split('\n').filter(f => f.endsWith('index.html'));
    return files.length;
  } catch {
    // Если git недоступен, считаем что все созданные = задеплоены
    return countPagesInDir(path.join(ROOT_DIR, 'public', 'semantic-pages', lang));
  }
}

function main() {
  const enCreated = countPagesInDir(path.join(ROOT_DIR, 'public', 'semantic-pages', 'en'));
  const esCreated = countPagesInDir(path.join(ROOT_DIR, 'public', 'semantic-pages', 'es'));
  
  const enDeployed = getDeployedPages('en');
  const esDeployed = getDeployedPages('es');
  
  const status = {
    en: {
      created: enCreated,
      deployed: enDeployed,
      pending: enCreated - enDeployed
    },
    es: {
      created: esCreated,
      deployed: esDeployed,
      pending: esCreated - esDeployed
    },
    total: {
      created: enCreated + esCreated,
      deployed: enDeployed + esDeployed,
      pending: (enCreated + esCreated) - (enDeployed + esDeployed)
    },
    lastUpdate: Date.now()
  };
  
  fs.mkdirSync(path.dirname(DEPLOY_STATUS_PATH), { recursive: true });
  fs.writeFileSync(DEPLOY_STATUS_PATH, JSON.stringify(status, null, 2));
  
  console.log('[DEPLOY-STATUS] Updated:');
  console.log(`  EN: ${enCreated} created, ${enDeployed} deployed, ${enCreated - enDeployed} pending`);
  console.log(`  ES: ${esCreated} created, ${esDeployed} deployed, ${esCreated - esDeployed} pending`);
  console.log(`  Total: ${enCreated + esCreated} created, ${enDeployed + esDeployed} deployed`);
}

if (require.main === module) {
  main();
}

module.exports = { getDeployedPages, countPagesInDir };

