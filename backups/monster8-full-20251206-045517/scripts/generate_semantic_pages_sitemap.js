// generate_semantic_pages_sitemap.js
// Генерация sitemap для semantic-pages (MONSTER 8.0)

const fs = require('fs');
const path = require('path');
const { SitemapEngine } = require('./seo/sitemap/sitemap-engine');

const ROOT = path.resolve(__dirname, '..');
const SEMANTIC_PAGES_DIR = path.join(ROOT, 'public', 'semantic-pages');
const SITEMAP_DIR = path.join(ROOT, 'public', 'seo', 'sitemaps');

function log(msg) {
  const now = new Date().toISOString();
  console.log(`[SEMANTIC-SITEMAP] ${now} - ${msg}`);
}

/**
 * Сканирует semantic-pages и собирает все страницы
 */
function scanSemanticPages() {
  const pages = [];
  
  if (!fs.existsSync(SEMANTIC_PAGES_DIR)) {
    log('Директория semantic-pages не существует');
    return pages;
  }
  
  function walkDir(dir, baseUrl = '', lang = 'en') {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Определяем язык по первой директории
        const newLang = entry.name === 'en' || entry.name === 'es' ? entry.name : lang;
        const newBaseUrl = entry.name === 'en' || entry.name === 'es' 
          ? '' 
          : `${baseUrl}/${entry.name}`;
        walkDir(fullPath, newBaseUrl, newLang);
      } else if (entry.name === 'index.html') {
        // Нашли страницу
        const url = baseUrl ? `/${lang}${baseUrl}/` : `/${lang}/`;
        const filePath = fullPath;
        
        // Проверяем размер файла (качество)
        const stats = fs.statSync(filePath);
        const fileSize = stats.size;
        const qualityScore = Math.min(1.0, 0.5 + (fileSize / 50000)); // Базовый score на основе размера
        
        pages.push({
          url,
          lang,
          filePath,
          qualityScore,
          lastmod: stats.mtime.toISOString().split('T')[0]
        });
      }
    }
  }
  
  walkDir(SEMANTIC_PAGES_DIR);
  return pages;
}

/**
 * Основная функция
 */
function main() {
  log('Начало генерации sitemap для semantic-pages');
  
  // Сканируем страницы
  const pages = scanSemanticPages();
  log(`Найдено страниц: ${pages.length}`);
  
  if (pages.length === 0) {
    log('Нет страниц для генерации sitemap');
    return;
  }
  
  // Создаем SitemapEngine
  const config = {
    sitemapRoot: SITEMAP_DIR
  };
  
  const sitemapEngine = new SitemapEngine(config);
  
  // Генерируем sitemap
  sitemapEngine.writeSitemaps(pages, config);
  
  log(`Sitemap успешно сгенерирован для ${pages.length} страниц`);
  
  // Статистика по языкам
  const byLang = {};
  pages.forEach(p => {
    if (!byLang[p.lang]) byLang[p.lang] = 0;
    byLang[p.lang]++;
  });
  
  log('Статистика по языкам:');
  Object.keys(byLang).forEach(lang => {
    log(`  ${lang}: ${byLang[lang]} страниц`);
  });
}

if (require.main === module) {
  main();
}

module.exports = { main, scanSemanticPages };
