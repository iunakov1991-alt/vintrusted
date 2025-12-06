#!/usr/bin/env node
/**
 * Комплексная проверка готовности MONSTER 8.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');

const checks = {
  critical: [],
  important: [],
  optional: []
};

function checkFile(filePath, description, category = 'important') {
  const fullPath = path.join(ROOT_DIR, filePath);
  const exists = fs.existsSync(fullPath);
  checks[category].push({
    name: description,
    file: filePath,
    status: exists ? '✅' : '❌',
    exists
  });
  return exists;
}

function checkDir(dirPath, description, category = 'important') {
  const fullPath = path.join(ROOT_DIR, dirPath);
  const exists = fs.existsSync(fullPath);
  checks[category].push({
    name: description,
    file: dirPath,
    status: exists ? '✅' : '❌',
    exists
  });
  return exists;
}

function checkSyntax(filePath, description) {
  try {
    execSync(`node -c "${path.join(ROOT_DIR, filePath)}"`, { stdio: 'pipe', timeout: 5000 });
    checks.important.push({
      name: `${description} (синтаксис)`,
      file: filePath,
      status: '✅',
      exists: true
    });
    return true;
  } catch {
    checks.important.push({
      name: `${description} (синтаксис)`,
      file: filePath,
      status: '❌',
      exists: false
    });
    return false;
  }
}

function checkExecutable(filePath, description) {
  try {
    const stats = fs.statSync(path.join(ROOT_DIR, filePath));
    const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
    checks.important.push({
      name: `${description} (исполняемый)`,
      file: filePath,
      status: isExecutable ? '✅' : '❌',
      exists: isExecutable
    });
    return isExecutable;
  } catch {
    checks.important.push({
      name: `${description} (исполняемый)`,
      file: filePath,
      status: '❌',
      exists: false
    });
    return false;
  }
}

function checkJSON(filePath, description) {
  try {
    const content = fs.readFileSync(path.join(ROOT_DIR, filePath), 'utf8');
    JSON.parse(content);
    checks.optional.push({
      name: `${description} (валидный JSON)`,
      file: filePath,
      status: '✅',
      exists: true
    });
    return true;
  } catch {
    checks.optional.push({
      name: `${description} (валидный JSON)`,
      file: filePath,
      status: '❌',
      exists: false
    });
    return false;
  }
}

// ============================================================
// КРИТИЧНЫЕ КОМПОНЕНТЫ
// ============================================================

console.log('🔍 Проверка критичных компонентов...\n');

// Оркестратор
checkFile('monster8_orchestrator.sh', 'Оркестратор', 'critical');
checkExecutable('monster8_orchestrator.sh', 'Оркестратор');

// Батч скрипты
checkFile('scripts/build_topics_batch.js', 'Батч скрипт (последовательный)', 'critical');
checkFile('scripts/build_topics_batch_parallel.js', 'Батч скрипт (параллельный)', 'critical');
checkFile('scripts/build_topic_page.sh', 'Скрипт генерации страницы', 'critical');
checkExecutable('scripts/build_topic_page.sh', 'Скрипт генерации страницы');

// Основные скрипты генерации
checkFile('scripts/build_article_spec.js', 'Генерация спецификации статьи', 'critical');
checkFile('scripts/gen_article_blocks.js', 'Генерация блоков', 'critical');
checkFile('scripts/validate_blocks.js', 'Валидация блоков', 'critical');
checkFile('scripts/render_article_from_blocks.js', 'Рендеринг HTML', 'critical');

// Дашборд
checkFile('monster-8.0/dashboard/server-8.0.js', 'Дашборд сервер', 'critical');
checkFile('monster-8.0/dashboard/ui/index-8.0.html', 'Дашборд UI', 'critical');
checkFile('monster-8.0/dashboard/ui/dashboard-8.0.js', 'Дашборд JS', 'critical');
checkFile('monster-8.0/dashboard/ui/dashboard-8.0.css', 'Дашборд CSS', 'critical');

// ============================================================
// ВАЖНЫЕ КОМПОНЕНТЫ
// ============================================================

console.log('🔍 Проверка важных компонентов...\n');

// Конфигурация
checkFile('config/topic-priority.json', 'Приоритеты тем', 'important');
checkFile('config/article_types.json', 'Типы статей', 'important');
checkFile('config/block_profiles.json', 'Профили блоков', 'important');
checkFile('config/audience_segments.json', 'Сегменты аудитории', 'important');

// Очереди тем
checkFile('data/topics_queue.en.json', 'Очередь тем (EN)', 'important');
checkFile('data/topics_queue.es.json', 'Очередь тем (ES)', 'important');

// Система обучения
checkFile('data/seo/ai-training/learned-strategy.json', 'Обученная стратегия', 'important');
checkFile('data/seo/ai-training/knowledge-base.jsonl', 'База знаний', 'important');
checkFile('data/seo/ai-cache.jsonl', 'AI кэш', 'important');

// Новые улучшения
checkFile('monster-8.0/dashboard/server-health.js', 'Health Check API', 'important');
checkFile('scripts/auto_retry_with_backoff.js', 'Retry с backoff', 'important');
checkFile('scripts/auto_backup.sh', 'Автоматический бэкап', 'important');
checkFile('scripts/watchdog_orchestrator.js', 'Watchdog', 'important');

// Деплой
checkFile('scripts/safe_deploy.sh', 'Безопасный деплой', 'important');
checkFile('scripts/validate_before_deploy.js', 'Валидация перед деплоем', 'important');
checkFile('api/semantic-page.js', 'API fallback', 'important');
checkFile('vercel.json', 'Vercel конфигурация', 'important');

// ============================================================
// ОПЦИОНАЛЬНЫЕ КОМПОНЕНТЫ
// ============================================================

console.log('🔍 Проверка опциональных компонентов...\n');

// Директории
checkDir('public/semantic-pages', 'Директория сгенерированных страниц', 'optional');
checkDir('data/seo/ai-training/canonical-prompts', 'Канонические промпты', 'optional');
checkDir('data/seo/ai-training/reference-articles', 'Референсные статьи', 'optional');

// Документация
checkFile('docs/LEARNING_MEMORY_STATUS.md', 'Документация: Память обучения', 'optional');
checkFile('docs/IMPROVEMENTS_PROPOSAL.md', 'Документация: Улучшения', 'optional');
checkFile('docs/DASHBOARD_FEATURES_COMPLETE.md', 'Документация: Дашборд', 'optional');
checkFile('docs/DEPLOYMENT_STRATEGY.md', 'Документация: Деплой', 'optional');

// ============================================================
// ПРОВЕРКА СИНТАКСИСА
// ============================================================

console.log('🔍 Проверка синтаксиса...\n');

checkSyntax('monster-8.0/dashboard/server-8.0.js', 'Дашборд сервер');
checkSyntax('scripts/build_topics_batch_parallel.js', 'Батч скрипт (параллельный)');
checkSyntax('scripts/sort_topics_by_priority.js', 'Сортировка тем');
checkSyntax('scripts/update_deploy_status.js', 'Статус деплоя');
checkSyntax('monster-8.0/dashboard/server-health.js', 'Health Check API');
checkSyntax('scripts/watchdog_orchestrator.js', 'Watchdog');

// ============================================================
// ПРОВЕРКА ПАКЕТОВ
// ============================================================

console.log('🔍 Проверка зависимостей...\n');

try {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  const requiredDeps = ['express', 'socket.io', 'cors'];
  const deps = Object.keys(pkg.dependencies || {});
  
  requiredDeps.forEach(dep => {
    const exists = deps.includes(dep);
    checks.important.push({
      name: `Зависимость: ${dep}`,
      file: 'package.json',
      status: exists ? '✅' : '❌',
      exists
    });
  });
  
  // Проверка MONSTER 8.0 скриптов
  const monster8Scripts = Object.keys(pkg.scripts || {}).filter(s => s.includes('monster8'));
  checks.important.push({
    name: `NPM скрипты MONSTER 8.0 (${monster8Scripts.length})`,
    file: 'package.json',
    status: monster8Scripts.length >= 4 ? '✅' : '⚠️',
    exists: monster8Scripts.length >= 4
  });
} catch (err) {
  checks.critical.push({
    name: 'package.json (чтение)',
    file: 'package.json',
    status: '❌',
    exists: false
  });
}

// ============================================================
// ПРОВЕРКА СГЕНЕРИРОВАННЫХ СТРАНИЦ
// ============================================================

console.log('🔍 Проверка сгенерированных страниц...\n');

try {
  const semanticPagesDir = path.join(ROOT_DIR, 'public', 'semantic-pages');
  if (fs.existsSync(semanticPagesDir)) {
    const enDir = path.join(semanticPagesDir, 'en');
    const esDir = path.join(semanticPagesDir, 'es');
    
    let enPages = 0;
    let esPages = 0;
    
    if (fs.existsSync(enDir)) {
      const findPages = (dir) => {
        let count = 0;
        try {
          const files = fs.readdirSync(dir, { recursive: true });
          count = files.filter(f => f === 'index.html' || f.endsWith('/index.html')).length;
        } catch {}
        return count;
      };
      enPages = findPages(enDir);
    }
    
    if (fs.existsSync(esDir)) {
      const findPages = (dir) => {
        let count = 0;
        try {
          const files = fs.readdirSync(dir, { recursive: true });
          count = files.filter(f => f === 'index.html' || f.endsWith('/index.html')).length;
        } catch {}
        return count;
      };
      esPages = findPages(esDir);
    }
    
    checks.optional.push({
      name: `Сгенерированные страницы (EN: ${enPages}, ES: ${esPages}, Всего: ${enPages + esPages})`,
      file: 'public/semantic-pages',
      status: (enPages + esPages) > 0 ? '✅' : '⚠️',
      exists: true
    });
  } else {
    checks.optional.push({
      name: 'Сгенерированные страницы',
      file: 'public/semantic-pages',
      status: '⚠️',
      exists: false
    });
  }
} catch (err) {
  // Игнорируем ошибки
}

// ============================================================
// ВЫВОД РЕЗУЛЬТАТОВ
// ============================================================

console.log('\n' + '='.repeat(60));
console.log('📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ ГОТОВНОСТИ MONSTER 8.0');
console.log('='.repeat(60) + '\n');

function printChecks(category, title) {
  const items = checks[category];
  if (items.length === 0) return;
  
  console.log(`\n${title}:`);
  console.log('-'.repeat(60));
  
  const passed = items.filter(i => i.exists).length;
  const total = items.length;
  
  items.forEach(item => {
    console.log(`${item.status} ${item.name}`);
    if (!item.exists && category === 'critical') {
      console.log(`   ⚠️  Файл: ${item.file}`);
    }
  });
  
  console.log(`\nИтого: ${passed}/${total} ✅`);
}

printChecks('critical', '🔴 КРИТИЧНЫЕ КОМПОНЕНТЫ');
printChecks('important', '🟡 ВАЖНЫЕ КОМПОНЕНТЫ');
printChecks('optional', '🔵 ОПЦИОНАЛЬНЫЕ КОМПОНЕНТЫ');

// ============================================================
// ИТОГОВАЯ ОЦЕНКА
// ============================================================

console.log('\n' + '='.repeat(60));
console.log('🎯 ИТОГОВАЯ ОЦЕНКА ГОТОВНОСТИ');
console.log('='.repeat(60) + '\n');

const criticalPassed = checks.critical.filter(i => i.exists).length;
const criticalTotal = checks.critical.length;
const importantPassed = checks.important.filter(i => i.exists).length;
const importantTotal = checks.important.length;

const criticalScore = criticalTotal > 0 ? (criticalPassed / criticalTotal) * 100 : 100;
const importantScore = importantTotal > 0 ? (importantPassed / importantTotal) * 100 : 100;

let overallStatus = '✅ ГОТОВ';
let overallScore = (criticalScore * 0.7 + importantScore * 0.3);

if (criticalPassed < criticalTotal) {
  overallStatus = '❌ НЕ ГОТОВ';
  overallScore = 0;
} else if (importantPassed < importantTotal * 0.8) {
  overallStatus = '⚠️  ЧАСТИЧНО ГОТОВ';
}

console.log(`Критичные компоненты: ${criticalPassed}/${criticalTotal} (${criticalScore.toFixed(1)}%)`);
console.log(`Важные компоненты: ${importantPassed}/${importantTotal} (${importantScore.toFixed(1)}%)`);
console.log(`\n${overallStatus}`);
console.log(`Общая готовность: ${overallScore.toFixed(1)}%\n`);

if (criticalPassed < criticalTotal) {
  console.log('⚠️  ВНИМАНИЕ: Отсутствуют критичные компоненты!');
  console.log('   Система не может работать без них.\n');
  process.exit(1);
} else if (importantPassed < importantTotal * 0.8) {
  console.log('⚠️  ВНИМАНИЕ: Многие важные компоненты отсутствуют.');
  console.log('   Система может работать, но с ограничениями.\n');
  process.exit(0);
} else {
  console.log('✅ Все критичные и важные компоненты на месте!');
  console.log('   MONSTER 8.0 готов к использованию.\n');
  process.exit(0);
}

