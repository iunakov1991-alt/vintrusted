const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  try {
    // Извлекаем имя файла из пути
    // В Vercel rewrite: /seo/sitemaps/:file*.xml -> req.url содержит полный путь
    // Например: /seo/sitemaps/sitemap-en-1.xml
    let fileName = 'sitemap-seo.xml';
    
    if (req.url) {
      // Извлекаем последнюю часть пути (имя файла)
      const parts = req.url.split('/').filter(Boolean);
      if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        if (lastPart.endsWith('.xml')) {
          fileName = lastPart;
        }
      }
    }
    
    // Также проверяем query параметр file, если он есть
    if (req.query && req.query.file) {
      fileName = req.query.file;
    }
    
    // Путь к файлу в public/seo/sitemaps/
    const sitemapPath = path.join(process.cwd(), 'public/seo/sitemaps', fileName);
    
    if (fs.existsSync(sitemapPath)) {
      const content = fs.readFileSync(sitemapPath, 'utf8');
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(200).send(content);
    }
    
    // Если файл не существует, возвращаем 404 с валидным XML
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    const emptySitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;
    return res.status(200).send(emptySitemap);
    
  } catch (error) {
    console.error('Error serving sitemap:', error);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    const errorSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;
    return res.status(200).send(errorSitemap);
  }
};

