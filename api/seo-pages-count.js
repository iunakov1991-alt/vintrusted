/**
 * API endpoint для подсчета SEO страниц на production
 * GET /api/seo-pages-count
 * 
 * Возвращает:
 * {
 *   total: number,
 *   en: number,
 *   es: number
 * }
 */

const fs = require('fs');
const path = require('path');

function countHTMLFiles(dir) {
  let count = 0;
  
  try {
    if (!fs.existsSync(dir)) {
      return 0;
    }
    
    function walk(d) {
      try {
        const entries = fs.readdirSync(d, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(d, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else if (entry.isFile() && entry.name === 'index.html') {
            count++;
          }
        }
      } catch (err) {
        // Игнорируем ошибки доступа
      }
    }
    
    walk(dir);
  } catch (err) {
    // Игнорируем ошибки
  }
  
  return count;
}

module.exports = (req, res) => {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const semanticDir = path.join(publicDir, 'semantic-pages');
    
    let totalPages = 0;
    let enCount = 0;
    let esCount = 0;
    
    if (fs.existsSync(semanticDir)) {
      const enDir = path.join(semanticDir, 'en');
      const esDir = path.join(semanticDir, 'es');
      
      if (fs.existsSync(enDir)) {
        enCount = countHTMLFiles(enDir);
      }
      if (fs.existsSync(esDir)) {
        esCount = countHTMLFiles(esDir);
      }
      
      totalPages = enCount + esCount;
    }
    
    // Кэшируем на 5 минут
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Content-Type', 'application/json');
    
    res.status(200).json({
      total: totalPages,
      en: enCount,
      es: esCount,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to count pages',
      message: err.message
    });
  }
};










