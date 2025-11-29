const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  try {
    // Извлекаем имя файла из пути
    // В Vercel rewrite: /seo/sitemaps/:file*.xml
    // Параметр :file* доступен через req.query.file
    let fileName = 'sitemap-seo.xml';
    
    // Приоритет 1: query параметр file (из rewrite pattern)
    if (req.query && req.query.file) {
      // Если file содержит путь, берем только имя файла
      const fileParam = req.query.file;
      if (fileParam.includes('/')) {
        fileName = fileParam.split('/').pop();
      } else {
        fileName = fileParam;
      }
    }
    // Приоритет 2: извлекаем из req.url
    else if (req.url) {
      // Извлекаем последнюю часть пути (имя файла)
      // Например: /seo/sitemaps/sitemap-en-1.xml -> sitemap-en-1.xml
      const parts = req.url.split('/').filter(Boolean);
      if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        if (lastPart.endsWith('.xml')) {
          fileName = lastPart;
        }
      }
    }
    
    // Убеждаемся, что fileName заканчивается на .xml
    if (!fileName.endsWith('.xml')) {
      fileName = fileName + '.xml';
    }
    
    // Путь к файлу в public/seo/sitemaps/
    const sitemapPath = path.join(process.cwd(), 'public/seo/sitemaps', fileName);
    
    // Логирование для отладки (только в development)
    if (process.env.VERCEL_ENV !== 'production') {
      console.log('Sitemap request:', {
        url: req.url,
        query: req.query,
        fileName,
        path: sitemapPath,
        exists: fs.existsSync(sitemapPath)
      });
    }
    
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

