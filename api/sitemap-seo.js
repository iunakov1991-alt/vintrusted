const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  try {
    // Пытаемся прочитать файл из public/seo/sitemaps/sitemap-seo.xml
    const sitemapPath = path.join(process.cwd(), 'public/seo/sitemaps/sitemap-seo.xml');
    
    if (fs.existsSync(sitemapPath)) {
      const content = fs.readFileSync(sitemapPath, 'utf8');
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(200).send(content);
    }
    
    // Если файл не существует, создаем минимальный sitemap
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</sitemapindex>`;
    
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(fallbackSitemap);
    
  } catch (error) {
    console.error('Error serving sitemap:', error);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    const errorSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</sitemapindex>`;
    return res.status(200).send(errorSitemap);
  }
};

