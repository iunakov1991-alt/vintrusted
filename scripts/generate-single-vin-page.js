#!/usr/bin/env node

/**
 * Генерация одной VIN страницы для тестирования скорости и качества
 * Использует оптимизированный пайплайн SEO Monster 6.0
 */

const fs = require('fs');
const path = require('path');

// Временно изменяем конфиг для генерации только 1 страницы
const configPath = path.join(process.cwd(), 'data/seo/config.json');
const originalConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Сохраняем оригинальный конфиг
const backupConfig = JSON.parse(JSON.stringify(originalConfig));

// Устанавливаем генерацию только 1 страницы
originalConfig.targetPagesPerBuild = 1;
originalConfig.enableAI = true;

// Сохраняем временный конфиг
fs.writeFileSync(configPath, JSON.stringify(originalConfig, null, 2));

console.log('🚀 Запуск генерации одной VIN страницы...\n');
console.log('📊 Конфигурация:');
console.log(`   Target pages: ${originalConfig.targetPagesPerBuild}`);
console.log(`   M1 Optimization: ${originalConfig.features.m1Optimization}`);
console.log(`   Local AI: ${originalConfig.features.localAI}`);
console.log(`   AI Providers: ${originalConfig.aiProviders.join(', ')}\n`);

const startTime = Date.now();

// Запускаем основной билд
const { spawn } = require('child_process');
const buildProcess = spawn('node', ['--expose-gc', 'scripts/seo/seo-master-build.js'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: {
    ...process.env,
    USE_LOCAL_AI: '1',
    LOCAL_AI_MODEL: 'phi3',
    SEO_BUILD_CONCURRENCY: '1'
  }
});

buildProcess.on('close', (code) => {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Восстанавливаем оригинальный конфиг
  fs.writeFileSync(configPath, JSON.stringify(backupConfig, null, 2));
  
  if (code === 0) {
    console.log(`\n✅ Генерация завершена за ${duration} секунд\n`);
    
    // Ищем сгенерированную страницу
    const vinDir = path.join(process.cwd(), 'public/vin');
    if (fs.existsSync(vinDir)) {
      const findLatestPage = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const indexPath = path.join(fullPath, 'index.html');
            if (fs.existsSync(indexPath)) {
              const stats = fs.statSync(indexPath);
              return { path: fullPath, mtime: stats.mtime };
            }
            const found = findLatestPage(fullPath);
            if (found) return found;
          }
        }
        return null;
      };
      
      const latestPage = findLatestPage(vinDir);
      if (latestPage) {
        const relativePath = path.relative(process.cwd(), latestPage.path);
        const url = relativePath.replace(/\\/g, '/').replace('public/', '/');
        console.log('📄 Сгенерированная страница:');
        console.log(`   Путь: ${relativePath}/index.html`);
        console.log(`   URL: ${url}`);
        console.log(`   Время создания: ${latestPage.mtime.toISOString()}\n`);
      }
    }
  } else {
    console.error(`\n❌ Генерация завершилась с ошибкой (код: ${code})`);
    process.exit(code);
  }
});

buildProcess.on('error', (error) => {
  // Восстанавливаем оригинальный конфиг
  fs.writeFileSync(configPath, JSON.stringify(backupConfig, null, 2));
  console.error('❌ Ошибка запуска:', error);
  process.exit(1);
});











