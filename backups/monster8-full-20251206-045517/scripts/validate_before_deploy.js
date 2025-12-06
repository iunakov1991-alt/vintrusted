#!/usr/bin/env node
/**
 * Валидация страниц перед деплоем
 * Проверяет наличие всех файлов и предотвращает массовые 404
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SEMANTIC_PAGES_DIR = path.join(ROOT_DIR, 'public', 'semantic-pages');

function findIndexHtmlFiles(dir, lang = '') {
  const files = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  function walk(currentPath, relativePath = '') {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      
      if (entry.isDirectory()) {
        walk(fullPath, relPath);
      } else if (entry.name === 'index.html') {
        // Извлекаем путь для URL
        const urlPath = relPath.replace('/index.html', '');
        files.push({
          filePath: fullPath,
          urlPath: lang ? `/${lang}/${urlPath}` : `/${urlPath}`,
          lang: lang || 'unknown'
        });
      }
    }
  }
  
  walk(dir);
  return files;
}

function validateHtmlFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Базовые проверки
    if (!content || content.trim().length === 0) {
      return { valid: false, error: 'Empty file' };
    }
    
    if (content.length < 100) {
      return { valid: false, error: 'File too short (likely incomplete)' };
    }
    
    // Проверка на наличие основных HTML элементов
    if (!content.includes('<!DOCTYPE') && !content.includes('<html')) {
      return { valid: false, error: 'Not a valid HTML file' };
    }
    
    // Проверка на наличие title
    if (!content.includes('<title>') && !content.includes('<h1')) {
      return { valid: false, error: 'Missing title or h1' };
    }
    
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

function main() {
  console.log('[VALIDATE] Starting validation before deploy...\n');
  
  const enDir = path.join(SEMANTIC_PAGES_DIR, 'en');
  const esDir = path.join(SEMANTIC_PAGES_DIR, 'es');
  
  const enFiles = findIndexHtmlFiles(enDir, 'en');
  const esFiles = findIndexHtmlFiles(esDir, 'es');
  
  const allFiles = [...enFiles, ...esFiles];
  
  console.log(`[VALIDATE] Found ${enFiles.length} EN pages and ${esFiles.length} ES pages`);
  console.log(`[VALIDATE] Total: ${allFiles.length} pages\n`);
  
  if (allFiles.length === 0) {
    console.error('[VALIDATE] ❌ ERROR: No pages found!');
    console.error('[VALIDATE] Cannot deploy without pages.');
    process.exit(1);
  }
  
  const errors = [];
  const warnings = [];
  
  // Валидация каждого файла
  for (const file of allFiles) {
    const validation = validateHtmlFile(file.filePath);
    
    if (!validation.valid) {
      errors.push({
        url: file.urlPath,
        file: file.filePath,
        error: validation.error
      });
    } else {
      // Проверка размера файла (предупреждение)
      const stats = fs.statSync(file.filePath);
      if (stats.size < 2000) {
        warnings.push({
          url: file.urlPath,
          file: file.filePath,
          warning: 'File is very small (< 2KB), might be incomplete'
        });
      }
    }
  }
  
  // Отчет
  console.log('[VALIDATE] Validation results:');
  console.log(`  ✅ Valid: ${allFiles.length - errors.length - warnings.length}`);
  console.log(`  ⚠️  Warnings: ${warnings.length}`);
  console.log(`  ❌ Errors: ${errors.length}\n`);
  
  if (warnings.length > 0) {
    console.log('[VALIDATE] Warnings:');
    warnings.slice(0, 10).forEach(w => {
      console.log(`  ⚠️  ${w.url}: ${w.warning}`);
    });
    if (warnings.length > 10) {
      console.log(`  ... and ${warnings.length - 10} more warnings`);
    }
    console.log('');
  }
  
  if (errors.length > 0) {
    console.error('[VALIDATE] ❌ ERRORS FOUND:');
    errors.forEach(e => {
      console.error(`  ❌ ${e.url}: ${e.error}`);
      console.error(`     File: ${e.file}`);
    });
    console.error('\n[VALIDATE] ❌ DEPLOYMENT BLOCKED: Fix errors before deploying');
    process.exit(1);
  }
  
  // Проверка на минимальное количество страниц
  const minPages = parseInt(process.env.MIN_PAGES_FOR_DEPLOY || '1', 10);
  if (allFiles.length < minPages) {
    console.error(`[VALIDATE] ❌ ERROR: Only ${allFiles.length} pages found, minimum required: ${minPages}`);
    process.exit(1);
  }
  
  // Генерация списка URL для проверки
  const urlsFile = path.join(ROOT_DIR, 'tmp', 'deploy-urls.json');
  const urls = {
    en: enFiles.map(f => f.urlPath),
    es: esFiles.map(f => f.urlPath),
    total: allFiles.length,
    timestamp: Date.now()
  };
  
  fs.mkdirSync(path.dirname(urlsFile), { recursive: true });
  fs.writeFileSync(urlsFile, JSON.stringify(urls, null, 2));
  
  console.log(`[VALIDATE] ✅ All pages are valid!`);
  console.log(`[VALIDATE] ✅ Ready for deployment`);
  console.log(`[VALIDATE] ✅ URLs list saved to: ${urlsFile}\n`);
  
  // Статистика
  console.log('[VALIDATE] Statistics:');
  console.log(`  EN pages: ${enFiles.length}`);
  console.log(`  ES pages: ${esFiles.length}`);
  console.log(`  Total: ${allFiles.length}`);
  
  process.exit(0);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error('[VALIDATE] Fatal error:', err.message);
    process.exit(1);
  }
}

module.exports = { validateHtmlFile, findIndexHtmlFiles };

