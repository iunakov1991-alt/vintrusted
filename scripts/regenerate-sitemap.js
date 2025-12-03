#!/usr/bin/env node

/**
 * Скрипт для регенерации sitemap на основе существующих страниц
 * Исправляет проблему с "undefined" в URL
 */

const fs = require('fs');
const path = require('path');
const { SitemapEngine } = require('./seo/sitemap/sitemap-engine');
const { StaticArchitecture } = require('./seo/platform/static-architecture');

// Загрузка конфигурации
const configPath = path.join(process.cwd(), 'data/seo/config.json');
const config = fs.existsSync(configPath) 
  ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
  : {
      targetPagesPerBuild: 1000,
      minQualityScore: 0.70,
      languages: ['en', 'es']
    };

/**
 * Сканирование существующих страниц
 */
function scanExistingPages() {
  const pages = [];
  const vinDir = path.join(process.cwd(), 'public', 'vin');
  const seoPagesDir = path.join(process.cwd(), 'public', 'seo-pages');
  
  // Сканируем VIN страницы
  if (fs.existsSync(vinDir)) {
    const scanVinDir = (dir, baseUrl = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          scanVinDir(fullPath, `${baseUrl}/${entry.name}`);
        } else if (entry.name === 'index.html') {
          // Извлекаем VIN и state из пути
          const match = baseUrl.match(/\/vin\/([^\/]+)\/([^\/]+)/);
          if (match) {
            const vin = match[1];
            const stateSlug = match[2];
            
            // Пропускаем страницы с "undefined" или "state" (fallback)
            if (stateSlug === 'undefined' || stateSlug === 'state') {
              console.log(`⚠️  Skipping page with invalid state: ${baseUrl}`);
              continue;
            }
            
            const url = `/vin/${vin}/${stateSlug}/`;
            pages.push({
              url,
              lang: 'en', // По умолчанию EN, можно улучшить
              stateSlug,
              vin,
              qualityScore: 0.8 // Дефолтный score
            });
          }
        }
      }
    };
    
    scanVinDir(vinDir, '/vin');
  }
  
  // Сканируем SEO страницы
  if (fs.existsSync(seoPagesDir)) {
    const entries = fs.readdirSync(seoPagesDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const indexPath = path.join(seoPagesDir, entry.name, 'index.html');
        if (fs.existsSync(indexPath)) {
          const url = `/seo-pages/${entry.name}/`;
          pages.push({
            url,
            lang: 'en', // По умолчанию EN
            qualityScore: 0.8 // Дефолтный score
          });
        }
      }
    }
  }
  
  return pages;
}

/**
 * Основная функция
 */
async function main() {
  console.log('🔄 Регенерация sitemap...\n');
  
  // Сканируем существующие страницы
  console.log('📂 Сканирование существующих страниц...');
  const pages = scanExistingPages();
  console.log(`✅ Найдено ${pages.length} страниц\n`);
  
    // Фильтруем страницы с некорректными URL
    const validPages = pages.filter(p => {
      if (!p.url || p.url.includes('/undefined/') || p.url.includes('undefined')) {
        console.log(`⚠️  Фильтруем страницу с некорректным URL: ${p.url}`);
        return false;
      }
      // Для VIN страниц проверяем stateSlug, для SEO страниц - нет
      if (p.url.includes('/vin/')) {
        if (p.stateSlug === 'undefined' || p.stateSlug === undefined || p.stateSlug === null || p.stateSlug === 'state') {
          console.log(`⚠️  Фильтруем VIN страницу с некорректным stateSlug: ${p.url}`);
          return false;
        }
      }
      return true;
    });
  
  console.log(`✅ Валидных страниц: ${validPages.length}\n`);
  
  if (validPages.length === 0) {
    console.log('❌ Нет валидных страниц для генерации sitemap');
    process.exit(1);
  }
  
  // Генерируем sitemap
  console.log('📝 Генерация sitemap...');
  const sitemapEngine = new SitemapEngine(config);
  sitemapEngine.writeSitemaps(validPages, config);
  
  console.log(`\n✅ Sitemap успешно регенерирован!`);
  console.log(`   Всего страниц в sitemap: ${validPages.length}`);
  
  // Проверяем результат
  const sitemapDir = path.join(process.cwd(), 'public', 'seo', 'sitemaps');
  const sitemapFiles = fs.existsSync(sitemapDir) 
    ? fs.readdirSync(sitemapDir).filter(f => f.endsWith('.xml'))
    : [];
  
  console.log(`\n📊 Сгенерированные файлы:`);
  sitemapFiles.forEach(file => {
    const filePath = path.join(sitemapDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const urlCount = (content.match(/<url>/g) || []).length;
    console.log(`   - ${file}: ${urlCount} URLs`);
  });
  
  // Проверяем на наличие "undefined" в sitemap
  console.log(`\n🔍 Проверка на наличие "undefined" в sitemap...`);
  let hasUndefined = false;
  sitemapFiles.forEach(file => {
    const filePath = path.join(sitemapDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('/undefined/') || content.includes('undefined')) {
      console.log(`   ⚠️  Найдено "undefined" в ${file}`);
      hasUndefined = true;
    }
  });
  
  if (!hasUndefined) {
    console.log(`   ✅ "undefined" не найдено в sitemap файлах`);
  }
}

main().catch(err => {
  console.error('❌ Ошибка:', err);
  process.exit(1);
});

