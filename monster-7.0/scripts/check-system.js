#!/usr/bin/env node

/**
 * MONSTER 7.0 — ПРОВЕРКА СИСТЕМЫ
 * 
 * Проверяет готовность системы к работе.
 */

const fs = require('fs');
const path = require('path');

const checks = {
  config: false,
  directories: false,
  dependencies: false,
  knowledgeBase: false,
  ollama: false
};

console.log('🔍 MONSTER 7.0 — Проверка системы\n');

// Проверка конфигурации
console.log('1. Проверка конфигурации...');
const configPath = path.join(process.cwd(), 'config/monster.config.json');
if (fs.existsSync(configPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('   ✅ Конфигурация найдена');
    console.log(`   📋 Версия: ${config.version}`);
    console.log(`   💾 Память: ${config.m1Limits?.maxMemory || 6144}MB`);
    checks.config = true;
  } catch (error) {
    console.log('   ❌ Ошибка чтения конфигурации:', error.message);
  }
} else {
  console.log('   ❌ Конфигурация не найдена');
}

// Проверка директорий
console.log('\n2. Проверка директорий...');
const requiredDirs = [
  'monster-7.0/core',
  'monster-7.0/core/modules',
  'monster-7.0/core/dashboard',
  'data/knowledge',
  'data/strategies',
  'data/performance',
  'data/feedback',
  'data/reports',
  'data/logs',
  'public/seo-pages'
];

let dirsOk = true;
requiredDirs.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (fs.existsSync(dirPath)) {
    console.log(`   ✅ ${dir}`);
  } else {
    console.log(`   ⚠️  ${dir} (будет создана автоматически)`);
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`   ✅ ${dir} создана`);
    } catch (error) {
      console.log(`   ❌ Ошибка создания ${dir}:`, error.message);
      dirsOk = false;
    }
  }
});
checks.directories = dirsOk;

// Проверка зависимостей
console.log('\n3. Проверка зависимостей...');
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packageJsonPath)) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const required = ['express', 'socket.io', 'cors'];
    const missing = required.filter(dep => !packageJson.dependencies?.[dep]);
    
    if (missing.length === 0) {
      console.log('   ✅ Все зависимости установлены');
      checks.dependencies = true;
    } else {
      console.log('   ⚠️  Отсутствуют зависимости:', missing.join(', '));
      console.log('   💡 Запустите: npm install');
    }
  } catch (error) {
    console.log('   ❌ Ошибка чтения package.json:', error.message);
  }
} else {
  console.log('   ❌ package.json не найден');
}

// Проверка базы знаний
console.log('\n4. Проверка базы знаний...');
const knowledgePath = path.join(process.cwd(), 'data/knowledge/knowledge-base.jsonl');
if (fs.existsSync(knowledgePath)) {
  try {
    const lines = fs.readFileSync(knowledgePath, 'utf8')
      .split('\n')
      .filter(Boolean);
    console.log(`   ✅ База знаний найдена (${lines.length} записей)`);
    checks.knowledgeBase = true;
  } catch (error) {
    console.log('   ⚠️  База знаний пуста или повреждена');
  }
} else {
  console.log('   ⚠️  База знаний не инициализирована');
  console.log('   💡 Запустите: POST /api/init-knowledge');
}

// Проверка Ollama (опционально)
console.log('\n5. Проверка Ollama (опционально)...');
const { execSync } = require('child_process');
try {
  const ollamaVersion = execSync('ollama --version', { encoding: 'utf8', stdio: 'pipe' });
  console.log('   ✅ Ollama установлен');
  console.log(`   📋 ${ollamaVersion.trim()}`);
  
  // Проверка модели
  try {
    const models = execSync('ollama list', { encoding: 'utf8', stdio: 'pipe' });
    if (models.includes('phi3')) {
      console.log('   ✅ Модель phi3 найдена');
      checks.ollama = true;
    } else {
      console.log('   ⚠️  Модель phi3 не найдена');
      console.log('   💡 Запустите: ollama pull phi3');
    }
  } catch (error) {
    console.log('   ⚠️  Не удалось проверить модели');
  }
} catch (error) {
  console.log('   ⚠️  Ollama не установлен (опционально)');
  console.log('   💡 Для локального AI: brew install ollama');
}

// Итоговый отчет
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 ИТОГОВЫЙ ОТЧЕТ\n');

const allChecks = Object.values(checks);
const passed = allChecks.filter(c => c).length;
const total = allChecks.length;

console.log(`Пройдено проверок: ${passed}/${total}\n`);

if (checks.config && checks.directories && checks.dependencies) {
  console.log('✅ Система готова к запуску!');
  console.log('\n🚀 Запуск:');
  console.log('   npm run monster:start');
  console.log('\n🌐 Откройте:');
  console.log('   http://localhost:3000/monster-ui');
} else {
  console.log('⚠️  Требуется дополнительная настройка');
  if (!checks.config) console.log('   - Создайте config/monster.config.json');
  if (!checks.directories) console.log('   - Создайте необходимые директории');
  if (!checks.dependencies) console.log('   - Установите зависимости: npm install');
}

if (!checks.knowledgeBase) {
  console.log('\n💡 После запуска инициализируйте базу знаний:');
  console.log('   POST http://localhost:3000/api/init-knowledge');
}

console.log('\n');

